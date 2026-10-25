import { randomUUID } from "node:crypto";
import { Agent, MCPServerStreamableHttp, MemorySession, run } from "@openai/agents";
import { env } from "../config/env.js";
import { d365Client } from "../lib/mcpClient.js";
import type { ChatContext, D365ToolCall } from "../models/d365.model.js";
import { isUnauthorized } from "../utils/errors.js";
import { parseJson } from "../utils/json.js";

const MAX_SESSIONS = 100;
const sessions = new Map<string, MemorySession>();

let agentPromise: Promise<{ agent: Agent<ChatContext>; mcpServer: MCPServerStreamableHttp }> | null = null;

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

function getAgent() {
  if (!agentPromise) {
    agentPromise = (async () => {
      const mcpServer = new MCPServerStreamableHttp({
        name: "d365-commerce",
        url: env.D365_MCP_URL!,
        cacheToolsList: true,
        // Tell the model why a tool failed so it can explain instead of the whole run erroring.
        errorFunction: ({ error }) =>
          isUnauthorized(error)
            ? "This tool needs a signed-in D365 customer and cannot be used anonymously. Tell the user it is unavailable without sign-in."
            : `Tool failed: ${error instanceof Error ? error.message : String(error)}`,
      });
      await mcpServer.connect();
      const agent = new Agent<ChatContext>({
        name: "D365 Commerce assistant",
        instructions: (ctx) => buildInstructions(ctx.context.channelId),
        mcpServers: [mcpServer],
        ...(env.OPENAI_MODEL ? { model: env.OPENAI_MODEL } : {}),
      });
      return { agent, mcpServer };
    })().catch((err) => {
      agentPromise = null;
      throw err;
    });
  }
  return agentPromise;
}

function getSession(sessionId: string) {
  let session = sessions.get(sessionId);
  if (!session) {
    if (sessions.size >= MAX_SESSIONS) sessions.delete(sessions.keys().next().value!);
    session = new MemorySession({ sessionId });
    sessions.set(sessionId, session);
  }
  return session;
}

export type D365ToolResult =
  | { error: "not_found"; available: string[] }
  | { error: "missing_args"; missing: string[]; inputSchema: unknown }
  | { error: null; args: Record<string, unknown>; result: { isError: boolean; text: string } };

export class D365Service {
  static async listTools() {
    if (!d365Client) throw new Error("D365 client is not configured");
    const tools = await d365Client.listTools();
    return tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema }));
  }

  static async callTool(name: string, rawArgs: Record<string, unknown>): Promise<D365ToolResult> {
    if (!d365Client) throw new Error("D365 client is not configured");
    const tools = await d365Client.listTools();
    const tool = tools.find((t) => t.name === name);
    if (!tool) {
      return { error: "not_found", available: tools.map((t) => t.name) };
    }

    const args: Record<string, unknown> = { ...rawArgs };
    if (args.channelId === undefined && env.D365_CHANNEL_ID) {
      args.channelId = Number(env.D365_CHANNEL_ID);
    }

    const missing = (tool.inputSchema.required ?? []).filter((key) => args[key] === undefined);
    if (missing.length > 0) {
      return { error: "missing_args", missing, inputSchema: tool.inputSchema };
    }

    const result = await d365Client.callTool(name, args);
    return { error: null, args, result };
  }

  static async chat(message: string, inputSessionId?: string, inputChannelId?: number) {
    const sessionId = inputSessionId ?? randomUUID();
    const channelId = inputChannelId ?? (env.D365_CHANNEL_ID ? Number(env.D365_CHANNEL_ID) : undefined);

    const { agent } = await getAgent();
    const result = await run(agent, message, {
      session: getSession(sessionId),
      context: { channelId },
      maxTurns: 15,
    });

    const toolCalls: D365ToolCall[] = result.newItems.flatMap((item) =>
      item.type === "tool_call_item" && item.rawItem.type === "function_call"
        ? [{ name: item.rawItem.name, args: parseJson(item.rawItem.arguments) }]
        : [],
    );

    return {
      sessionId,
      reply: result.finalOutput,
      toolCalls,
    };
  }

  static deleteSession(sessionId: string): boolean {
    return sessions.delete(sessionId);
  }

  static async close() {
    const agentServer = agentPromise ? (await agentPromise.catch(() => null))?.mcpServer : undefined;
    await Promise.all([d365Client?.close(), agentServer?.close()]);
  }
}
