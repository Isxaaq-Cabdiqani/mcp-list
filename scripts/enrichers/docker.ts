/**
 * Docker Hub Enricher
 * Fetches image metadata from Docker Hub
 */

import type { MCPServer, DockerEnrichment } from "../types.js";

const DOCKER_HUB_API_URL = "https://hub.docker.com/v2";

interface DockerHubRepoResponse {
  name: string;
  namespace: string;
  description?: string;
  pull_count: number;
  star_count: number;
  last_updated: string;
  is_official: boolean;
  is_automated: boolean;
}

interface DockerHubTagsResponse {
  count: number;
  results: Array<{
    name: string;
    last_updated: string;
  }>;
}

/**
 * Parse Docker/OCI image identifier
 * Format: registry/namespace/repository:tag or namespace/repository:tag
 */
function parseDockerImage(identifier: string): {
  registry: string;
  namespace: string;
  repository: string;
  tag: string;
} | null {
  // Remove tag if present
  const [imagePath, tag = "latest"] = identifier.split(":");

  const parts = imagePath.split("/");

  // Docker Hub images
  if (parts.length === 1) {
    // Official images (e.g., "nginx")
    return {
      registry: "docker.io",
      namespace: "library",
      repository: parts[0],
      tag,
    };
  } else if (parts.length === 2) {
    // User images (e.g., "user/repo")
    if (!parts[0].includes(".")) {
      return {
        registry: "docker.io",
        namespace: parts[0],
        repository: parts[1],
        tag,
      };
    }
  }

  // Other registries (ghcr.io, gcr.io, etc.)
  if (parts.length >= 3) {
    return {
      registry: parts[0],
      namespace: parts[1],
      repository: parts.slice(2).join("/"),
      tag,
    };
  }

  return null;
}

/**
 * Find Docker/OCI package identifier from server packages
 */
function findDockerPackage(server: MCPServer): string | null {
  const dockerPackage = server.packages.find(
    (pkg) => pkg.registryType === "oci"
  );
  return dockerPackage?.identifier || null;
}

/**
 * Fetch Docker Hub repository data
 */
async function fetchRepoData(
  namespace: string,
  repository: string
): Promise<DockerHubRepoResponse | null> {
  const url = `${DOCKER_HUB_API_URL}/repositories/${namespace}/${repository}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "mcp-list/1.0.0 (https://github.com/sjnims/mcp-list)",
  };

  // Add auth if available
  const username = process.env.DOCKER_USERNAME;
  const password = process.env.DOCKER_PASSWORD;
  if (username && password) {
    const auth = Buffer.from(`${username}:${password}`).toString("base64");
    headers["Authorization"] = `Basic ${auth}`;
  }

  const response = await fetch(url, { headers });

  if (response.status === 404) {
    console.log(`[Docker] Repository not found: ${namespace}/${repository}`);
    return null;
  }

  if (response.status === 429) {
    console.warn("[Docker] Rate limited");
    return null;
  }

  if (!response.ok) {
    console.warn(
      `[Docker] API error for ${namespace}/${repository}: ${response.status}`
    );
    return null;
  }

  return (await response.json()) as DockerHubRepoResponse;
}

/**
 * Fetch Docker Hub tags (limited to most recent)
 */
async function fetchTags(
  namespace: string,
  repository: string
): Promise<string[]> {
  const url = `${DOCKER_HUB_API_URL}/repositories/${namespace}/${repository}/tags?page_size=10&ordering=-last_updated`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "mcp-list/1.0.0 (https://github.com/sjnims/mcp-list)",
    },
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as DockerHubTagsResponse;
  return data.results.map((t) => t.name);
}

/**
 * Enrich server with Docker Hub data
 */
export async function enrichDocker(
  server: MCPServer
): Promise<{ docker: DockerEnrichment } | null> {
  const identifier = findDockerPackage(server);
  if (!identifier) {
    return null;
  }

  const parsed = parseDockerImage(identifier);
  if (!parsed) {
    console.warn(`[Docker] Could not parse identifier: ${identifier}`);
    return null;
  }

  // Only support Docker Hub for now
  if (parsed.registry !== "docker.io") {
    console.log(`[Docker] Skipping non-Docker Hub image: ${parsed.registry}`);
    return null;
  }

  console.log(`[Docker] Fetching: ${parsed.namespace}/${parsed.repository}`);

  const [repoData, tags] = await Promise.all([
    fetchRepoData(parsed.namespace, parsed.repository),
    fetchTags(parsed.namespace, parsed.repository),
  ]);

  if (!repoData) {
    return null;
  }

  return {
    docker: {
      pulls: repoData.pull_count,
      stars: repoData.star_count,
      lastUpdated: repoData.last_updated,
      tags,
      description: repoData.description,
      isOfficial: repoData.is_official,
      isAutomated: repoData.is_automated,
    },
  };
}
