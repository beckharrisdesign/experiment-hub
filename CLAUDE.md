# Claude Code — project instructions

> Substantive rules live in `.cursor/rules/` — both Cursor and Claude Code load them automatically.
> **Edit rules there.** This file is an index only. Do not duplicate rule content here.

## Rules

**Always-applied (no file trigger):**
- `principles.mdc` — UX/DX balance, test-first, log capture, solo founder practices
- `github-workflow.mdc` — branching, PR process, never-merge rule
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
- `/user-communication` — audit user-facing copy against content design standards
- `figma/` — Figma workflow skills (add here as they're built)

**Hub-specific (`.claude/skills/`)** — committed directly, not shared:
- `/sitemap` — screenshot every route and render a visual sitemap tree in Figma

## Hooks (Claude Code only)

Hooks run automatically via `.claude/hooks/` — config in `.claude/settings.json`:
`SessionStart`, `PreToolUse`, `PostToolUse`, `Stop`, `PostCompact`, `TaskCompleted`
