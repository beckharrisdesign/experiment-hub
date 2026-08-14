## ADDED Requirements

### Requirement: Pilot placeholder capability tracks schema smoke status

The specs artifact for `hub-schema-pilot-20260508` SHALL include exactly one capability folder so `--strict` OpenSpec validators can reconcile the ladder graph.

#### Scenario: Maintainer runs OpenSpec CLI

- **WHEN** the maintainer runs `openspec status --change hub-schema-pilot-20260508`
- **THEN** the graph reports `hub-pilot-demo` spec present for validation
