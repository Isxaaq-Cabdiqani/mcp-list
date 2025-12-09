# MCP Server Directory

A searchable, filterable directory of Model Context Protocol (MCP) servers, sourced from the [official MCP Registry](https://registry.modelcontextprotocol.io).

## Features

- Browse all registered MCP servers
- Search by name, description, author, or keywords
- Filter by package type (npm, PyPI, NuGet, Docker, MCPB)
- Filter by remote availability
- Sort by stars, downloads, or date
- Enriched metadata from GitHub, npm, PyPI, NuGet, Docker Hub
- Dark mode support
- Mobile-responsive design
- Hourly automatic updates

## Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run sync to fetch data
npm run sync

# Build for production
npm run build
```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run sync` | Run incremental data sync |
| `npm run sync:full` | Run full data sync |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type checking |

## Architecture

### Data Flow

```
MCP Registry API (hourly)
        |
   Sync Script (GitHub Action)
        |
   Enrichment APIs (GitHub, npm, PyPI, NuGet, Docker Hub)
        |
   JSON Data Files (committed to repo)
        |
   Static Site Build (Vite)
        |
   GitHub Pages
```

### Project Structure

```
mcp-list/
├── .github/workflows/    # GitHub Actions
├── scripts/              # Data sync scripts
│   ├── enrichers/        # Metadata enrichers
│   ├── registry.ts       # MCP Registry client
│   ├── sync.ts           # Main sync orchestrator
│   └── types.ts          # Shared TypeScript types
├── src/                  # Frontend source
│   ├── components/       # UI components
│   ├── lib/              # Utility functions
│   ├── index.html        # Main HTML template
│   ├── main.ts           # App entry point
│   └── styles.css        # Tailwind styles
├── data/                 # Generated data files
└── public/               # Static assets
```

## Data Sources

| Source | Data Collected |
|--------|----------------|
| MCP Registry | Server name, description, version, packages, remotes |
| GitHub | Stars, forks, issues, topics, license, last commit |
| npm | Weekly/monthly downloads, version, dependencies |
| PyPI | Downloads, version, Python version requirement |
| NuGet | Total downloads, version, authors |
| Docker Hub | Pulls, stars, tags |
| MCPB | Release URL, download count, platforms |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT
