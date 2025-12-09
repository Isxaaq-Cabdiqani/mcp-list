# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

MCP Server Directory is a searchable, filterable directory of Model Context Protocol (MCP) servers. The application fetches server data from the official MCP Registry, enriches it with metadata from multiple package registries and version control systems, and presents it as a static website built with Vite.

**Tech Stack:**
- Frontend: Vanilla TypeScript + Vite + Tailwind CSS
- Backend: Node.js 20+ data sync scripts (TypeScript)
- Deployment: GitHub Pages with automated hourly updates

## Essential Commands

```bash
# Development
npm run dev              # Start Vite dev server (http://localhost:5173)
npm run build            # Build for production (TypeScript compile + Vite build)
npm run preview          # Preview production build locally

# Data Synchronization
npm run sync             # Incremental sync (only fetch updated servers)
npm run sync:full        # Full sync (FULL_SYNC=true - re-enriches all servers)

# Code Quality
npm run lint             # Run ESLint
npm run typecheck        # Run TypeScript type checking (no emit)
```

**Important:** The sync scripts take 15-20 minutes to complete. They run with concurrency=2 and 200ms delays to avoid API rate limits.

## Architecture

### Data Flow Pipeline

```
MCP Registry API
    ↓ (fetch via scripts/registry.ts)
Enrichment Layer (scripts/enrichers/)
    ├─ GitHub API    → stars, forks, topics, license, last commit
    ├─ npm Registry  → weekly/monthly downloads, dependencies
    ├─ PyPI API      → downloads, Python version requirements
    ├─ NuGet API     → total downloads, version, authors
    ├─ Docker Hub    → pulls, stars, tags
    └─ MCPB Releases → GitHub/GitLab releases, platform info
    ↓
data/servers.json (committed to repo)
    ↓
Vite Static Site Build
    ↓
GitHub Pages (deployed via .github/workflows/deploy.yml)
```

### Key Architectural Patterns

**1. Sync Orchestration (`scripts/sync.ts`)**
- Manages incremental vs. full sync logic
- Incremental: Fetches only servers updated since last sync (tracked in `data/sync-state.json`)
- Full sync: Forced every 7 days OR via `FULL_SYNC=true` env var
- Updates are merged with existing data to preserve enrichments

