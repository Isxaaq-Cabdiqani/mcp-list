/**
 * GitHub Enricher
 * Fetches repository metadata from GitHub API
 */

import type { MCPServer, GitHubEnrichment } from "../types.js";

const GITHUB_API_URL = "https://api.github.com";

interface GitHubRepoResponse {
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  subscribers_count: number;
  pushed_at: string;
  license?: { spdx_id: string };
  topics: string[];
  language: string | null;
  owner: { login: string; avatar_url: string };
  archived: boolean;
  default_branch: string;
}

/**
 * Parse GitHub repository URL to extract owner and repo name
 */
function parseGitHubUrl(
  url: string
): { owner: string; repo: string } | null {
  // Handle various GitHub URL formats
  const patterns = [
    /github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/|$)/,
    /github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
  }

  return null;
}

/**
 * Fetch GitHub repository data
 */
async function fetchRepoData(
  owner: string,
  repo: string
): Promise<GitHubRepoResponse | null> {
  const url = `${GITHUB_API_URL}/repos/${owner}/${repo}`;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "mcp-list/1.0.0 (https://github.com/sjnims/mcp-list)",
  };

  // Use GITHUB_TOKEN if available for higher rate limits
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(url, { headers });

  if (response.status === 404) {
    console.log(`[GitHub] Repository not found: ${owner}/${repo}`);
    return null;
  }

  if (response.status === 403) {
    const resetTime = response.headers.get("X-RateLimit-Reset");
    console.warn(
      `[GitHub] Rate limited. Reset at: ${resetTime ? new Date(parseInt(resetTime) * 1000).toISOString() : "unknown"}`
    );
    return null;
  }

  if (!response.ok) {
    console.warn(
      `[GitHub] API error for ${owner}/${repo}: ${response.status}`
    );
    return null;
  }

  return (await response.json()) as GitHubRepoResponse;
}

/**
 * Enrich server with GitHub repository data
 */
export async function enrichGitHub(
  server: MCPServer
): Promise<{ github: GitHubEnrichment } | null> {
  // Check if server has a GitHub repository
  const repoUrl = server.repository?.url;
  if (!repoUrl || !repoUrl.includes("github.com")) {
    return null;
  }

  const parsed = parseGitHubUrl(repoUrl);
  if (!parsed) {
    console.warn(`[GitHub] Could not parse URL: ${repoUrl}`);
    return null;
  }

  console.log(`[GitHub] Fetching: ${parsed.owner}/${parsed.repo}`);

  const data = await fetchRepoData(parsed.owner, parsed.repo);
  if (!data) {
    return null;
  }

  return {
    github: {
      stars: data.stargazers_count,
      forks: data.forks_count,
      openIssues: data.open_issues_count,
      watchers: data.subscribers_count,
      lastCommit: data.pushed_at,
      license: data.license?.spdx_id,
      topics: data.topics || [],
      language: data.language || undefined,
      owner: {
        login: data.owner.login,
        avatar: data.owner.avatar_url,
      },
      archived: data.archived,
      defaultBranch: data.default_branch,
    },
  };
}
