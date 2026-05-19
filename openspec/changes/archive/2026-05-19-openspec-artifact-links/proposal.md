## Human anchor

> `/openspec-propose a way to make sure that when I call my openspec flow, regardless of schema, it always shows me a link to the artifacts produced so I can open them easily`

## Outcomes

- **Who:** Solo founder running OpenSpec via Cursor (`/opsx:propose`, `/opsx:apply`, `/opsx:archive`, `/opsx:explore`) across lite, full hub, and quickstart schemas.
- **Job:** Finish an opsx turn and immediately open the files that were created or updated—without hunting under `openspec/changes/<name>/` or guessing paths from `outputPath` globs.
- **Done when:** Every opsx skill and slash command ends with a short **Artifacts** block listing clickable paths for each file touched that turn (and, on completion summaries, for all artifacts in the change), derived from CLI output (`openspec status --json`, `openspec instructions … --json`, `openspec instructions apply --json`) so behavior is schema-agnostic.
- **Not doing:** Changing OpenSpec artifact templates or schema definitions; redesigning the propose/apply workflow; adding a custom IDE panel or web UI.

## Why

Today, agents report “Created proposal” in prose but often omit file paths, or list relative paths that are not one-click openable in Cursor. That friction compounds across four commands and three schemas. The CLI already knows `outputPath` and `contextFiles`; surfacing them consistently in agent output is low cost and high leverage for review and approval gates (especially lite’s one-artifact-per-turn flow).

## What changes

- Add a shared **artifact link formatter** convention (documented in skills/commands): after each artifact write or apply session, emit markdown links using workspace-absolute or repo-root-relative paths Cursor recognizes.
- Update all four opsx entry points (`.cursor/commands/opsx-*.md`, `skills/openspec-*.md`, mirrored `.claude/skills/` if synced) with mandatory **Output → Artifacts** sections that reference CLI JSON fields, not hardcoded filenames.
- Optionally add a tiny helper script (e.g. `scripts/openspec-artifact-links.mjs`) that prints links from `openspec status --change <name> --json` for agents to paste—only if duplication across skills becomes unmaintainable.
- Document the pattern in `openspec/README.md` and `.cursor/rules/openspec-workflow.mdc` so future schema overrides stay covered.

## Capabilities

### New Capabilities

- `openspec-workflow-artifact-links`: Hub agent workflow SHALL list clickable file paths for every artifact file created or updated during an opsx command, and SHALL derive paths from OpenSpec CLI JSON (`outputPath`, resolved spec globs, `contextFiles`) so the same rule applies to `experiment-hub-lite`, `experiment-hub`, and `quickstart`.

### Modified Capabilities

_(none — hub workflow only, not product runtime)_

## Impact

- **Skills/commands:** `.cursor/commands/opsx-propose.md`, `opsx-apply.md`, `opsx-archive.md`, `opsx-explore.md`; `skills/openspec-propose.md`, `openspec-apply-change.md`, `openspec-archive-change.md`, `openspec-explore.md`; Claude mirrors under `.claude/skills/` and `.claude/commands/` when present.
- **Docs:** `openspec/README.md`, `.cursor/rules/openspec-workflow.mdc`.
- **Optional tooling:** `scripts/openspec-artifact-links.mjs` (thin CLI wrapper).
- **Risk:** Low — documentation and agent instructions only; no app routes or data model changes.

## Optional links

- OpenSpec config: `openspec/config.yaml`
- Workflow rule: `.cursor/rules/openspec-workflow.mdc`
