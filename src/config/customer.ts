import { env } from "./env.js";

/**
 * Auth header for D365 MCP requests, so tools run as the signed-in customer.
 * Commerce expects the "id_token" scheme for customer tokens; "Bearer" is rejected as InvalidUserToken.
 */
export const d365AuthHeaders: Record<string, string> = env.D365_CUSTOMER_TOKEN
  ? { Authorization: `id_token ${env.D365_CUSTOMER_TOKEN}` }
  : {};

/**
 * Default values for D365 tool arguments, keyed by the argument names the MCP tools use.
 * Applied only when the tool accepts that argument and the caller didn't pass it.
 */
export const customerToolDefaults: Record<string, string | undefined> = {
  customerAccountNumber: env.D365_CUSTOMER_ACCOUNT_NUMBER,
  customerEmail: env.D365_CUSTOMER_EMAIL,
  email: env.D365_CUSTOMER_EMAIL,
  receiptEmail: env.D365_CUSTOMER_EMAIL,
  customerName: env.D365_CUSTOMER_NAME,
  street: env.D365_CUSTOMER_STREET,
  city: env.D365_CUSTOMER_CITY,
  state: env.D365_CUSTOMER_STATE,
  zipCode: env.D365_CUSTOMER_ZIP,
  countryOrRegionCode: env.D365_CUSTOMER_COUNTRY,
};

/** Customer details as system-prompt lines, or [] when none are configured. */
export function customerInstructions(): string[] {
  const details = [
    ["Name", env.D365_CUSTOMER_NAME],
    ["Customer account number", env.D365_CUSTOMER_ACCOUNT_NUMBER],
    ["Email", env.D365_CUSTOMER_EMAIL],
    [
      "Default address",
      env.D365_CUSTOMER_STREET &&
        [env.D365_CUSTOMER_STREET, env.D365_CUSTOMER_CITY, env.D365_CUSTOMER_STATE, env.D365_CUSTOMER_ZIP, env.D365_CUSTOMER_COUNTRY]
          .filter(Boolean)
          .join(", "),
    ],
  ].filter(([, value]) => value);

  const lines: string[] = [];
  if (env.D365_CUSTOMER_TOKEN) {
    lines.push("The user is a signed-in customer, so order history and account tools are available.");
  }
  if (details.length > 0) {
    lines.push(
      "Signed-in customer details (use these for tool arguments such as customerAccountNumber, email and address; don't ask the user for them):",
      ...details.map(([label, value]) => `- ${label}: ${value}`),
      "Before using the default address on a cart, confirm it with the user.",
    );
  }
  return lines;
}
