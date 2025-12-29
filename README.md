# Experiment Hub

A locally-hosted application to manage product experiments from idea to prototype. Each experiment follows a workflow: refine the idea, create a PRD, then build a prototype. Experiments can evolve into launched products (consumer or B2B).

## Features

- **Three Content Types**: Experiments, Prototypes, and Documentation with one-to-one relationships
- **Agent-Assisted Workflow**: Use `@experiment-creator`, `@prd-writer`, and `@prototype-builder` agents
- **Dark Mode Interface**: Developer tool aesthetic with VS Code/GitHub inspired design
- **Fast Search**: Real-time search across experiments, tags, and metadata
- **Read-Only Web Interface**: View and browse experiments, prototypes, and documentation
- **Local-First**: All data stored locally in JSON files, no external dependencies

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Install dependencies:

```bash
npm install
```

2. Start the development server:

```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
experiment-hub/
├── app/                    # Next.js app directory
│   ├── page.tsx            # Home page (Experiments list)
│   ├── prototypes/         # Prototypes page
│   ├── documentation/      # Documentation page
│   └── experiments/[id]/   # Experiment detail page
├── components/             # Reusable React components
│   ├── Sidebar.tsx
│   ├── ExperimentList.tsx
│   ├── SearchBar.tsx
│   └── StatusBadge.tsx
├── lib/                    # Utility functions
│   └── data.ts            # File system data access
├── types/                  # TypeScript type definitions
│   └── index.ts
├── data/                   # JSON metadata storage
│   ├── experiments.json
│   ├── prototypes.json
│   └── documentation.json
├── experiments/            # Experiment directories
└── agents/                # Agent instructions
```

## Usage

### Creating Experiments

Experiments are created using the agent framework, not through the web UI:

1. Use `@experiment-creator` to create a new experiment
2. Use `@prd-writer` to generate a PRD
3. Use `@prototype-builder` to set up prototype structure
4. View everything in the web interface

### Data Storage

- **Metadata**: Stored in `data/*.json` files
- **Experiments**: Stored in `experiments/{slug}/` directories
- **PRDs**: Stored in `experiments/{slug}/docs/PRD.md`
- **Prototypes**: Stored in `experiments/{slug}/prototype/`

## Development

### Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Architecture**: Server Components + Client Components

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Design System

The application uses a dark theme with colors inspired by VS Code and GitHub:

- **Background**: Dark grays (#0d1117, #161b22, #21262d)
- **Text**: Light grays (#c9d1d9, #8b949e, #6e7681)
- **Accent**: Blue (#58a6ff)
- **Status Colors**: Green (success), Yellow (warning), Red (error)

## Documentation

### Core Documentation
- **PRD.md** - Full product requirements document and implementation phases
- **agents/README.md** - Agent framework and workflow instructions
- **AGENT_ARCHITECTURE.md** - Agent architecture patterns (supplementary)

### Setup & Configuration
- **docs/PROTOTYPE_PORTS.md** - Port assignments for running prototypes
- **docs/SETUP_MCP_LOGGING.md** - MCP logging setup for Cursor IDE
- **docs/replit.md** - Replit deployment configuration

### Experiment Documentation
Each experiment has its own documentation in `experiments/{slug}/docs/`:
- `PRD.md` - Product Requirements Document
- `market-research.md` - Market analysis and TAM/SAM/SOM
- Additional analysis and review documents

## Roadmap

See `PRD.md` for the full product requirements document and implementation phases.

## License

ISC
