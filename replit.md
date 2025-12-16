# Experiment Hub

A Next.js application for managing and tracking product experiments with prototypes.

## Overview

This is an "Experiment Hub" that allows you to:
- View and manage experiments
- Track experiment prototypes
- Access documentation and workflows

## Project Structure

```
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes for prototype management
│   ├── documentation/     # Documentation page
│   ├── experiments/       # Experiment detail pages
│   ├── prototypes/        # Prototypes listing
│   └── workflow/          # Workflow page
├── agents/                # AI agent configuration files
├── components/            # React components
├── data/                  # Data files
├── experiments/           # Individual experiment folders
│   └── [experiment-name]/
│       ├── docs/         # Experiment documentation
│       ├── notes/        # Development notes
│       └── prototype/    # Experiment prototype code
├── lib/                   # Utility functions and data helpers
├── scripts/              # Setup and utility scripts
└── types/                # TypeScript type definitions
```

## Technology Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Runtime**: Node.js 22

## Development

The application runs on port 5000 in development mode with `npm run dev`.

## Deployment

The application is configured for autoscale deployment:
- Build: `npm run build`
- Start: `npm run start`

## Recent Changes

- 2024-12-14: Initial Replit import and configuration
  - Configured Next.js to allow Replit dev origins
  - Set up workflow for port 5000
  - Configured autoscale deployment
