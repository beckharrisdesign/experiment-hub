# Cursor global rules, skills, and hooks

This folder is the **source of truth** for your cross-workspace Cursor setup. Use it to keep global rules, hook templates, and skill references in version control. Project-specific rules stay in each repo (e.g. `.cursor/rules/*.mdc`).

## 1. Global rules (paste into Cursor)

- **Where Cursor reads them:** Settings → General → **Rules for AI** (app setting, not a file).
- **What to do:** Copy the contents of `rules.md` into that text area. Update `rules.md` here when you change your global rules, then paste again.

## 2. Global skills (live in your home dir)

- **Where Cursor reads them:** `~/.cursor/skills/` (user-level; applies to all projects).
- **Scaffolded for you:** Two skills were created under `~/.cursor/skills/`:
  - **test-first** — Run tests first, then write code to make them pass
  - **site-health** — Check URL is accessible, resolves, and loads in &lt; 1s (for live site evaluation)
- **To add a skill:** Create `~/.cursor/skills/<skill-name>/SKILL.md` with YAML frontmatter (`name`, `description`) and instructions. See [Cursor Skills docs](https://cursor.com/docs/context/skills).

## 3. Global hooks (optional)

- **Where Cursor reads them:** `~/.cursor/hooks.json` (user-level; applies to all projects).
- **Scaffolded for you:** An empty `~/.cursor/hooks.json` was created with standard hook keys (`beforeShellExecution`, `afterShellExecution`, `afterFileEdit`, `beforeSubmitPrompt`, `stop`). Add command arrays as needed.
- **Reference:** Use `hooks-template.json` in this folder as a copy source. Exit code `2` from a hook blocks the action. See [Cursor Hooks docs](https://cursor.com/docs/agent/hooks).

## Linking project-specific rules

In any project, add or edit `.cursor/rules/*.mdc` for rules that apply only there. Cursor merges:

1. Team rules (if any)
2. Project rules (`.cursor/rules/`)
3. User rules (Settings → Rules for AI)
4. Legacy `.cursorrules` in project root

So: keep **global** principles in Settings (from `rules.md`) and **project**-specific details in that repo’s `.cursor/rules/`.
