# hub-experiment-openspec-bridge

## Purpose

Connect hub experiment catalog entries to BHD OpenSpec change directories so list rows and detail pages surface lifecycle artifacts.

## Requirements

### Requirement: Resolve OpenSpec change for an experiment

The system SHALL resolve an OpenSpec change directory for a hub experiment using `openspecChangeId` when set, otherwise `experiment.id` when `openspec/changes/<id>/` exists.

#### Scenario: Explicit change id

- **WHEN** `openspecChangeId` is set on the experiment record
- **THEN** the system SHALL read artifacts from `openspec/changes/<openspecChangeId>/`

#### Scenario: Implicit change id by convention

- **WHEN** `openspecChangeId` is omitted and `openspec/changes/<experiment.id>/` exists
- **THEN** the system SHALL treat that directory as the linked change

### Requirement: Per-phase tabs on experiment detail

The experiment detail page SHALL include one tab per linked OpenSpec phase artifact that exists and is non-empty (`explore.md`, `propose.md`, `apply.md`, `archive.md`), labeled Explore, Propose, Apply, and Archive, instead of a single Lifecycle tab that stacks all phases.

**Fails until:** Explore-only linked change shows Explore tab only, not Lifecycle.

#### Scenario: Explore-only experiment

- **WHEN** only `explore.md` exists for the linked change
- **THEN** the Explore tab SHALL render that markdown and the current phase indicator SHALL show Explore

#### Scenario: No linked change

- **WHEN** no change directory resolves
- **THEN** no BHD phase tabs SHALL appear; legacy PRD and Business Case tabs SHALL follow hide-if-empty rules in `hub-bhd-phase-tabs`

### Requirement: Route slug matches id or name

Experiment routes SHALL resolve by slugified `name` or by `experiment.id`.

#### Scenario: Lookup by experiment id slug

- **WHEN** the URL slug equals `experiment.id` but not `slugify(name)`
- **THEN** `getExperimentBySlug` SHALL still return the experiment

### Requirement: Home list phase chip

The hub home experiment table SHALL show the current BHD phase label when a linked OpenSpec change exists.

#### Scenario: Explore phase visible on list

- **WHEN** an experiment is listed and its linked change has `explore.md` only
- **THEN** the row SHALL display phase Explore (or equivalent chip)
