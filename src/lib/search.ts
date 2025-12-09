/**
 * Search functionality for MCP servers
 */

import type { MCPServer } from "../../scripts/types.js";

/**
 * Normalize text for search comparison
 */
function normalize(text: string): string {
  return text.toLowerCase().trim();
}

/**
 * Check if a server matches the search query
 * Searches across multiple fields with different weights
 */
export function matchesSearch(server: MCPServer, query: string): boolean {
  if (!query) return true;

  const normalizedQuery = normalize(query);
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);

  // All terms must match at least one field
  return terms.every((term) => matchesTerm(server, term));
}

/**
 * Check if a server matches a single search term
 */
function matchesTerm(server: MCPServer, term: string): boolean {
  // Check name (highest priority)
  if (normalize(server.name).includes(term)) {
    return true;
  }

  // Check description
  if (normalize(server.description).includes(term)) {
    return true;
  }

  // Check computed organization/server name
  if (server._computed) {
    if (normalize(server._computed.organization).includes(term)) {
      return true;
    }
    if (normalize(server._computed.serverName).includes(term)) {
      return true;
    }
  }

  // Check GitHub topics
  if (server.enrichment?.github?.topics) {
    if (server.enrichment.github.topics.some((t) => normalize(t).includes(term))) {
      return true;
    }
  }

  // Check GitHub owner
  if (server.enrichment?.github?.owner?.login) {
    if (normalize(server.enrichment.github.owner.login).includes(term)) {
      return true;
    }
  }

  // Check npm keywords
  if (server.enrichment?.npm?.keywords) {
    if (server.enrichment.npm.keywords.some((k) => normalize(k).includes(term))) {
      return true;
    }
  }

  // Check PyPI keywords
  if (server.enrichment?.pypi?.keywords) {
    if (server.enrichment.pypi.keywords.some((k) => normalize(k).includes(term))) {
      return true;
    }
  }

  // Check package types
  if (server._computed?.packageTypes) {
    if (server._computed.packageTypes.some((p) => normalize(p).includes(term))) {
      return true;
    }
  }

  // Check repository URL
  if (server.repository?.url) {
    if (normalize(server.repository.url).includes(term)) {
      return true;
    }
  }

  return false;
}

/**
 * Score a server's relevance to a search query
 * Higher score = more relevant
 */
export function scoreSearch(server: MCPServer, query: string): number {
  if (!query) return 0;

  const normalizedQuery = normalize(query);
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);

  let score = 0;

  for (const term of terms) {
    // Exact name match (highest weight)
    if (normalize(server.name) === term) {
      score += 100;
    } else if (normalize(server.name).includes(term)) {
      // Partial name match
      score += 50;
    }

    // Server name part match
    if (server._computed?.serverName) {
      if (normalize(server._computed.serverName) === term) {
        score += 80;
      } else if (normalize(server._computed.serverName).includes(term)) {
        score += 40;
      }
    }

    // Description match
    if (normalize(server.description).includes(term)) {
      score += 20;
    }

    // Topic/keyword match
    const topics = [
      ...(server.enrichment?.github?.topics || []),
      ...(server.enrichment?.npm?.keywords || []),
      ...(server.enrichment?.pypi?.keywords || []),
    ];

    if (topics.some((t) => normalize(t) === term)) {
      score += 15;
    } else if (topics.some((t) => normalize(t).includes(term))) {
      score += 10;
    }

    // Organization match
    if (server._computed?.organization) {
      if (normalize(server._computed.organization).includes(term)) {
        score += 10;
      }
    }
  }

  // Boost by popularity (GitHub stars, downloads)
  if (server._computed?.stars) {
    score += Math.min(server._computed.stars / 100, 10);
  }

  if (server._computed?.totalDownloads) {
    score += Math.min(server._computed.totalDownloads / 10000, 10);
  }

  return score;
}

/**
 * Filter and sort servers by search relevance
 */
export function searchServers(
  servers: MCPServer[],
  query: string
): MCPServer[] {
  if (!query) return servers;

  // Filter to only matching servers
  const matching = servers.filter((s) => matchesSearch(s, query));

  // Sort by relevance score (descending)
  return matching.sort((a, b) => scoreSearch(b, query) - scoreSearch(a, query));
}
