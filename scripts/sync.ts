/**
 * Main Sync Script
 * Orchestrates fetching from MCP Registry and enriching server data
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname } from "node:path";
import {
  fetchAllServers,
  fetchUpdatedServers,
} from "./registry.js";
import {
  enrichServers,
  computeServerFields,
} from "./enrichers/index.js";
import type {
  MCPServer,
  MCPRegistryEntry,
  SyncState,
  RegistryType,
} from "./types.js";

const DATA_DIR = "./data";
const SERVERS_FILE = `${DATA_DIR}/servers.json`;
const SYNC_STATE_FILE = `${DATA_DIR}/sync-state.json`;

// Force full sync every 7 days regardless of incremental updates
const FULL_SYNC_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Load existing server data
 */
async function loadServers(): Promise<Map<string, MCPServer>> {
  if (!existsSync(SERVERS_FILE)) {
    return new Map();
  }

  try {
    const content = await readFile(SERVERS_FILE, "utf-8");
    const servers = JSON.parse(content) as MCPServer[];
    return new Map(servers.map((s) => [s.name, s]));
  } catch (error) {
    console.error("[Sync] Error loading servers:", error);
    return new Map();
  }
}

/**
 * Load sync state
 */
async function loadSyncState(): Promise<SyncState | null> {
  if (!existsSync(SYNC_STATE_FILE)) {
    return null;
  }

  try {
    const content = await readFile(SYNC_STATE_FILE, "utf-8");
    return JSON.parse(content) as SyncState;
  } catch (error) {
    console.error("[Sync] Error loading sync state:", error);
    return null;
  }
}

/**
 * Save servers to file
 */
async function saveServers(servers: MCPServer[]): Promise<void> {
  await mkdir(dirname(SERVERS_FILE), { recursive: true });

  // Sort by name for consistent output
  const sorted = [...servers].sort((a, b) => a.name.localeCompare(b.name));

  await writeFile(SERVERS_FILE, JSON.stringify(sorted, null, 2), "utf-8");
  console.log(`[Sync] Saved ${servers.length} servers to ${SERVERS_FILE}`);
}

/**
 * Save sync state
 */
async function saveSyncState(state: SyncState): Promise<void> {
  await mkdir(dirname(SYNC_STATE_FILE), { recursive: true });
  await writeFile(SYNC_STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
  console.log(`[Sync] Saved sync state to ${SYNC_STATE_FILE}`);
}

/**
 * Convert registry entry to MCPServer
 */
function convertRegistryEntry(entry: MCPRegistryEntry): MCPServer {
  const meta = entry._meta["io.modelcontextprotocol.registry/official"];

  return {
    name: entry.server.name,
    description: entry.server.description,
    version: entry.server.version,
    repository: entry.server.repository,
    packages: entry.server.packages || [],
    remotes: entry.server.remotes || [],
    status: meta.status,
    publishedAt: meta.publishedAt,
    updatedAt: meta.updatedAt,
    isLatest: meta.isLatest,
    enrichment: {
      lastEnrichedAt: "",
    },
    _computed: {
      organization: "",
      serverName: "",
      packageTypes: [] as RegistryType[],
      hasRemote: false,
      totalDownloads: 0,
      stars: 0,
    },
  };
}

/**
 * Determine if we should do a full sync
 */
function shouldDoFullSync(state: SyncState | null): boolean {
  // Force full sync via environment variable
  if (process.env.FULL_SYNC === "true") {
    console.log("[Sync] Full sync requested via FULL_SYNC=true");
    return true;
  }

  // No previous state, do full sync
  if (!state) {
    console.log("[Sync] No previous state, doing full sync");
    return true;
  }

  // Check if it's been too long since last full sync
  const lastFullSync = new Date(state.lastFullSyncAt).getTime();
  const timeSinceFullSync = Date.now() - lastFullSync;

  if (timeSinceFullSync > FULL_SYNC_INTERVAL_MS) {
    console.log("[Sync] Time since last full sync exceeded, doing full sync");
    return true;
  }

  return false;
}

/**
 * Main sync function
 */
async function sync(): Promise<void> {
  console.log("[Sync] Starting sync...");
  console.log(`[Sync] Timestamp: ${new Date().toISOString()}`);

  // Load existing data
  const existingServers = await loadServers();
  const syncState = await loadSyncState();

  console.log(`[Sync] Existing servers: ${existingServers.size}`);

  const doFullSync = shouldDoFullSync(syncState);
  let entries: MCPRegistryEntry[];

  if (doFullSync) {
    console.log("[Sync] Performing full sync...");
    entries = await fetchAllServers();
  } else {
    console.log(
      `[Sync] Performing incremental sync since ${syncState!.lastSyncAt}...`
    );
    entries = await fetchUpdatedServers(syncState!.lastSyncAt);
  }

  console.log(`[Sync] Fetched ${entries.length} servers from registry`);

  // Convert and merge with existing data
  const updatedServers = new Map(existingServers);

  for (const entry of entries) {
    const server = convertRegistryEntry(entry);

    // Preserve existing enrichment data if available
    const existing = existingServers.get(server.name);
    if (existing?.enrichment?.lastEnrichedAt) {
      server.enrichment = existing.enrichment;
    }

    // Handle deleted/deprecated servers
    if (server.status === "deleted") {
      updatedServers.delete(server.name);
      console.log(`[Sync] Removed deleted server: ${server.name}`);
    } else {
      updatedServers.set(server.name, server);
    }
  }

  // Convert to array for enrichment
  let serversArray = Array.from(updatedServers.values());

  // Enrich servers (only new/updated ones if incremental)
  if (entries.length > 0) {
    const serversToEnrich = doFullSync
      ? serversArray
      : serversArray.filter((s) =>
          entries.some((e) => e.server.name === s.name)
        );

    console.log(`[Sync] Enriching ${serversToEnrich.length} servers...`);

    const enrichedServers = await enrichServers(serversToEnrich, {
      delayMs: 200,
      concurrency: 2,
      skipIfFresh: !doFullSync,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    // Update with enriched data
    for (const server of enrichedServers) {
      updatedServers.set(server.name, server);
    }
  }

  // Compute derived fields for all servers
  serversArray = Array.from(updatedServers.values()).map(computeServerFields);

  // Save results
  await saveServers(serversArray);

  // Update sync state
  const newState: SyncState = {
    lastSyncAt: new Date().toISOString(),
    totalServers: serversArray.length,
    lastFullSyncAt: doFullSync
      ? new Date().toISOString()
      : syncState?.lastFullSyncAt || new Date().toISOString(),
    version: 1,
  };

  await saveSyncState(newState);

  // Summary
  console.log("\n[Sync] === Summary ===");
  console.log(`[Sync] Total servers: ${serversArray.length}`);
  console.log(`[Sync] Active: ${serversArray.filter((s) => s.status === "active").length}`);
  console.log(
    `[Sync] Deprecated: ${serversArray.filter((s) => s.status === "deprecated").length}`
  );
  console.log(
    `[Sync] With GitHub: ${serversArray.filter((s) => s.enrichment?.github).length}`
  );
  console.log(
    `[Sync] With npm: ${serversArray.filter((s) => s.enrichment?.npm).length}`
  );
  console.log(
    `[Sync] With PyPI: ${serversArray.filter((s) => s.enrichment?.pypi).length}`
  );
  console.log(
    `[Sync] With remotes: ${serversArray.filter((s) => s.remotes.length > 0).length}`
  );
  console.log("[Sync] Sync complete!");
}

// Run sync
sync().catch((error) => {
  console.error("[Sync] Fatal error:", error);
  process.exit(1);
});
