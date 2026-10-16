# BHD Labs — Experiment Hub

A personal product lab where I build and validate ideas end-to-end: from raw concept through market research, PRD, landing page, and working prototype. The hub itself is also a product — a Next.js application deployed on Vercel that I've built alongside the experiments it tracks.

## Why I built this

As a neurodiverse designer and founder, my best ideas come fast and from everywhere. BHD Labs is how I focus on the highest impact and develop with rigor.

### What drives me

I build things I care deeply about, that serve a real market need, and that make a difference in the world. I make sure all three are true—plus a few extras—within a custom scoring system.

### Core themes

- **Empowering makers** — tools for people who create things with their hands
- **Environmental impact** — helping people and businesses make more sustainable choices
- **Supporting neurodiversity** — products designed for neurodiverse minds

### The scaffolding

The platform is built to keep me focused, motivated, and creatively energized — not to slow me down.

- **Scoring** makes prioritization intentional. Comparing ideas side-by-side means I choose what to build next based on evidence, not just momentum.
- **Heuristic reviews** capture design and product decisions in writing as I build. Returning to an experiment weeks later, I can immediately pick up the thread with all my thinking intact.
- **Pipeline visibility** shows exactly where each experiment stands. A clear picture of what's in progress makes it easy to dive back in with confidence.

## What's inside

### Experiments

The live list, with scores, is at [beckharrisdesign.com/bhd-labs](https://beckharrisdesign.com/bhd-labs).

| Experiment                | Tagline                                                    | Status     |
| ------------------------- | ---------------------------------------------------------- | ---------- |
| **Estate Sale Planner**   | The wave of stuff is coming.                               | Ideation   |
| **Best Day Ever**         | Plan online, execute on paper.                             | Validating |
| **Landing Zone**          | Drop. Everything.                                          | Validating |
| **Etsy Listing Kit**      | Generate a suite of listing artifacts from a single image. | Validating |
| **Experiment Hub**        | Experimentation scaffold for founders.                     | Dogfooding |
| **OpenSpec Visualizer**   | Telling the story of every spec.                           | Dogfooding |
| **PDF Organizer**         | AI-powered household CRM and document organization.        | Dogfooding |
| **Simple Seed Organizer** | Stash tracking for garden nerds.                           | Sunset     |
| **Stitch Check**          | Design where you want — digitize wherever.                 | Sunset     |
| **Micro Pomodoro**        | A super simple timer.                                      | Sunset     |
| **Etsy → Notion Sync**    | Super simple inventory management.                         | Sunset     |

### The infrastructure

The hub itself is what makes the experiments possible at scale. Running a new experiment means creating a Next.js page — the form submissions, analytics, and tracking are already wired up. No manual setup per experiment.

## How it works

### Experiment workflow

Each experiment moves through a structured pipeline, driven by AI agents in Cursor:

```
Raw idea
  → @experiment-creator   — refines concept, creates directory + metadata
  → @market-research      — TAM/SAM/SOM analysis, bottom-up methodology, scoring
  → @prd-writer           — lean PRD (outcomes + failing tests); design review when UI-heavy
  → @prototype-builder    — generates code structure and initial implementation
  → Landing page in hub   — validates demand before full build
```

Every agent includes explicit approval checkpoints — nothing gets committed without review. The agents enforce a bottom-up market sizing methodology: competitor revenue anchors, real-world signals, explicit assumptions.

### Form submission infrastructure

Landing pages live directly in the Next.js app. Form submissions post to a single Supabase table (`experiment_submissions`) with an `experiment` field tagging each row. Adding a new landing page means adding a Next.js page — no new databases, no infrastructure changes, no manual steps.

### Testing

```bash
npm test          # 173 unit tests — mocked, no secrets, runs on every PR
npm run test:live # Live Supabase integration — runs on push to main only
```

Two vitest configs keep them cleanly separated. Unit tests run in CI on every pull request (via branch protection). Live integration tests run post-merge on main using GitHub Actions secrets.

### Screenshot sitemap (Figma prep)

Generate a screenshot thumbnail sitemap of the deployed hub:

```bash
npm run sitemap:capture -- --base-url https://YOUR_MAIN_DEPLOYMENT_URL
```

Outputs go to `artifacts/site-map/latest/` by default (`site-map.json`,
`site-map-figma.csv`, screenshots, and an HTML index). Full workflow and
rate-limit-friendly options are in `docs/SITEMAP_SCREENSHOT_WORKFLOW.md`.

Prefer web-based execution? Use the manual GitHub Actions workflow
**Sitemap Screenshot Capture** (Actions tab) and download the generated artifact.

## Tech stack

|               |                                        |
| ------------- | -------------------------------------- |
| **Framework** | Next.js 15 (App Router)                |
| **Language**  | TypeScript                             |
| **Styling**   | Tailwind CSS with custom design tokens |
| **Database**  | Supabase (form submissions)            |
| **Testing**   | Vitest + React Testing Library         |
| **CI/CD**     | GitHub Actions + Vercel                |
| **Fonts**     | Fraunces (headings) · Inter (body)     |

### Design system

Dark green palette (`#194b31`, `#113723`) with mint accents (`#cff7d3`, `#78ffb7`). The visual language is builder-focused — inspired by VS Code and Linear — because this is a tool I use every day, not a marketing site.

## Getting started

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

This repo uses **pnpm** (`packageManager: pnpm@10.33.0`), and `pnpm-lock.yaml` is
the lockfile CI installs from. Installing with `npm` builds a different tree from
the stale `package-lock.json` and is a known source of phantom failures.

**Optional — Supabase form submissions:** Copy `.env.example` to `.env.local` and set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Run the SQL in `.env.example` to create the `experiment_submissions` table. On Vercel, add the same vars to the project's environment variables.

### Snap Issue (Chrome extension)

**Snap Issue** is a personal Chrome extension (MV3) for drawing a viewport rectangle, capturing it, and opening a GitHub issue. It lives in `experiments/snap-issue/extension/`. In Chrome open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select that folder. [Full install, shortcuts, PAT, and permissions →](experiments/snap-issue/extension/README.md)

## Project structure

```
experiment-hub/
├── app/                        # Next.js pages and API routes
│   ├── page.tsx                # Home (experiment list)
│   ├── experiments/[slug]/     # Experiment detail pages
│   ├── api/landing-submission/ # Form submission endpoint → Supabase
│   └── landing/                # Experiment landing pages (one per experiment)
├── agents/                     # AI agent instructions for the experiment workflow
├── components/                 # Shared UI components
├── data/                       # experiments.json, prototypes.json
├── experiments/{slug}/         # Per-experiment docs, prototypes, notes
│   ├── docs/PRD.md
│   ├── docs/market-research.md
│   └── prototype/
├── lib/
│   ├── data.ts                 # File system data access
│   └── supabase.ts             # Lazy-initialized Supabase client
├── tests/
│   ├── api/                    # Unit + live integration tests
│   └── landing/                # Landing page tests
└── .github/workflows/ci.yml    # Unit tests on PR, live tests on main
```

## Scoring methodology

Each experiment gets three impact scores, from 1 to 5:

- **Personal impact** — would I use this?
- **Social impact** — does the world need this?
- **Business impact** — would the market pay, and could this win?

The final score is their sum, from 3 to 15. Older experiments scored under the earlier five-dimension rubric keep their historical 5–25 totals.

## Documentation

- `PRD.md` — Product requirements for the hub itself
- `agents/README.md` — Full agent workflow with approval gates
- `AGENT_ARCHITECTURE.md` — Patterns for extending the agent system
- `.env.example` — Environment variable reference with Supabase table SQL
