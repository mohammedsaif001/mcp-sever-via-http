import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

/** A lazily-connected, shared client for one remote MCP server. */
export class McpConnection {
  private clientPromise: Promise<Client> | null = null;

  constructor(
    private readonly name: string,
    private readonly url: string,
  ) {}

  private getClient(): Promise<Client> {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        const client = new Client({ name: `mcp-connect-via-http/${this.name}`, version: "1.0.0" });
        client.onclose = () => {
          this.clientPromise = null; // reconnect on the next request
        };
        await client.connect(new StreamableHTTPClientTransport(new URL(this.url)));
        return client;
      })().catch((err) => {
        this.clientPromise = null;
        throw err;
      });
    }
    return this.clientPromise;
  }

  async listTools() {
    const client = await this.getClient();
    const { tools } = await client.listTools();
    return tools;
  }

  /** Calls an MCP tool and joins its text content into a single string. */
  async callTool(name: string, args: Record<string, unknown>) {
    const client = await this.getClient();
    const result = await client.callTool({ name, arguments: args }, undefined, { timeout: 120_000 });

    const content = Array.isArray(result.content) ? result.content : [];
    const text = content
      .filter((c): c is { type: "text"; text: string } => c?.type === "text")
      .map((c) => c.text)
      .join("\n");

    return { isError: result.isError === true, text };
  }

  async close() {
    if (this.clientPromise) {
      const client = await this.clientPromise.catch(() => null);
      await client?.close();
      this.clientPromise = null;
    }
  }
}

export const deepwiki = new McpConnection("deepwiki", process.env.DEEPWIKI_MCP_URL ?? "https://mcp.deepwiki.com/mcp");
