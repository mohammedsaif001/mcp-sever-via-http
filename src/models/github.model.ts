export interface GitHubRepo {
  fullName: string;
  fork: boolean;
  url: string;
}

export type IndexedRepoStatus = "indexed" | "not_indexed" | "error";

export interface RepoIndexCheckResult extends GitHubRepo {
  status: IndexedRepoStatus;
  deepwikiUrl?: string;
  indexHere?: string;
  details?: string;
}

export interface UserIndexedReposResponse {
  username: string;
  total: number;
  indexed: RepoIndexCheckResult[];
  notIndexed: RepoIndexCheckResult[];
  errors: RepoIndexCheckResult[];
}
