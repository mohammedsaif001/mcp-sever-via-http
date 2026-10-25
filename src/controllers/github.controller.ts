import type { Request, Response } from "express";
import type { RepoIndexCheckResult } from "../models/github.model.js";
import { DeepwikiService } from "../services/deepwiki.service.js";
import { listPublicRepos } from "../services/github.service.js";
import { mapWithConcurrency } from "../utils/concurrency.js";

export async function getIndexedRepos(req: Request, res: Response) {
  const username = String(req.params.username);
  const includeForks = req.query.includeForks === "true";

  const repos = (await listPublicRepos(username)).filter((r) => includeForks || !r.fork);

  const checks = await mapWithConcurrency<typeof repos[number], RepoIndexCheckResult>(repos, 5, async (r) => {
    const result = await DeepwikiService.readStructure(r.fullName).catch((err: unknown) => ({
      isError: true,
      text: err instanceof Error ? err.message : String(err),
    }));

    if (!result.isError) {
      return { ...r, status: "indexed", deepwikiUrl: `https://deepwiki.com/${r.fullName}` };
    }
    if (/not found/i.test(result.text)) {
      return { ...r, status: "not_indexed", indexHere: `https://deepwiki.com/${r.fullName}` };
    }
    return { ...r, status: "error", details: result.text };
  });

  res.json({
    username,
    total: checks.length,
    indexed: checks.filter((c) => c.status === "indexed"),
    notIndexed: checks.filter((c) => c.status === "not_indexed"),
    errors: checks.filter((c) => c.status === "error"),
  });
}
