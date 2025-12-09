/**
 * NuGet Enricher
 * Fetches package metadata from NuGet registry
 */

import type { MCPServer, NuGetEnrichment } from "../types.js";

const NUGET_API_URL = "https://api.nuget.org/v3";


interface NuGetSearchResponse {
  data: Array<{
    id: string;
    version: string;
    totalDownloads: number;
    authors: string[];
    tags: string[];
    projectUrl?: string;
  }>;
}

/**
 * Find NuGet package identifier from server packages
 */
function findNuGetPackage(server: MCPServer): string | null {
  const nugetPackage = server.packages.find(
    (pkg) => pkg.registryType === "nuget"
  );
  return nugetPackage?.identifier || null;
}

/**
 * Fetch NuGet package via search API (includes download counts)
 */
async function fetchPackageSearch(
  packageName: string
): Promise<NuGetSearchResponse["data"][0] | null> {
  const url = `${NUGET_API_URL}/query?q=packageid:${encodeURIComponent(packageName)}&take=1`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "mcp-list/1.0.0 (https://github.com/sjnims/mcp-list)",
    },
  });

  if (!response.ok) {
    console.warn(`[NuGet] API error for ${packageName}: ${response.status}`);
    return null;
  }

  const data = (await response.json()) as NuGetSearchResponse;
  return data.data.find(
    (pkg) => pkg.id.toLowerCase() === packageName.toLowerCase()
  ) || null;
}


/**
 * Enrich server with NuGet package data
 */
export async function enrichNuGet(
  server: MCPServer
): Promise<{ nuget: NuGetEnrichment } | null> {
  const packageName = findNuGetPackage(server);
  if (!packageName) {
    return null;
  }

  console.log(`[NuGet] Fetching: ${packageName}`);

  const searchData = await fetchPackageSearch(packageName);
  if (!searchData) {
    return null;
  }

  // Parse authors - NuGet returns string array
  const authors = searchData.authors || [];

  return {
    nuget: {
      totalDownloads: searchData.totalDownloads || 0,
      latestVersion: searchData.version,
      lastPublished: new Date().toISOString(), // Search API doesn't include published date
      authors,
      tags: searchData.tags || [],
      projectUrl: searchData.projectUrl,
    },
  };
}
