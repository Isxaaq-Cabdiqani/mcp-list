/**
 * MCPB Enricher
 * Fetches release metadata from GitHub/GitLab for MCPB packages
 */

import type { MCPServer, McpbEnrichment } from "../types.js";

interface GitHubReleaseResponse {
  tag_name: string;
  published_at: string;
  prerelease: boolean;
  html_url: string;
  assets: Array<{
    name: string;
    size: number;
    download_count: number;
    browser_download_url: string;
  }>;
}

interface GitLabReleaseResponse {
  tag_name: string;
  released_at: string;
  _links: { self: string };
  assets: {
    links: Array<{
      name: string;
      url: string;
    }>;
  };
}

/**
 * Find MCPB package identifier from server packages
 */
function findMcpbPackage(server: MCPServer): string | null {
  const mcpbPackage = server.packages.find(
    (pkg) => pkg.registryType === "mcpb"
  );
  return mcpbPackage?.identifier || null;
}

/**
 * Parse MCPB identifier to determine source and extract info
 * MCPB identifiers are typically GitHub/GitLab release URLs
 */
function parseMcpbIdentifier(identifier: string): {
  source: "github" | "gitlab";
  owner: string;
  repo: string;
  tag?: string;
} | null {
  // GitHub release URL patterns
  const githubPatterns = [
    /github\.com\/([^/]+)\/([^/]+)\/releases\/(?:tag\/|download\/)?([^/]+)/,
    /github\.com\/([^/]+)\/([^/]+)/,
  ];

  for (const pattern of githubPatterns) {
    const match = identifier.match(pattern);
    if (match) {
      return {
        source: "github",
        owner: match[1],
        repo: match[2].replace(/\.git$/, ""),
        tag: match[3],
      };
    }
  }

  // GitLab release URL patterns
  const gitlabPatterns = [
    /gitlab\.com\/([^/]+)\/([^/]+)\/-\/releases\/([^/]+)/,
    /gitlab\.com\/([^/]+)\/([^/]+)/,
  ];

  for (const pattern of gitlabPatterns) {
    const match = identifier.match(pattern);
    if (match) {
      return {
        source: "gitlab",
        owner: match[1],
        repo: match[2].replace(/\.git$/, ""),
        tag: match[3],
      };
    }
  }

  return null;
}

/**
 * Detect platform from asset filename
 */
function detectPlatform(filename: string): string | null {
  const lower = filename.toLowerCase();

  // Architecture patterns
  const archPatterns: Record<string, string> = {
    "x86_64|x64|amd64": "x64",
    "arm64|aarch64": "arm64",
    "i386|i686|x86[^_]": "x86",
    "armv7|arm32": "arm",
  };

  // OS patterns
  const osPatterns: Record<string, string> = {
    "darwin|macos|osx": "darwin",
    "linux": "linux",
    "windows|win32|win64|\\.exe": "windows",
  };

  let os: string | null = null;
  let arch: string | null = null;

  for (const [pattern, value] of Object.entries(osPatterns)) {
    if (new RegExp(pattern).test(lower)) {
      os = value;
      break;
    }
  }

  for (const [pattern, value] of Object.entries(archPatterns)) {
    if (new RegExp(pattern).test(lower)) {
      arch = value;
      break;
    }
  }

  if (os && arch) {
    return `${os}-${arch}`;
  } else if (os) {
    return os;
  }

  return null;
}

/**
 * Fetch GitHub release data
 */
async function fetchGitHubRelease(
  owner: string,
  repo: string,
  tag?: string
): Promise<GitHubReleaseResponse | null> {
  const endpoint = tag
    ? `https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`
    : `https://api.github.com/repos/${owner}/${repo}/releases/latest`;

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "mcp-list/1.0.0 (https://github.com/sjnims/mcp-list)",
  };

  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, { headers });

  if (!response.ok) {
    console.warn(
      `[MCPB/GitHub] API error for ${owner}/${repo}: ${response.status}`
    );
    return null;
  }

  return (await response.json()) as GitHubReleaseResponse;
}

/**
 * Fetch GitLab release data
 */
async function fetchGitLabRelease(
  owner: string,
  repo: string,
  tag?: string
): Promise<GitLabReleaseResponse | null> {
  const projectPath = encodeURIComponent(`${owner}/${repo}`);
  const endpoint = tag
    ? `https://gitlab.com/api/v4/projects/${projectPath}/releases/${encodeURIComponent(tag)}`
    : `https://gitlab.com/api/v4/projects/${projectPath}/releases`;

  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      "User-Agent": "mcp-list/1.0.0 (https://github.com/sjnims/mcp-list)",
    },
  });

  if (!response.ok) {
    console.warn(
      `[MCPB/GitLab] API error for ${owner}/${repo}: ${response.status}`
    );
    return null;
  }

  const data = await response.json();

  // If we fetched all releases, return the first one
  if (Array.isArray(data)) {
    return data[0] as GitLabReleaseResponse;
  }

  return data as GitLabReleaseResponse;
}

/**
 * Enrich server with MCPB release data
 */
export async function enrichMcpb(
  server: MCPServer
): Promise<{ mcpb: McpbEnrichment } | null> {
  const identifier = findMcpbPackage(server);
  if (!identifier) {
    return null;
  }

  const parsed = parseMcpbIdentifier(identifier);
  if (!parsed) {
    console.warn(`[MCPB] Could not parse identifier: ${identifier}`);
    return null;
  }

  console.log(`[MCPB] Fetching: ${parsed.source}/${parsed.owner}/${parsed.repo}`);

  if (parsed.source === "github") {
    const release = await fetchGitHubRelease(
      parsed.owner,
      parsed.repo,
      parsed.tag
    );

    if (!release) {
      return null;
    }

    // Aggregate download counts and detect platforms
    let totalDownloads = 0;
    let totalSize = 0;
    const platforms = new Set<string>();

    for (const asset of release.assets) {
      totalDownloads += asset.download_count;
      totalSize += asset.size;

      const platform = detectPlatform(asset.name);
      if (platform) {
        platforms.add(platform);
      }
    }

    return {
      mcpb: {
        releaseUrl: release.html_url,
        downloadCount: totalDownloads,
        assetSize: totalSize,
        lastRelease: release.published_at,
        platforms: Array.from(platforms),
        tagName: release.tag_name,
        prerelease: release.prerelease,
      },
    };
  } else {
    // GitLab
    const release = await fetchGitLabRelease(
      parsed.owner,
      parsed.repo,
      parsed.tag
    );

    if (!release) {
      return null;
    }

    // GitLab doesn't provide download counts via API
    const platforms = new Set<string>();
    for (const link of release.assets?.links || []) {
      const platform = detectPlatform(link.name);
      if (platform) {
        platforms.add(platform);
      }
    }

    return {
      mcpb: {
        releaseUrl: release._links.self,
        downloadCount: 0, // Not available via GitLab API
        assetSize: 0, // Not available via GitLab API
        lastRelease: release.released_at,
        platforms: Array.from(platforms),
        tagName: release.tag_name,
        prerelease: false, // GitLab doesn't have this concept
      },
    };
  }
}
