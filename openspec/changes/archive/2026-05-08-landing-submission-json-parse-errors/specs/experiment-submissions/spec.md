## MODIFIED Requirements

### Requirement: Malformed JSON request body

The system SHALL reject requests whose body is not valid JSON when a JSON body is expected.

#### Scenario: Invalid JSON body

- **WHEN** the client sends a POST with `Content-Type: application/json` and a body that is not valid JSON
- **THEN** the system SHALL respond with HTTP 400 and a JSON body `{ error: string }` that clearly indicates an invalid JSON payload
- **AND** SHALL NOT persist a row
