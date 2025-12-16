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
│       ├── landing/      # Landing page for validation (standalone Next.js app)
│       └── prototype/    # Experiment prototype code
├── lib/                   # Utility functions and data helpers
│   └── landing-page/     # Landing page types and template docs
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

## Experiment Workflow

The experiment workflow follows these stages:
1. **Market Research** - TAM/SAM/SOM analysis and scoring across 5 dimensions
2. **PRD** - Product Requirements Document with Validation Plan section
3. **Landing Page** - Ad-validated landing pages to capture interest before prototype
4. **Prototype** - Working prototype implementation

## Notion Integration

Landing page submissions are stored in a shared Notion database with these fields:
- Experiment (select), Email, Opted In (checkbox), Opt-Out Reason, Source (select), Notes, Timestamp

The NOTION_LANDING_DATABASE_ID environment variable must be set to the Notion database ID.

## Recent Changes

- 2024-12-16: Restructured landing page architecture
  - Moved Simple Seed Organizer landing page from prototype/ to landing/
  - Landing pages now submit to centralized /api/landing-submission endpoint
  - Created lib/landing-page/ with types and template documentation
  - Landing pages are standalone Next.js apps for independent deployment

- 2024-12-16: Added Landing Page validation workflow step
  - New ValidationStatus and ValidationLandingPage types
  - Landing Page column on dashboard with status indicators
  - API endpoint for landing page submissions to Notion
  - PRD writer agent updated with Validation Plan section
  - Landing Page tab on experiment detail pages
  - Fixed Notion client authentication with proper error handling

- 2024-12-14: Initial Replit import and configuration
  - Configured Next.js to allow Replit dev origins
  - Set up workflow for port 5000
  - Configured autoscale deployment
