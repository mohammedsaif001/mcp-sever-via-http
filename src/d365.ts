import { randomUUID } from "node:crypto";
import { Agent, MCPServerStreamableHttp, MemorySession, run } from "@openai/agents";
import { Router } from "express";
import { z } from "zod";
import { McpConnection } from "./mcpClient.js";

const D365_MCP_URL = process.env.D365_MCP_URL;
const D365_CHANNEL_ID = process.env.D365_CHANNEL_ID;
const OPENAI_MODEL = process.env.OPENAI_MODEL; // optional; the SDK's default model otherwise

const d365 = D365_MCP_URL ? new McpConnection("d365", D365_MCP_URL) : null;

export const d365Router = Router();

d365Router.use((_req, res, next) => {
  if (!d365) {
    res.status(503).json({ error: "D365 is not configured. Set D365_MCP_URL in .env (see .env.example)." });
    return;
  }
  next();
});

// Lists the D365 Commerce MCP tools with their input schemas.
d365Router.get("/tools", async (_req, res) => {
  const tools = await d365!.listTools();
  res.json({ tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
});

// Calls one D365 tool. The JSON body is the tool's arguments; channelId defaults to D365_CHANNEL_ID.
d365Router.post("/tools/:name", async (req, res) => {
  const { name } = req.params;
  const tools = await d365!.listTools();
  const tool = tools.find((t) => t.name === name);
  if (!tool) {
    res.status(404).json({ error: `Unknown D365 tool "${name}"`, available: tools.map((t) => t.name) });
    return;
  }

  const args: Record<string, unknown> = { ...(req.body ?? {}) };
  if (args.channelId === undefined && D365_CHANNEL_ID) args.channelId = Number(D365_CHANNEL_ID);

  // D365 gives vague errors for missing arguments, so check the tool's schema first.
  const missing = (tool.inputSchema.required ?? []).filter((key) => args[key] === undefined);
  if (missing.length > 0) {
    res.status(400).json({ error: `Missing required arguments: ${missing.join(", ")}`, inputSchema: tool.inputSchema });
    return;
  }

  const result = await d365!.callTool(name, args);
  if (result.isError) {
    res.status(502).json({ error: "D365 returned an error", details: result.text });
    return;
  }
  res.json({ tool: name, args, result: parseJson(result.text) });
});

// --- Chat: an OpenAI agent that picks and chains the D365 MCP tools itself ---

interface ChatContext {
  channelId?: number;
}

const chatBody = z.object({
  message: z.string().min(1).max(4000),
  sessionId: z.string().min(1).max(100).optional(),
  channelId: z.coerce.number().int().positive().optional(),
});

let agentPromise: Promise<{ agent: Agent<ChatContext>; mcpServer: MCPServerStreamableHttp }> | null = null;

function getAgent() {
  if (!agentPromise) {
    agentPromise = (async () => {
      const mcpServer = new MCPServerStreamableHttp({ name: "d365-commerce", url: D365_MCP_URL!, cacheToolsList: true });
      await mcpServer.connect();
      const agent = new Agent<ChatContext>({
        name: "D365 Commerce assistant",
        instructions: (ctx) => buildInstructions(ctx.context.channelId),
        mcpServers: [mcpServer],
        ...(OPENAI_MODEL ? { model: OPENAI_MODEL } : {}),
      });
      return { agent, mcpServer };
    })().catch((err) => {
      agentPromise = null;
      throw err;
    });
  }
  return agentPromise;
}

function buildInstructions(channelId: number | undefined) {
  return [
    "You are a helpful shopping assistant for a Dynamics 365 Commerce online store.",
    "Use the tools to search products, check stock, manage carts, set delivery and look up orders.",
    "Always get store data from the tools; never invent products, prices, IDs or stock levels.",
    channelId
      ? `Every tool needs channelId: always use ${channelId}.`
      : "Every tool needs channelId. If you don't know it, ask the user for it.",
    "Reuse IDs (product RecordId, cartId) from earlier tool results in this conversation instead of asking again.",
    "Before creating a payment link or changing a cart's address or delivery, confirm with the user.",
    "Keep answers short. List products with name, RecordId and price.",
  ].join("\n");
}

// In-memory conversation history, keyed by sessionId. Fine for a PoC; lost on restart.
const MAX_SESSIONS = 100;
const sessions = new Map<string, MemorySession>();

function getSession(sessionId: string) {
  let session = sessions.get(sessionId);
  if (!session) {
    if (sessions.size >= MAX_SESSIONS) sessions.delete(sessions.keys().next().value!);
    session = new MemorySession({ sessionId });
    sessions.set(sessionId, session);
  }
  return session;
}

// Natural-language chat: { message, sessionId? } -> { sessionId, reply, toolCalls }.
// Send the returned sessionId with the next message to continue the conversation.
d365Router.post("/chat", async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    res.status(503).json({ error: "OPENAI_API_KEY is not set. Add it to .env (see .env.example)." });
    return;
  }

  const parsed = chatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: z.flattenError(parsed.error).fieldErrors });
    return;
  }

  const sessionId = parsed.data.sessionId ?? randomUUID();
  const channelId = parsed.data.channelId ?? (D365_CHANNEL_ID ? Number(D365_CHANNEL_ID) : undefined);

  const { agent } = await getAgent();
  const result = await run(agent, parsed.data.message, {
    session: getSession(sessionId),
    context: { channelId },
    maxTurns: 15,
  });

  const toolCalls = result.newItems.flatMap((item) =>
    item.type === "tool_call_item" && item.rawItem.type === "function_call"
      ? [{ name: item.rawItem.name, args: parseJson(item.rawItem.arguments) }]
      : [],
  );

  res.json({ sessionId, reply: result.finalOutput, toolCalls });
});

// Forget a conversation.
d365Router.delete("/chat/:sessionId", (req, res) => {
  const deleted = sessions.delete(req.params.sessionId);
  res.status(deleted ? 204 : 404).end();
});

// D365 tools return JSON as text; hand it back as real JSON when it parses.
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function closeD365() {
  const agentServer = agentPromise ? (await agentPromise.catch(() => null))?.mcpServer : undefined;
  await Promise.all([d365?.close(), agentServer?.close()]);
}
