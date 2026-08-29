# change-history-source

## Outcomes

(See [proposal.md](../../proposal.md) — Who / Job / Done when / Not doing.)

## ADDED Requirements

### Requirement: A deployed page shows the history a local checkout shows

A change page SHALL render its stage dates, pull requests, quiet stretches and findings in an environment with no git checkout, matching what the same change renders locally at the same commit.

**Fails until:** `/changes/tell-the-story` on the live site reports its eleven pull requests instead of zero.

#### Scenario: Stage dates render without git

- **WHEN** a change page is rendered where no git history is available
- **THEN** each gate that has an artifact SHALL show the date that artifact first landed

#### Scenario: Pull requests render without git

- **WHEN** a change with merged pull requests is rendered where no git history is available
- **THEN** the page SHALL report them, and SHALL NOT report a count of zero

#### Scenario: Silences render without git

- **WHEN** a change with a gap of more than three days between events is rendered where no git history is available
- **THEN** the gap SHALL appear with its real duration

#### Scenario: Findings render without git

- **WHEN** a task claims work remains on a pull request that has merged, and no git history is available
- **THEN** the disagreement SHALL still be reported, with the merge date

### Requirement: The manifest is generated where history actually exists

Generation SHALL run only against a repository with complete history, and SHALL fail loudly rather than emit a manifest it knows to be thin.

**Fails until:** Running generation on a shallow clone exits non-zero and names the clone depth as the reason.

#### Scenario: A shallow clone refuses to generate

- **WHEN** generation runs where `git rev-parse --is-shallow-repository` reports true
- **THEN** it SHALL fail with a message naming the shallow clone, and SHALL NOT write a manifest

#### Scenario: Every change is covered

- **WHEN** generation completes
- **THEN** the manifest SHALL contain an entry for every change the hub can render, including archived ones

### Requirement: Live git wins where it is available

Where a git checkout is present, the page SHALL read it directly, so work committed since the manifest was generated is visible immediately.

**Fails until:** A commit made locally after the manifest was written shows on the change page without regenerating it.

#### Scenario: A newer local commit appears

- **WHEN** a change is rendered locally and a commit exists that postdates the manifest
- **THEN** the page SHALL include it

#### Scenario: The manifest is used when git is absent

- **WHEN** a change is rendered where git is unavailable
- **THEN** the page SHALL read the manifest instead, without erroring

### Requirement: The page says where its history came from

The page SHALL state which source produced its history, so an empty history is never mistaken for a change that has had no work.

**Fails until:** A page with no history says whether that is because nothing happened or because nothing could be read.

#### Scenario: The source is named

- **WHEN** a change page renders its history
- **THEN** it SHALL state whether that history came from the repository or from the manifest

#### Scenario: Genuinely empty is distinct from unavailable

- **WHEN** a change has no commits at all
- **THEN** the page SHALL say so in terms that differ from the wording used when no history source could be read

### Requirement: The manifest is derived data, never the only copy

The manifest SHALL be reproducible from the repository at any commit, and generating it SHALL NOT modify anything under `openspec/changes/`.

**Fails until:** Deleting the manifest and regenerating at the same commit produces an identical file.

#### Scenario: Regeneration is deterministic

- **WHEN** the manifest is regenerated at the same commit
- **THEN** the result SHALL be identical to the previous one

#### Scenario: Generation writes nothing back

- **WHEN** generation runs
- **THEN** no file under `openspec/changes/` SHALL be created, modified or removed
