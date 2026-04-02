# Claude Code — project instructions

## GitHub workflow

- **Always create a PR** when a feature, fix, or test task is complete — never push directly to `main`.
- **Never merge the PR.** Open it and stop. Katy reviews CI checks and the Vercel preview before merging.
- **Branch naming:** `claude/<short-descriptor>` using kebab-case. The descriptor must reflect the actual work done in the session, not the conversation topic that kicked it off (e.g. `claude/bde-form-tests` not `claude/review-ad-campaign-abc123`).
- **One PR per logical unit of work.** Don't bundle unrelated changes.
- **PR description** must include: what changed, why, and a test plan (how to verify it works).

## Rules and skills

Rules live in `.cursor/rules/` and apply to both Cursor and Claude Code sessions.

- `commit-messages.mdc` — conventional commit format, imperative mood, 50-char subject
- `design-guidelines.mdc` — dark theme, spacing, component patterns for the hub UI

Skills live in `.claude/skills/` and are invocable via `/skill-name`.

- `user-communication.md` — audit and fix user-facing copy against content design standards
- `sitemap.md` — capture real browser screenshots of every route and render them as a visual sitemap tree in Figma

## Figma (when using Figma MCP)

Install the Figma plugin globally (`claude plugin install figma@claude-plugins-official`) for the MCP server and workflow skills. See `docs/FIGMA_SETUP.md` for full setup across all tools.

These rules are project-specific:

- **Map to our system** — Treat Figma MCP output as design reference, not final code. Use this project's design tokens (`tailwind.config.ts`), components (`components/`), and typography (Fraunces headings, Inter body). Validate for 1:1 visual parity with the Figma screenshot.
- **Reuse, don't duplicate** — Use existing design-system components. Do not add new icon packages if assets come from Figma. No hardcoded colors or spacing; use tokens from `tailwind.config.ts`.
- **Asset handling** — If the Figma MCP server returns a `localhost` source for an image or SVG, use that source directly. Do not create placeholders.
