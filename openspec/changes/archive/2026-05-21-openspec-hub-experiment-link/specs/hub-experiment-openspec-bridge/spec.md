# hub-experiment-openspec-bridge

## Purpose

Connect hub experiment catalog entries to BHD OpenSpec change directories so list rows and detail pages surface lifecycle artifacts.

## ADDED Requirements

### Requirement: Resolve OpenSpec change for an experiment

The system SHALL resolve an OpenSpec change directory for a hub experiment using `openspecChangeId` when set, otherwise `experiment.id` when `openspec/changes/<id>/` exists.

#### Scenario: Explicit change id

- **WHEN** `openspecChangeId` is set on the experiment record
- **THEN** the system SHALL read artifacts from `openspec/changes/<openspecChangeId>/`

#### Scenario: Implicit change id by convention

- **WHEN** `openspecChangeId` is omitted and `openspec/changes/<experiment.id>/` exists
- **THEN** the system SHALL treat that directory as the linked change

### Requirement: Lifecycle tab on experiment detail

The experiment detail page SHALL include a Lifecycle tab when a linked OpenSpec change has at least one phase artifact (`explore.md`, `propose.md`, `apply.md`, or `archive.md`).

#### Scenario: Explore-only experiment

- **WHEN** only `explore.md` exists for the linked change
- **THEN** the Lifecycle tab SHALL render that markdown and show current phase Explore

#### Scenario: No linked change

- **WHEN** no change directory resolves
- **THEN** the Lifecycle tab SHALL NOT appear

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
