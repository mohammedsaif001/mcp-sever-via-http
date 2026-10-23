import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { GitHubError, listPublicRepos } from "./github.js";
import { callTool, closeMcpClient, listTools } from "./mcpClient.js";

const app = express();
app.use(express.json());

// "owner/repo", e.g. "facebook/react"
const repoName = z.string().regex(/^[\w.-]+\/[\w.-]+$/, 'repo must look like "owner/repo"');

const chatBody = z.object({
  repo: repoName,
  question: z.string().min(1).max(2000),
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Lists the tools the DeepWiki MCP server exposes.
app.get("/tools", async (_req, res) => {
  const tools = await listTools();
  res.json({ tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
});

// Ask a question about a public GitHub repo; DeepWiki's ask_wiki_question tool answers it.
app.post("/chat", async (req, res) => {
  const parsed = chatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: z.flattenError(parsed.error).fieldErrors });
    return;
  }

  const { repo, question } = parsed.data;
  const result = await callTool("ask_wiki_question",{ repoName: repo, question });

  if (result.isError) {
    res.status(502).json({ error: "DeepWiki returned an error", details: result.text });
    return;
  }
  res.json({ repo, question, answer: result.text });
});

// Table of contents for a repo's DeepWiki docs.
app.get("/wiki/:owner/:repo/structure", async (req, res) => {
  const repo = `${req.params.owner}/${req.params.repo}`;
  const result = await callTool("read_wiki_structure", { repoName: repo });

  if (result.isError) {
    res.status(502).json({ error: "DeepWiki returned an error", details: result.text });
    return;
  }
  res.json({ repo, structure: result.text });
});

// Checks which of a GitHub user's public repos DeepWiki has already indexed.
app.get("/users/:username/indexed-repos", async (req, res) => {
  const { username } = req.params;
  const includeForks = req.query.includeForks === "true";

  const repos = (await listPublicRepos(username)).filter((r) => includeForks || !r.fork);

  const checks = await mapWithConcurrency(repos, 5, async (r) => {
    const result = await callTool("read_wiki_structure", { repoName: r.fullName }).catch((err: unknown) => ({
      isError: true,
      text: err instanceof Error ? err.message : String(err),
    }));

    if (!result.isError) return { ...r, status: "indexed" as const, deepwikiUrl: `https://deepwiki.com/${r.fullName}` };
    if (/not found/i.test(result.text)) {
      return { ...r, status: "not_indexed" as const, indexHere: `https://deepwiki.com/${r.fullName}` };
    }
    return { ...r, status: "error" as const, details: result.text };
  });

  res.json({
    username,
    total: checks.length,
    indexed: checks.filter((c) => c.status === "indexed"),
    notIndexed: checks.filter((c) => c.status === "not_indexed"),
    errors: checks.filter((c) => c.status === "error"),
  });
});

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof GitHubError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: err instanceof Error ? err.message : "Internal server error" });
});

const PORT = Number(process.env.PORT ?? 3000);
const server = app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});

const shutdown = async () => {
  server.close();
  await closeMcpClient();
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
