# Claude Code — project instructions

> Substantive rules live in `.cursor/rules/` — both Cursor and Claude Code load them automatically.
> **Edit rules there.** This file is an index only. Do not duplicate rule content here.

## Rules

**Always-applied (no file trigger):**

- `principles.mdc` — UX/DX balance, test-first, log capture, solo founder practices
- `github-workflow.mdc` — branching (tool/harness prefix + descriptor), PR process, never-merge rule
- `figma.mdc` — Figma MCP setup and project-specific design rules

**File-triggered (auto-apply by glob pattern):**

- `commit-messages.mdc` — conventional commit format
- `design-guidelines.mdc` — dark theme, spacing, component patterns
- `component-conventions.mdc` — React component conventions (`components/`, `app/**/*.tsx`)
- `nextjs-api-routes.mdc` — API route conventions (`app/api/**/route.ts`)
- `vitest-conventions.mdc` — test conventions (`*.test.ts`, `*.test.tsx`)
- `prd-template.mdc` — experiment PRD format (`experiments/*/docs/PRD.md`)
- `market-research-template.mdc` — market research format (`experiments/*/docs/market-research.md`)

## Skills (Claude Code only)

Invocable via `/skill-name`. Source files live in `skills/` (centralized) and `.claude/skills/` (hub-specific). The session-start hook copies `skills/**/*.md` into `.claude/skills/` automatically.

**Centralized (`skills/`)** — shared across projects, add new skills here:

- `/experiment-creator` — refine idea, create experiment directory + metadata
- `/market-research` — TAM/SAM/SOM analysis, scoring, go/no-go recommendation
- `/business-case-writer` — focused business case (GO/NO-GO), interview workflow, `docs/business-case.md`
- `/prd-writer` — lean PRD from business case: outcomes + failing tests first; design-advisor when UI-heavy
- `/prototype-builder` — propose stack, generate code, invoke design-advisor
- `/design-advisor` — design review of PRD, code, or live URL
- `/user-communication` — audit user-facing copy against content design standards
- `/sitemap` — **rare**; full screenshot pass + Figma sitemap board (only when the user requests or IA/routes require refreshing that board; not for routine work)

**Fetched from `github.com/figma/mcp-server-guide`** — run `npm run skills:sync` to pull, then commit. Vendored in `skills/figma/`:

- `/figma-use` — execute Figma Plugin API (required before all write operations)
- `/figma-implement-design` — Figma URL → code using project tokens and components
- `/figma-generate-design` — build full screens in Figma using the design system
- `/figma-generate-library` — generate a complete design system in Figma from the codebase
- `/figma-code-connect` — map Figma components to code (Org/Enterprise only)
- `/figma-create-design-system-rules` — generate project-level Figma rules for Claude/Cursor
- `/figma-create-new-file` — create a new Figma design or FigJam file

## Hooks (Claude Code only)

Hooks run automatically via `.claude/hooks/` — config in `.claude/settings.json`:
`SessionStart`, `PreToolUse`, `PostToolUse`, `Stop`, `PostCompact`, `TaskCompleted`
