import type { GitHubRepo } from "../models/github.model.js";
import { GitHubError } from "../utils/errors.js";

const MAX_PAGES = 5; // 500 repos is plenty for a PoC

/**
 * Lists a user's public repos via GitHub's public REST API.
 * Unauthenticated requests are limited to 60/hour per IP; each page is one request.
 */
export async function listPublicRepos(username: string): Promise<GitHubRepo[]> {
  const repos: GitHubRepo[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&page=${page}&sort=updated`,
      { headers: { Accept: "application/vnd.github+json", "User-Agent": "mcp-connect-via-http" } },
    );

    if (res.status === 404) throw new GitHubError(404, `GitHub user "${username}" not found`);
    if (!res.ok) throw new GitHubError(502, `GitHub API responded with ${res.status}: ${await res.text()}`);

    const data = (await res.json()) as { full_name: string; fork: boolean; html_url: string }[];
    repos.push(...data.map((r) => ({ fullName: r.full_name, fork: r.fork, url: r.html_url })));
    if (data.length < 100) break;
  }

  return repos;
}
