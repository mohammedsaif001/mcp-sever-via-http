/**
 * Safely parses a JSON string, returning the parsed object if valid,
 * or the original string if parsing fails.
 */
export function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
