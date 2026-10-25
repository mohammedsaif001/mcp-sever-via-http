import "dotenv/config";

// Treat empty values (e.g. "D365_CUSTOMER_EMAIL=") as unset.
const optional = (name: string) => process.env[name] || undefined;

export const env = {
  PORT: Number(process.env.PORT ?? 3000),
  DEEPWIKI_MCP_URL: process.env.DEEPWIKI_MCP_URL ?? "https://mcp.deepwiki.com/mcp",
  D365_MCP_URL: process.env.D365_MCP_URL,
  D365_CHANNEL_ID: process.env.D365_CHANNEL_ID,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  OPENAI_MODEL: process.env.OPENAI_MODEL,

  // Signed-in D365 customer (single customer for the whole app; PoC only)
  D365_CUSTOMER_TOKEN: optional("D365_CUSTOMER_TOKEN"),
  D365_CUSTOMER_ACCOUNT_NUMBER: optional("D365_CUSTOMER_ACCOUNT_NUMBER"),
  D365_CUSTOMER_EMAIL: optional("D365_CUSTOMER_EMAIL"),
  D365_CUSTOMER_NAME: optional("D365_CUSTOMER_NAME"),
  D365_CUSTOMER_STREET: optional("D365_CUSTOMER_STREET"),
  D365_CUSTOMER_CITY: optional("D365_CUSTOMER_CITY"),
  D365_CUSTOMER_STATE: optional("D365_CUSTOMER_STATE"),
  D365_CUSTOMER_ZIP: optional("D365_CUSTOMER_ZIP"),
  D365_CUSTOMER_COUNTRY: optional("D365_CUSTOMER_COUNTRY"),
};
