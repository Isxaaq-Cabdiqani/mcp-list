/**
 * Sort functionality for MCP servers
 */

import type { MCPServer, SortField, SortDirection, SortOption } from "../../scripts/types.js";

/**
 * Available sort options
 */
export const SORT_OPTIONS: SortOption[] = [
  { field: "stars", direction: "desc", label: "Stars (High to Low)" },
  { field: "stars", direction: "asc", label: "Stars (Low to High)" },
  { field: "downloads", direction: "desc", label: "Downloads (High to Low)" },
  { field: "downloads", direction: "asc", label: "Downloads (Low to High)" },
  { field: "updatedAt", direction: "desc", label: "Recently Updated" },
  { field: "updatedAt", direction: "asc", label: "Oldest Updated" },
  { field: "publishedAt", direction: "desc", label: "Recently Added" },
  { field: "publishedAt", direction: "asc", label: "Oldest Added" },
  { field: "name", direction: "asc", label: "Name (A-Z)" },
  { field: "name", direction: "desc", label: "Name (Z-A)" },
];

/**
 * Default sort option
 */
export const DEFAULT_SORT: SortOption = SORT_OPTIONS[0];

/**
 * Get sort value for a server
 */
function getSortValue(
  server: MCPServer,
  field: SortField
): string | number | Date {
  switch (field) {
    case "name":
      return server.name.toLowerCase();

    case "stars":
      return server._computed?.stars || 0;

    case "downloads":
      return server._computed?.totalDownloads || 0;

    case "updatedAt":
      return new Date(server.updatedAt).getTime();

    case "publishedAt":
      return new Date(server.publishedAt).getTime();

    default:
      return server.name.toLowerCase();
  }
}

/**
 * Compare two values for sorting
 */
function compareValues(
  a: string | number | Date,
  b: string | number | Date,
  direction: SortDirection
): number {
  let result: number;

  if (typeof a === "string" && typeof b === "string") {
    result = a.localeCompare(b);
  } else if (typeof a === "number" && typeof b === "number") {
    result = a - b;
  } else {
    result = 0;
  }

  return direction === "desc" ? -result : result;
}

/**
 * Sort servers by a specific field and direction
 */
export function sortServers(
  servers: MCPServer[],
  field: SortField,
  direction: SortDirection
): MCPServer[] {
  return [...servers].sort((a, b) => {
    const aValue = getSortValue(a, field);
    const bValue = getSortValue(b, field);
    return compareValues(aValue, bValue, direction);
  });
}

/**
 * Sort servers using a SortOption
 */
export function sortServersByOption(
  servers: MCPServer[],
  option: SortOption
): MCPServer[] {
  return sortServers(servers, option.field, option.direction);
}

/**
 * Find a sort option by field and direction
 */
export function findSortOption(
  field: SortField,
  direction: SortDirection
): SortOption | undefined {
  return SORT_OPTIONS.find(
    (opt) => opt.field === field && opt.direction === direction
  );
}

/**
 * Get sort option index for use in select elements
 */
export function getSortOptionIndex(option: SortOption): number {
  return SORT_OPTIONS.findIndex(
    (opt) => opt.field === option.field && opt.direction === option.direction
  );
}

/**
 * Get sort option by index
 */
export function getSortOptionByIndex(index: number): SortOption {
  return SORT_OPTIONS[index] || DEFAULT_SORT;
}
