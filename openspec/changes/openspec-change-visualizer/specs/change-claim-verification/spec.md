# change-claim-verification

## Outcomes

(See [proposal.md](../../proposal.md) — Who / Job / Done when / Not doing.)

## ADDED Requirements

### Requirement: A claim that disagrees with the record is surfaced

The page SHALL compare what a change says about its own progress against what the repository and GitHub show, and SHALL present each disagreement as a finding rather than leaving the reader to discover it.

**Fails until:** Opening `tell-the-story` shows that task 3.11 is unchecked while the code it describes is already merged.

#### Scenario: Work that shipped but is still unchecked

- **WHEN** an unchecked task names behaviour that exists in the codebase
- **THEN** the page SHALL report the disagreement, citing the file and the pull request that merged it

#### Scenario: A task still waiting on a pull request that merged

- **WHEN** a task states that work remains on a pull request that has since merged
- **THEN** the page SHALL report the disagreement with the merge date

#### Scenario: Sources that agree produce nothing

- **WHEN** a change's claims match the repository and GitHub
- **THEN** the page SHALL report no findings, and SHALL NOT show an empty section

### Requirement: A disagreement is reported, never resolved

A finding SHALL state both readings and the evidence for each, and SHALL NOT choose between them or alter the change's own files.

**Fails until:** A finding can be read without it being clear which source the page believes.

#### Scenario: Both readings are stated

- **WHEN** a disagreement is reported
- **THEN** the finding SHALL give what the change claims and what the record shows, without asserting which is correct

#### Scenario: Nothing is written back

- **WHEN** the page renders any finding
- **THEN** no file under `openspec/changes/` SHALL be modified
