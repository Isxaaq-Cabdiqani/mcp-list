/**
 * Enricher Orchestrator
 * Coordinates enrichment from multiple sources with rate limiting
 */

import type { MCPServer, Enrichment } from "../types.js";
import { enrichGitHub } from "./github.js";
import { enrichNpm } from "./npm.js";
import { enrichPyPi } from "./pypi.js";
import { enrichNuGet } from "./nuget.js";
import { enrichDocker } from "./docker.js";
import { enrichMcpb } from "./mcpb.js";

interface EnrichmentOptions {
  /** Delay between enrichment calls (ms) */
  delayMs?: number;
  /** Maximum concurrent enrichments */
  concurrency?: number;
  /** Skip enrichers that have already run recently */
  skipIfFresh?: boolean;
  /** Maximum age of enrichment data before refresh (ms) */
  maxAge?: number;
}

const DEFAULT_OPTIONS: Required<EnrichmentOptions> = {
  delayMs: 100,
  concurrency: 3,
  skipIfFresh: true,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * Check if enrichment data is still fresh
 */
function isEnrichmentFresh(server: MCPServer, maxAge: number): boolean {
  const lastEnriched = server.enrichment?.lastEnrichedAt;
  if (!lastEnriched) return false;

  const age = Date.now() - new Date(lastEnriched).getTime();
  return age < maxAge;
}

/**
 * Enrich a single server with data from all applicable sources
 */
export async function enrichServer(
  server: MCPServer,
  options: EnrichmentOptions = {}
): Promise<MCPServer> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Skip if enrichment is still fresh
  if (opts.skipIfFresh && isEnrichmentFresh(server, opts.maxAge)) {
    console.log(`[Enricher] Skipping ${server.name} (data is fresh)`);
    return server;
  }

  console.log(`[Enricher] Enriching: ${server.name}`);

  const enrichment: Enrichment = {
    ...server.enrichment,
    lastEnrichedAt: new Date().toISOString(),
  };

  // Run enrichers in sequence with small delays to avoid rate limits
  const enrichers = [
    { name: "GitHub", fn: enrichGitHub },
    { name: "npm", fn: enrichNpm },
    { name: "PyPI", fn: enrichPyPi },
    { name: "NuGet", fn: enrichNuGet },
    { name: "Docker", fn: enrichDocker },
    { name: "MCPB", fn: enrichMcpb },
  ];

  for (const { name, fn } of enrichers) {
    try {
      const result = await fn(server);
      if (result) {
        Object.assign(enrichment, result);
      }
    } catch (error) {
      console.error(`[Enricher] ${name} error for ${server.name}:`, error);
    }

    // Small delay between enrichers
    await sleep(opts.delayMs);
  }

  return {
    ...server,
    enrichment,
  };
}

/**
 * Enrich multiple servers with rate limiting and concurrency control
 */
export async function enrichServers(
  servers: MCPServer[],
  options: EnrichmentOptions = {}
): Promise<MCPServer[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  console.log(`[Enricher] Starting enrichment for ${servers.length} servers`);
  console.log(
    `[Enricher] Concurrency: ${opts.concurrency}, Delay: ${opts.delayMs}ms`
  );

  const results: MCPServer[] = [];
  const queue = [...servers];

  // Process in batches with concurrency limit
  while (queue.length > 0) {
    const batch = queue.splice(0, opts.concurrency);

    const batchResults = await Promise.all(
      batch.map((server) => enrichServer(server, opts))
    );

    results.push(...batchResults);

    // Delay between batches
    if (queue.length > 0) {
      await sleep(opts.delayMs * 2);
    }

    // Progress logging
    const progress = Math.round(
      ((servers.length - queue.length) / servers.length) * 100
    );
    console.log(
      `[Enricher] Progress: ${progress}% (${results.length}/${servers.length})`
    );
  }

  console.log(`[Enricher] Completed enrichment for ${results.length} servers`);

  return results;
}

/**
 * Compute derived fields for a server
 */
export function computeServerFields(server: MCPServer): MCPServer {
  const nameParts = server.name.split("/");
  const organization = nameParts.length > 1 ? nameParts[0] : "";
  const serverName = nameParts.length > 1 ? nameParts[1] : nameParts[0];

  const packageTypes = [
    ...new Set(server.packages.map((p) => p.registryType)),
  ];

  const hasRemote = server.remotes.length > 0;

  // Calculate total downloads across all package types
  let totalDownloads = 0;
  if (server.enrichment?.npm?.monthlyDownloads) {
    totalDownloads += server.enrichment.npm.monthlyDownloads;
  }
  if (server.enrichment?.pypi?.downloads) {
    totalDownloads += server.enrichment.pypi.downloads;
  }
  if (server.enrichment?.nuget?.totalDownloads) {
    totalDownloads += server.enrichment.nuget.totalDownloads;
  }
  if (server.enrichment?.docker?.pulls) {
    totalDownloads += server.enrichment.docker.pulls;
  }
  if (server.enrichment?.mcpb?.downloadCount) {
    totalDownloads += server.enrichment.mcpb.downloadCount;
  }

  const stars = server.enrichment?.github?.stars || 0;

  return {
    ...server,
    _computed: {
      organization,
      serverName,
      packageTypes,
      hasRemote,
      totalDownloads,
      stars,
    },
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
