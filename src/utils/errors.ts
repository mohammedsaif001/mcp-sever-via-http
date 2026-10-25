export class GitHubError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "GitHubError";
  }
}

/** Check if an MCP SDK error is an HTTP 401 unauthorized error */
export function isUnauthorized(err: unknown): boolean {
  for (let e = err; e; e = (e as { cause?: unknown }).cause) {
    if ((e as { code?: unknown }).code === 401) return true;
  }
  return false;
}

export function unauthorizedMessage(tool: string): string {
  return `D365 requires a signed-in customer for "${tool}" (HTTP 401). Anonymous access only covers products, availability and carts.`;
}
