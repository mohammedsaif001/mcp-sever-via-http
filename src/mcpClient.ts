import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const DEEPWIKI_MCP_URL = process.env.DEEPWIKI_MCP_URL ?? "https://mcp.deepwiki.com/mcp";

// One shared connection for the whole app, created on first use.
let clientPromise: Promise<Client> | null = null;

export function getMcpClient(): Promise<Client> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const client = new Client({ name: "mcp-connect-via-http", version: "1.0.0" });
      client.onclose = () => {
        clientPromise = null; // reconnect on the next request
      };
      await client.connect(new StreamableHTTPClientTransport(new URL(DEEPWIKI_MCP_URL)));
      return client;
    })().catch((err) => {
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}

export async function listTools() {
  const client = await getMcpClient();
  const { tools } = await client.listTools();
  return tools;
}

/** Calls an MCP tool and joins its text content into a single string. */
export async function callTool(name: string, args: Record<string, unknown>) {
  const client = await getMcpClient();
  const result = await client.callTool({ name, arguments: args }, undefined, { timeout: 120_000 });

  const content = Array.isArray(result.content) ? result.content : [];
  const text = content
    .filter((c): c is { type: "text"; text: string } => c?.type === "text")
    .map((c) => c.text)
    .join("\n");

  return { isError: result.isError === true, text };
}

export async function closeMcpClient() {
  if (clientPromise) {
    const client = await clientPromise.catch(() => null);
    await client?.close();
    clientPromise = null;
  }
}
