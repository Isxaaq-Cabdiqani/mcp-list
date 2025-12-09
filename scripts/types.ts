// =============================================================================
// MCP Registry Types
// =============================================================================

/** Package registry types supported by MCP */
export type RegistryType = "npm" | "pypi" | "nuget" | "oci" | "mcpb";

/** Transport types for remote servers */
export type TransportType = "streamable-http" | "sse";

/** Server status in the registry */
export type ServerStatus = "active" | "deprecated" | "deleted";

/** Environment variable definition for packages */
export interface EnvironmentVariable {
  name: string;
  description?: string;
  required?: boolean;
  secret?: boolean;
}

/** Header definition for remote servers */
export interface RemoteHeader {
  name: string;
  description?: string;
  isRequired?: boolean;
  isSecret?: boolean;
}

/** Package definition from MCP Registry */
export interface Package {
  registryType: RegistryType;
  identifier: string;
  transport?: TransportType[];
  environmentVariables?: EnvironmentVariable[];
  fileSha256?: string; // Required for MCPB
}

/** Remote server definition */
export interface Remote {
  type: TransportType;
  url: string;
  headers?: RemoteHeader[];
}

/** Repository information */
export interface Repository {
  url: string;
  source?: string;
}

/** Raw server data from MCP Registry API */
export interface MCPRegistryServer {
  $schema?: string;
  name: string;
  description: string;
  repository?: Repository;
  version: string;
  packages?: Package[];
  remotes?: Remote[];
}

/** Registry metadata from MCP Registry API */
export interface MCPRegistryMeta {
  "io.modelcontextprotocol.registry/official": {
    status: ServerStatus;
    publishedAt: string;
    updatedAt: string;
    isLatest: boolean;
  };
}

/** Server entry from MCP Registry API response */
export interface MCPRegistryEntry {
  server: MCPRegistryServer;
  _meta: MCPRegistryMeta;
}

/** MCP Registry API response */
export interface MCPRegistryResponse {
  servers: MCPRegistryEntry[];
  metadata: {
    count: number;
    nextCursor?: string;
  };
}

// =============================================================================
// Enrichment Types
// =============================================================================

/** GitHub repository enrichment data */
export interface GitHubEnrichment {
  stars: number;
  forks: number;
  openIssues: number;
  watchers: number;
  lastCommit: string;
  license?: string;
  topics: string[];
  language?: string;
  owner: {
    login: string;
    avatar: string;
  };
  archived: boolean;
  defaultBranch: string;
}

/** npm package enrichment data */
export interface NpmEnrichment {
  weeklyDownloads: number;
  monthlyDownloads: number;
  latestVersion: string;
  dependencies: number;
  lastPublished: string;
  maintainers: string[];
  homepage?: string;
  keywords: string[];
}

/** PyPI package enrichment data */
export interface PyPiEnrichment {
  downloads: number;
  latestVersion: string;
  requiresPython?: string;
  lastPublished: string;
  author?: string;
  authorEmail?: string;
  homepage?: string;
  keywords: string[];
}

/** NuGet package enrichment data */
export interface NuGetEnrichment {
  totalDownloads: number;
  latestVersion: string;
  lastPublished: string;
  authors: string[];
  tags: string[];
  projectUrl?: string;
}

/** Docker Hub enrichment data */
export interface DockerEnrichment {
  pulls: number;
  stars: number;
  lastUpdated: string;
  tags: string[];
  description?: string;
  isOfficial: boolean;
  isAutomated: boolean;
}

/** MCPB (GitHub/GitLab releases) enrichment data */
export interface McpbEnrichment {
  releaseUrl: string;
  downloadCount: number;
  assetSize: number;
  lastRelease: string;
  platforms: string[];
  tagName: string;
  prerelease: boolean;
}

/** Combined enrichment data for a server */
export interface Enrichment {
  lastEnrichedAt: string;
  github?: GitHubEnrichment;
  npm?: NpmEnrichment;
  pypi?: PyPiEnrichment;
  nuget?: NuGetEnrichment;
  docker?: DockerEnrichment;
  mcpb?: McpbEnrichment;
}

// =============================================================================
// Application Types
// =============================================================================

/** Full server data stored in our data files */
export interface MCPServer {
  // Core MCP Registry data
  name: string;
  description: string;
  version: string;
  repository?: Repository;
  packages: Package[];
  remotes: Remote[];
  status: ServerStatus;
  publishedAt: string;
  updatedAt: string;
  isLatest: boolean;

  // Enriched metadata
  enrichment: Enrichment;

  // Computed fields for search/sort
  _computed: {
    organization: string;
    serverName: string;
    packageTypes: RegistryType[];
    hasRemote: boolean;
    totalDownloads: number;
    stars: number;
  };
}

/** Sync state persisted between runs */
export interface SyncState {
  lastSyncAt: string;
  lastCursor?: string;
  totalServers: number;
  lastFullSyncAt: string;
  version: number;
}

/** Sort options for the UI */
export type SortField =
  | "name"
  | "stars"
  | "downloads"
  | "updatedAt"
  | "publishedAt";
export type SortDirection = "asc" | "desc";

export interface SortOption {
  field: SortField;
  direction: SortDirection;
  label: string;
}

/** Filter state for the UI */
export interface FilterState {
  search: string;
  packageTypes: RegistryType[];
  hasRemote: boolean | null;
  status: ServerStatus[];
}

/** Pagination state */
export interface PaginationState {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

// =============================================================================
// API Client Types
// =============================================================================

/** Options for fetching servers from registry */
export interface FetchServersOptions {
  limit?: number;
  cursor?: string;
  updatedSince?: string;
}

/** Result of enriching a server */
export interface EnrichmentResult {
  serverName: string;
  success: boolean;
  enrichment?: Partial<Enrichment>;
  error?: string;
}

/** Enricher function signature */
export type EnricherFn = (
  server: MCPServer
) => Promise<Partial<Enrichment> | null>;
