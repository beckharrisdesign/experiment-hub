# experiments-catalog

## MODIFIED Requirements

### Requirement: Load experiment records from repository data

The system SHALL read experiment metadata from `data/experiments.json` at request time using server-side filesystem access.

#### Scenario: Listed experiments resolve

- **WHEN** the hub needs to list or look up experiments
- **THEN** the system SHALL return records from `data/experiments.json` matching the persisted schema (identifiers, directories, linkage to docs and prototypes, status, scoring, optional `openspecChangeId`, optional `openspecSchema`)

#### Scenario: Missing data file tolerated

- **WHEN** a JSON data file is absent from `data/` for a supported content type handled by shared readers
- **THEN** callers SHALL receive an empty list rather than crashing the request path

### Requirement: Slug resolution for names

The system MAY resolve experiments by slugified display name or by `id` where product routes rely on slug-based URLs.

#### Scenario: Lookup by slug

- **WHEN** a slug derived from experiment name is supplied
- **THEN** the system SHALL return the experiment whose slugified name matches

#### Scenario: Lookup by id slug

- **WHEN** a slug equal to `experiment.id` is supplied
- **THEN** the system SHALL return the matching experiment record
