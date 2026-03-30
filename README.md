# BHD Labs — Experiment Hub

A personal product lab where I build and validate ideas end-to-end: from raw concept through market research, PRD, landing page, and working prototype. The hub itself is also a product — a Next.js application deployed on Vercel that I've built alongside the experiments it tracks.

## Why I built this

I'm a neurodiverse founder. My best ideas come fast and from everywhere, but without structure they scatter. I needed a system that was intuitive where it needs to be and disciplined where it needs to be — something that would help me figure out *which* ideas are worth building before I spend months on them.

The experiments I choose to pursue share three themes:
- **Empowering makers** — tools for people who create things with their hands
- **Supporting neurodiversity** — products designed for how divergent minds actually work
- **Facilitating environmental impact** — helping people make more sustainable choices

An idea only makes the cut if it sits at the intersection of something I'm personally passionate about, something with a real market need, and something that makes a difference in the world.

## What's inside

### Active experiments

| Experiment | What it does |
|---|---|
| **Best Day Ever** | Translates your digital calendar into a printable daily plan — for the people who think better on paper |
| **Simple Seed Organizer** | Scan your seed packets with AI and get an organized garden plan |
| **Etsy Patternator** | One design file, all the Etsy listing assets — built for embroidery sellers |

### The infrastructure

The hub itself is what makes the experiments possible at scale. Running a new experiment means creating a Next.js page — the form submissions, analytics, and tracking are already wired up. No manual setup per experiment.

## How it works

### Experiment workflow

Each experiment moves through a structured pipeline, driven by AI agents in Cursor:

```
Raw idea
  → @experiment-creator   — refines concept, creates directory + metadata
  → @market-research      — TAM/SAM/SOM analysis, bottom-up methodology, scoring
  → @prd-writer           — product requirements with design review built in
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

## Tech stack

| | |
|---|---|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS with custom design tokens |
| **Database** | Supabase (form submissions) |
| **Testing** | Vitest + React Testing Library |
| **CI/CD** | GitHub Actions + Vercel |
| **Fonts** | Fraunces (headings) · Inter (body) |

### Design system

Dark green palette (`#194b31`, `#113723`) with mint accents (`#cff7d3`, `#78ffb7`). The visual language is builder-focused — inspired by VS Code and Linear — because this is a tool I use every day, not a marketing site.

## Getting started

```bash
npm install
npm run dev       # http://localhost:3000
```

**Optional — Supabase form submissions:** Copy `.env.example` to `.env.local` and set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Run the SQL in `.env.example` to create the `experiment_submissions` table. On Vercel, add the same vars to the project's environment variables.

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

Each experiment is scored across five dimensions after market research:

- **Business opportunity** — TAM/SAM/SOM, competitive landscape, monetization path
- **Personal impact** — alignment with my skills and domain knowledge
- **Competitive advantage** — what makes this defensible
- **Platform cost** — infrastructure complexity and cost to operate
- **Social impact** — alignment with my three core themes

Scores are generated by the `@market-research` agent using bottom-up methodology — not gut feel, not top-down industry reports.

## Documentation

- `PRD.md` — Product requirements for the hub itself
- `agents/README.md` — Full agent workflow with approval gates
- `AGENT_ARCHITECTURE.md` — Patterns for extending the agent system
- `.env.example` — Environment variable reference with Supabase table SQL
