import "dotenv/config";

export const env = {
  PORT: Number(process.env.PORT ?? 3000),
  DEEPWIKI_MCP_URL: process.env.DEEPWIKI_MCP_URL ?? "https://mcp.deepwiki.com/mcp",
  D365_MCP_URL: process.env.D365_MCP_URL,
  D365_CHANNEL_ID: process.env.D365_CHANNEL_ID,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,
};
