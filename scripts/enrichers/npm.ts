/**
 * npm Registry Enricher
 * Fetches package metadata from npm registry
 */

import type { MCPServer, NpmEnrichment } from "../types.js";
import { fetchWithRetry } from "../utils/fetch.js";

const NPM_REGISTRY_URL = "https://registry.npmjs.org";
const NPM_API_URL = "https://api.npmjs.org";

interface NpmPackageResponse {
  name: string;
  "dist-tags": { latest: string };
  time: Record<string, string>;
  maintainers?: Array<{ name: string }>;
  homepage?: string;
  keywords?: string[];
  versions: Record<
    string,
    {
      dependencies?: Record<string, string>;
    }
  >;
}

interface NpmDownloadsResponse {
  downloads: number;
  start: string;
  end: string;
  package: string;
}

/**
 * Find npm package identifier from server packages
 */
function findNpmPackage(server: MCPServer): string | null {
  const npmPackage = server.packages.find((pkg) => pkg.registryType === "npm");
  return npmPackage?.identifier || null;
}

/**
 * Fetch npm package metadata
 */
async function fetchPackageData(
  packageName: string
): Promise<NpmPackageResponse | null> {
  const encodedName = encodeURIComponent(packageName);
  const url = `${NPM_REGISTRY_URL}/${encodedName}`;

  const response = await fetchWithRetry(
    url,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "mcp-list/1.0.0 (https://github.com/sjnims/mcp-list)",
      },
    },
    3,
    10000
  );

  if (response.status === 404) {
    console.log(`[npm] Package not found: ${packageName}`);
    return null;
  }

  if (!response.ok) {
    console.warn(`[npm] API error for ${packageName}: ${response.status}`);
    return null;
  }

  return (await response.json()) as NpmPackageResponse;
}

/**
 * Fetch npm download counts
 */
async function fetchDownloads(
  packageName: string,
  period: "last-week" | "last-month"
): Promise<number> {
  const encodedName = encodeURIComponent(packageName);
  const url = `${NPM_API_URL}/downloads/point/${period}/${encodedName}`;

  const response = await fetchWithRetry(
    url,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "mcp-list/1.0.0 (https://github.com/sjnims/mcp-list)",
      },
    },
    3,
    10000
  );

  if (!response.ok) {
    return 0;
  }

  const data = (await response.json()) as NpmDownloadsResponse;
  return data.downloads || 0;
}

/**
 * Enrich server with npm package data
 */
export async function enrichNpm(
  server: MCPServer
): Promise<{ npm: NpmEnrichment } | null> {
  const packageName = findNpmPackage(server);
  if (!packageName) {
    return null;
  }

  console.log(`[npm] Fetching: ${packageName}`);

  const [packageData, weeklyDownloads, monthlyDownloads] = await Promise.all([
    fetchPackageData(packageName),
    fetchDownloads(packageName, "last-week"),
    fetchDownloads(packageName, "last-month"),
  ]);

  if (!packageData) {
    return null;
  }

  // Check if dist-tags and latest version exist
  if (!packageData["dist-tags"]) {
    console.warn(`[npm] Package has no dist-tags: ${packageName}`);
    return null;
  }

  if (!packageData["dist-tags"].latest) {
    console.warn(`[npm] Package has no latest tag: ${packageName}`);
    return null;
  }

  const latestVersion = packageData["dist-tags"].latest;
  const latestVersionData = packageData.versions[latestVersion];
  const dependencyCount = latestVersionData?.dependencies
    ? Object.keys(latestVersionData.dependencies).length
    : 0;

  return {
    npm: {
      weeklyDownloads,
      monthlyDownloads,
      latestVersion,
      dependencies: dependencyCount,
      lastPublished: packageData.time[latestVersion] || packageData.time.modified,
      maintainers: packageData.maintainers?.map((m) => m.name) || [],
      homepage: packageData.homepage,
      keywords: packageData.keywords || [],
    },
  };
}
