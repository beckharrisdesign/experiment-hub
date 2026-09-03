---
description:
alwaysApply: false
---

# Claude Code — project instructions

> Substantive rules live in `rules/` (Cursor loads them via `.cursor/rules/` symlink).
> Skills live in `skills/` (Claude loads via `.claude/skills/` symlink).
> **Edit `rules/` and `skills/` only.** This file is an index. Do not duplicate rule content here.

After clone: `bash scripts/link-agent-dirs.sh` — links `rules/` and `skills/` into
the IDE paths, and points every worktree's `.env.local` at the one canonical file
in the main checkout.

## Secrets

One file: `.env.local` in the main checkout. Worktrees symlink to it
(`scripts/link-worktree-env.sh`, run automatically by the SessionStart hook), so
a key added once is available everywhere and survives a worktree being recycled.

`.env.example` is the registry — every key that exists, with its provenance, and
no values. **Check it before hunting for a credential**; the answer is usually
that you already have one.

## Rules

**Always-applied (no file trigger):**

- `rules/principles.mdc` — UX/DX balance, test-first, log capture, solo founder practices
- `rules/github-workflow.mdc` — branching, PR process, never-merge rule
- `rules/figma.mdc` — Figma MCP setup and project-specific design rules

**File-triggered (auto-apply by glob pattern):**

- `rules/commit-messages.mdc` — conventional commit format
- `rules/design-guidelines.mdc` — dark theme, spacing, component patterns
- `rules/component-conventions.mdc` — React component conventions
- `rules/nextjs-api-routes.mdc` — API route conventions
- `rules/vitest-conventions.mdc` — test conventions
- `rules/prd-template.mdc` — experiment PRD format
- `rules/market-research-template.mdc` — market research format
- `rules/scoring-criteria.mdc` — experiment scoring rubric (market research, experiments.json)
- `rules/openspec-workflow.mdc` — OpenSpec vs experiment PRDs
- `rules/bhd-experiment.mdc` — BHD schema phase artifacts (file-triggered)

## Skills

Invocable via `/skill-name`. **Edit only `skills/`** (and `skills/figma/` for vendored Figma skills).
Each skill is a directory: `skills/<name>/SKILL.md` — the layout Claude Code's skill loader
discovers (flat `skills/<name>.md` files are ignored).

- OpenSpec: `skills/openspec-*/SKILL.md` — see `openspec/README.md`
- Figma: `npm run skills:sync` → `skills/figma/`
- Triage: `skills/issue-triage/SKILL.md` — P0–P4 rubric, light retitling, cluster identification across open issues
- Linked repos: `skills/linked-repo-session/SKILL.md` — GitHub MCP is the standard access path for linked-repo code from hub sessions; primer format; opt-in local clones

## Hooks (Claude Code only)

Hooks run via `.claude/hooks/` — config in `.claude/settings.json`.
