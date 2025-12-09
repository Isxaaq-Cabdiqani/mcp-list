/**
 * MCP Registry API Client
 * Fetches server data from the official MCP Registry
 */

import type {
  MCPRegistryResponse,
  MCPRegistryEntry,
  FetchServersOptions,
} from "./types.js";

const REGISTRY_BASE_URL = "https://registry.modelcontextprotocol.io";
const API_VERSION = "v0.1";
const DEFAULT_LIMIT = 100;

/**
 * Fetch servers from the MCP Registry with pagination support
 */
export async function fetchServers(
  options: FetchServersOptions = {}
): Promise<MCPRegistryResponse> {
  const { limit = DEFAULT_LIMIT, cursor, updatedSince } = options;

  const url = new URL(`${REGISTRY_BASE_URL}/${API_VERSION}/servers`);
  url.searchParams.set("limit", limit.toString());

  if (cursor) {
    url.searchParams.set("cursor", cursor);
  }

  if (updatedSince) {
    url.searchParams.set("updated_since", updatedSince);
  }

  console.log(`[Registry] Fetching: ${url.toString()}`);

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "mcp-list/1.0.0 (https://github.com/sjnims/mcp-list)",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Registry API error: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as MCPRegistryResponse;
  console.log(
    `[Registry] Received ${data.servers.length} servers (cursor: ${data.metadata.nextCursor || "none"})`
  );

  return data;
}

/**
 * Fetch all servers from the registry, handling pagination automatically
 */
export async function fetchAllServers(
  options: Omit<FetchServersOptions, "cursor"> = {}
): Promise<MCPRegistryEntry[]> {
  const allServers: MCPRegistryEntry[] = [];
  let cursor: string | undefined;
  let pageCount = 0;

  do {
    pageCount++;
    console.log(`[Registry] Fetching page ${pageCount}...`);

    const response = await fetchServers({
      ...options,
      cursor,
    });

    // Filter to only latest versions
    const latestServers = response.servers.filter(
      (entry) => entry._meta["io.modelcontextprotocol.registry/official"].isLatest
    );

    allServers.push(...latestServers);
    cursor = response.metadata.nextCursor;

    // Small delay between pages to be respectful
    if (cursor) {
      await sleep(100);
    }
  } while (cursor);

  console.log(
    `[Registry] Fetched ${allServers.length} latest servers across ${pageCount} pages`
  );

  return allServers;
}

/**
 * Fetch servers updated since a given timestamp
 */
export async function fetchUpdatedServers(
  since: string
): Promise<MCPRegistryEntry[]> {
  console.log(`[Registry] Fetching servers updated since ${since}`);
  return fetchAllServers({ updatedSince: since });
}

/**
 * Fetch a specific server version
 */
export async function fetchServerVersion(
  serverName: string,
  version: string = "latest"
): Promise<MCPRegistryEntry | null> {
  const encodedName = encodeURIComponent(serverName);
  const encodedVersion = encodeURIComponent(version);

  const url = `${REGISTRY_BASE_URL}/${API_VERSION}/servers/${encodedName}/versions/${encodedVersion}`;

  console.log(`[Registry] Fetching server: ${serverName}@${version}`);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "mcp-list/1.0.0 (https://github.com/sjnims/mcp-list)",
    },
  });

  if (response.status === 404) {
    console.log(`[Registry] Server not found: ${serverName}@${version}`);
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Registry API error: ${response.status} ${response.statusText}`
    );
  }

  return (await response.json()) as MCPRegistryEntry;
}

/**
 * List all versions of a specific server
 */
export async function fetchServerVersions(
  serverName: string
): Promise<string[]> {
  const encodedName = encodeURIComponent(serverName);
  const url = `${REGISTRY_BASE_URL}/${API_VERSION}/servers/${encodedName}/versions`;

  console.log(`[Registry] Fetching versions for: ${serverName}`);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "mcp-list/1.0.0 (https://github.com/sjnims/mcp-list)",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Registry API error: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as { versions: string[] };
  return data.versions;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
