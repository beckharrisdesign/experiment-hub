---
name: openspec-artifacts-output
description: Shared rules for ## Artifacts markdown links at the end of every /opsx:* turn. Loaded by openspec-propose, apply, archive, and explore skills.
---

# OpenSpec Artifacts output (shared)

Every opsx agent response that **creates, updates, or moves** files under `openspec/changes/` MUST end with a clickable **Artifacts** block. Applies to all schemas (`experiment-hub-lite`, `experiment-hub`, `quickstart`, `spec-driven`).

## Format

Use H2 `## Artifacts` and one bullet per file:

```markdown
## Artifacts

- [proposal.md](openspec/changes/<name>/proposal.md)
- [spec.md](openspec/changes/<name>/specs/<capability>/spec.md)
```

- **Label:** basename of the file (or folder name for archive targets).
- **Target:** repo-relative path from workspace root (not absolute paths from CLI JSON).

## Path resolution (schema-agnostic)

Derive paths from OpenSpec CLI JSON. Do **not** use a fixed lite filename table as the only source of truth.

| When                                        | CLI command                                                  | Resolution                                                                                               |
| ------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| After writing an artifact                   | `openspec instructions <artifact-id> --change <name> --json` | `changeDir` + `outputPath`; if `outputPath` contains `**`, glob under `changeDir` (e.g. `specs/**/*.md`) |
| Apply session                               | `openspec instructions apply --change <name> --json`         | Union of all paths in `contextFiles`; plus any task file path edited this session                        |
| Milestone (all artifacts or all tasks done) | `openspec status --change <name> --json`                     | For each artifact with `status: "done"`, resolve as above; dedupe paths                                  |
| Archive                                     | After `mv`                                                   | `openspec/changes/archive/YYYY-MM-DD-<name>/` (directory link is fine)                                   |

**Normalize:** Strip the workspace root from absolute paths in `contextFiles` before emitting links.

## Per-turn vs milestone

- **Per-turn:** List only files created or updated in the current agent response.
- **Milestone:** When every ID in `applyRequires` is `done`, or all tasks are `[x]`, list **every** artifact file for the change (re-run status JSON). Dedupe if you also listed per-turn paths.

## Command-specific

| Command         | Emit Artifacts when                                                                                                    |
| --------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `/opsx:propose` | After each artifact write; full list on propose completion                                                             |
| `/opsx:apply`   | Opening summary (context files) and after edits to `tasks.md` or other change files; full list when all tasks complete |
| `/opsx:archive` | After move to `openspec/changes/archive/…`                                                                             |
| `/opsx:explore` | Only when explore creates or updates files under `openspec/changes/` (skip on read-only thinking turns)                |
