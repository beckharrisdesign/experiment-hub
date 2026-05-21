# experiments-catalog

## Purpose

Provide the hub UI and APIs with a single source of truth for experiments, prototypes, and documentation metadata stored as JSON in the repository.

## Requirements

### Requirement: Load experiment records from repository data

The system SHALL read experiment metadata from `data/experiments.json` at request time using server-side filesystem access.

#### Scenario: Listed experiments resolve

- **WHEN** the hub needs to list or look up experiments
- **THEN** the system SHALL return records from `data/experiments.json` matching the persisted schema (identifiers, directories, linkage to docs and prototypes, status, scoring, optional `openspecChangeId`, optional `openspecSchema`)

#### Scenario: Missing data file tolerated

- **WHEN** a JSON data file is absent from `data/` for a supported content type handled by shared readers
- **THEN** callers SHALL receive an empty list rather than crashing the request path

### Requirement: Stable experiment identifiers

Each experiment SHALL have a persistent `id` used for linking prototypes, documentation, and routes regardless of display name changes.

#### Scenario: Lookup by id

- **WHEN** a caller requests an experiment by `id`
- **THEN** the system SHALL resolve the matching record or null when not found

### Requirement: Slug resolution for names

The system MAY resolve experiments by slugified display name where product routes rely on slug-based URLs.

#### Scenario: Lookup by slug

- **WHEN** a slug derived from experiment name or experiment `id` is supplied
- **THEN** the system SHALL return the experiment whose slugified name or `id` matches, or null when none match
