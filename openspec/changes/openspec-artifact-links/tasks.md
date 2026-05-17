## 1. User outcomes (from spec scenarios)

- [x] 1.1 After `/opsx:propose` writes an artifact, I can click a link in the agent reply to open that file immediately (e.g. `proposal.md` on the first propose turn).
- [x] 1.2 After `/opsx:apply`, the agent summary links every context file it used (e.g. `proposal.md`, `tasks.md`) so I do not hunt under the change folder.
- [x] 1.3 After `/opsx:archive`, the agent reply links the archived change folder under `openspec/changes/archive/`.
- [x] 1.4 When propose finishes all lite artifacts for a change, the completion summary links every artifact file—not only the last one written.
- [x] 1.5 Instructions for opsx commands tell agents to build the **Artifacts** block from CLI JSON so a `quickstart` change is covered without a hardcoded lite filename list.

## 2. Prototype shell

- [x] 2.1 N/A — workflow/docs only; no experiment prototype.

## 3. Implementation

- [x] 3.1 Add shared **Artifacts output** rules to `skills/openspec-propose.md`, `skills/openspec-apply-change.md`, `skills/openspec-archive-change.md`, and `skills/openspec-explore.md` (path resolution per `design.md`).
- [x] 3.2 Mirror the same mandatory **Artifacts** sections in `.cursor/commands/opsx-propose.md`, `opsx-apply.md`, `opsx-archive.md`, and `opsx-explore.md`.
- [x] 3.3 Sync Claude copies under `.claude/skills/` and `.claude/commands/` (or run the existing session hook sync if that is the project norm).
- [x] 3.4 Document the convention in `openspec/README.md` and `.cursor/rules/openspec-workflow.mdc`.
- [x] 3.5 (Optional) Add `scripts/openspec-artifact-links.mjs` if glob/dedupe logic is duplicated—skip if skills stay DRY without it.

## 4. QA

- [x] 4.1 Manual walkthrough: run a dry `/opsx:propose` turn on a throwaway change (or review a saved agent transcript) and confirm each scenario 1.1–1.5 has a clear **Artifacts** example in the updated skill text.
- [x] 4.2 Smoke: `npx @fission-ai/openspec status --change openspec-artifact-links` reports all artifacts done; spot-check that `openspec instructions apply --json` `contextFiles` paths match the documented normalization to repo-relative links.