**2. Enrichment System (`scripts/enrichers/index.ts`)**
- Each enricher is independent and optional (failures don't block others)
- Runs with concurrency control (default: 3 parallel enrichments)
- Rate limiting: 100ms delay between enrichers, 200ms between batches
- Enrichment freshness: Skips re-enrichment if data < 24 hours old (configurable)

**3. Retry Logic (`scripts/utils/fetch.ts`)**
- Progressive timeouts: 10s → 20s → 30s across retry attempts
- Exponential backoff: 1s → 2s → 3s delays between retries
- Smart error detection: Only retries network/timeout errors (not 404s, auth errors)
- Used by npm enricher to handle transient network issues

**4. Type Safety (`scripts/types.ts`)**
- Centralized type definitions for MCP Registry schema and enrichment data
- All data structures strongly typed throughout the pipeline
- Type guards used for registry entry validation

### Critical Files

**Sync Pipeline:**
- `scripts/sync.ts` - Main orchestrator (incremental/full sync logic)
- `scripts/registry.ts` - MCP Registry API client
- `scripts/enrichers/index.ts` - Enrichment coordinator with rate limiting
- `scripts/enrichers/{github,npm,pypi,nuget,docker,mcpb}.ts` - Individual enrichers
- `scripts/utils/fetch.ts` - Retry wrapper for fetch (network resilience)

**Frontend:**
- `src/main.ts` - App entry point, search/filter logic
- `src/components/` - UI components (cards, filters, search)
- `data/servers.json` - Generated data file (DO NOT EDIT MANUALLY)

**Configuration:**
- `tsconfig.json` - TypeScript config with path aliases (`@/*`, `@scripts/*`)
- `vite.config.ts` - Vite build configuration
- `.github/workflows/sync.yml` - Hourly automated sync
- `.github/workflows/deploy.yml` - Deploy to GitHub Pages on push

## Working with Enrichers

### Adding a New Enricher

1. Create `scripts/enrichers/new-source.ts` following this pattern:

```typescript
export async function enrichNewSource(
  server: MCPServer
): Promise<{ newSource: NewSourceEnrichment } | null> {
  // 1. Find relevant package/identifier from server.packages
  // 2. Fetch data from external API
  // 3. Return enrichment data or null if not applicable
}
```

2. Add enrichment type to `scripts/types.ts`:

```typescript
export interface NewSourceEnrichment {
  // Add fields here
}

export interface Enrichment {
  // ... existing fields
  newSource?: NewSourceEnrichment;
}
```

3. Register in `scripts/enrichers/index.ts`:

```typescript
const enrichers = [
  // ... existing enrichers
  { name: "NewSource", fn: enrichNewSource },
];
```

### Enricher Best Practices

- **Always check for null/undefined** before accessing nested properties (e.g., `packageData?.["dist-tags"]?.latest`)
- **Use `fetchWithRetry()`** from `scripts/utils/fetch.ts` for network calls (handles timeouts)
- **Log fetching activity** with consistent format: `console.log(\`[SourceName] Fetching: ${identifier}\`)`
- **Handle 404s gracefully** - these are expected (packages may not exist in all registries)
- **Return null on errors** - don't throw (enrichment failures should not block sync)

## Debugging Sync Issues

### Common Issues

**npm "Cannot read properties of undefined" errors:**
- Caused by packages missing `dist-tags` or `dist-tags.latest`
- Fixed in `scripts/enrichers/npm.ts` with defensive null checks

**Timeout errors (ConnectTimeoutError):**
- Fixed via `fetchWithRetry()` utility with progressive timeouts
- If persistent, increase base timeout (default: 10s per attempt)

**404 errors (expected):**
- NuGet, GitHub repos, or packages that don't exist
- These are logged but don't cause sync failures

### Debugging Commands

```bash
# Run sync with verbose output
npm run sync:full 2>&1 | tee sync.log

# Check only errors/warnings
grep -i "error\|warn\|fail" sync.log

# Monitor specific enricher
grep "\[npm\]" sync.log
```

## Data Schema Notes

**Package Types (RegistryType):**
- `npm` - Node.js packages
- `pypi` - Python packages
- `nuget` - .NET packages
- `oci` - Docker images (Docker Hub)
- `mcpb` - Model Context Protocol Build (GitHub/GitLab releases)

**Transport Types:**
- `streamable-http` - HTTP-based streaming transport
- `sse` - Server-Sent Events transport

**Server Status:**
- `active` - Currently maintained
- `deprecated` - No longer maintained but still accessible
- `deleted` - Removed from registry

## GitHub Actions

**Automated Workflows:**
- `.github/workflows/sync.yml` - Runs `npm run sync` hourly, commits data changes
- `.github/workflows/deploy.yml` - Builds and deploys to GitHub Pages on main branch pushes

**Required Secrets:**
- `GITHUB_TOKEN` - Automatically provided by GitHub Actions (used for API calls)

## Frontend Development

The frontend is intentionally simple - vanilla TypeScript without frameworks. Search and filtering are implemented client-side using the preloaded `servers.json` data.

**Key Frontend Files:**
- `src/main.ts` - Handles search, filtering, sorting logic
- `src/components/` - UI rendering functions
- `src/lib/` - Utility functions (debounce, formatting, etc.)

**Styling:**
- Tailwind CSS with custom theme
- Dark mode via `class="dark"` toggle
- Mobile-responsive breakpoints

## Important Notes

- **Never edit `data/servers.json` manually** - it's generated by sync scripts
- **Sync takes 15-20 minutes** - be patient during full syncs
- **404s are expected** - many packages/repos referenced in registry don't exist
- **Rate limiting is critical** - don't reduce delays without testing
- **Enrichment errors don't block sync** - partial enrichment is acceptable
