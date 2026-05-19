## Outcomes

- **Who:** Solo founder running OpenSpec via Cursor (`/opsx:propose`, `/opsx:apply`, `/opsx:archive`, `/opsx:explore`) across lite, full hub, and quickstart schemas.
- **Job:** Finish an opsx turn and immediately open the files that were created or updated—without hunting under `openspec/changes/<name>/` or guessing paths from `outputPath` globs.
- **Done when:** Every opsx skill and slash command ends with a short **Artifacts** block listing clickable paths for each file touched that turn (and, on completion summaries, for all artifacts in the change), derived from CLI output so behavior is schema-agnostic.
- **Not doing:** Changing OpenSpec artifact templates or schema definitions; redesigning the propose/apply workflow; adding a custom IDE panel or web UI.

## ADDED Requirements

### Requirement: Propose ends each turn with clickable artifact paths

After creating or updating an OpenSpec artifact during `/opsx:propose`, the agent response SHALL include an **Artifacts** section with one markdown link per file written that turn.

**Fails until:** A propose run that writes `proposal.md` ends without a markdown link whose target is that file path under `openspec/changes/<change-name>/`.

#### Scenario: Lite propose creates proposal

- **WHEN** the user approves `/opsx:propose` and the agent writes `openspec/changes/<name>/proposal.md`
- **THEN** the agent's final message for that turn includes an **Artifacts** block with a clickable link to `openspec/changes/<name>/proposal.md`

### Requirement: Apply surfaces context file links from CLI JSON

When `/opsx:apply` runs, the agent SHALL list markdown links for every path returned in `contextFiles` from `openspec instructions apply --change <name> --json`, and SHALL repeat links for any `tasks.md` (or equivalent) file it updates when checking off tasks.

**Fails until:** An apply session reads context files but the status summary omits links to those paths.

#### Scenario: Apply loads change context

- **WHEN** the user runs `/opsx:apply` for a change whose apply instructions return `contextFiles` with `proposal.md` and `tasks.md`
- **THEN** the agent's opening or closing summary for that session includes an **Artifacts** block linking to each resolved path under `openspec/changes/<name>/`

### Requirement: Archive and explore list touched paths when files change

`/opsx:archive` and `/opsx:explore` SHALL include an **Artifacts** block whenever they create, move, or update files under `openspec/changes/` (including archive destination paths).

**Fails until:** Archive moves a change folder without showing the new archive path as a link.

#### Scenario: Archive completes a change

- **WHEN** the user runs `/opsx:archive` and the change directory moves to `openspec/changes/archive/YYYY-MM-DD-<name>/`
- **THEN** the agent's completion message includes a clickable link to the archived change folder

### Requirement: Completion summaries list all change artifacts

When an opsx command finishes a multi-artifact or all-tasks milestone, the agent SHALL list markdown links for every artifact file in the change, resolved from `openspec status --change <name> --json` (including spec glob expansions).

**Fails until:** A propose run that completes all four lite artifacts lists only the last file touched.

#### Scenario: Propose completes all lite artifacts

- **WHEN** `openspec status --change <name>` reports `proposal`, `specs`, `design`, and `tasks` as done
- **THEN** the agent's completion summary includes an **Artifacts** block with links to each corresponding file path under the change directory

### Requirement: Paths are derived from CLI output, not hardcoded schema filenames

Hub opsx skills and commands SHALL instruct agents to resolve artifact paths from OpenSpec CLI JSON (`outputPath`, `changeDir`, `contextFiles`, expanded spec paths) so the same **Artifacts** rule works for `experiment-hub-lite`, `experiment-hub`, and `quickstart` without per-schema filename tables.

**Fails until:** A quickstart-schema change is documented in skills using only lite filenames (`proposal.md`, `design.md`, `tasks.md`) as the sole source of truth.

#### Scenario: Quickstart change uses different artifact set

- **WHEN** a change uses `schema: quickstart` and `openspec status --json` lists artifact IDs and `outputPath` values that differ from lite
- **THEN** agent instructions still require building the **Artifacts** block from that JSON rather than from a fixed filename list
