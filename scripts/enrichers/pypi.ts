/**
 * PyPI Enricher
 * Fetches package metadata from PyPI
 */

import type { MCPServer, PyPiEnrichment } from "../types.js";

const PYPI_API_URL = "https://pypi.org/pypi";
const PYPISTATS_API_URL = "https://pypistats.org/api";

interface PyPiPackageResponse {
  info: {
    version: string;
    requires_python?: string;
    author?: string;
    author_email?: string;
    home_page?: string;
    keywords?: string;
    release_url: string;
  };
  releases: Record<string, Array<{ upload_time_iso_8601: string }>>;
}


/**
 * Find PyPI package identifier from server packages
 */
function findPyPiPackage(server: MCPServer): string | null {
  const pypiPackage = server.packages.find(
    (pkg) => pkg.registryType === "pypi"
  );
  return pypiPackage?.identifier || null;
}

/**
 * Fetch PyPI package metadata
 */
async function fetchPackageData(
  packageName: string
): Promise<PyPiPackageResponse | null> {
  const url = `${PYPI_API_URL}/${packageName}/json`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "mcp-list/1.0.0 (https://github.com/sjnims/mcp-list)",
    },
  });

  if (response.status === 404) {
    console.log(`[PyPI] Package not found: ${packageName}`);
    return null;
  }

  if (!response.ok) {
    console.warn(`[PyPI] API error for ${packageName}: ${response.status}`);
    return null;
  }

  return (await response.json()) as PyPiPackageResponse;
}

/**
 * Fetch PyPI download statistics (last 30 days)
 */
async function fetchDownloads(packageName: string): Promise<number> {
  const url = `${PYPISTATS_API_URL}/packages/${packageName}/recent`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "mcp-list/1.0.0 (https://github.com/sjnims/mcp-list)",
      },
    });

    if (!response.ok) {
      return 0;
    }

    const data = (await response.json()) as {
      data: { last_month: number };
    };
    return data.data?.last_month || 0;
  } catch {
    // pypistats.org may not have data for all packages
    return 0;
  }
}

/**
 * Enrich server with PyPI package data
 */
export async function enrichPyPi(
  server: MCPServer
): Promise<{ pypi: PyPiEnrichment } | null> {
  const packageName = findPyPiPackage(server);
  if (!packageName) {
    return null;
  }

  console.log(`[PyPI] Fetching: ${packageName}`);

  const [packageData, downloads] = await Promise.all([
    fetchPackageData(packageName),
    fetchDownloads(packageName),
  ]);

  if (!packageData) {
    return null;
  }

  const latestVersion = packageData.info.version;
  const releases = packageData.releases[latestVersion] || [];
  const lastPublished =
    releases.length > 0
      ? releases[0].upload_time_iso_8601
      : new Date().toISOString();

  // Parse keywords from comma or space separated string
  const keywords = packageData.info.keywords
    ? packageData.info.keywords.split(/[,\s]+/).filter(Boolean)
    : [];

  return {
    pypi: {
      downloads,
      latestVersion,
      requiresPython: packageData.info.requires_python,
      lastPublished,
      author: packageData.info.author,
      authorEmail: packageData.info.author_email,
      homepage: packageData.info.home_page,
      keywords,
    },
  };
}
