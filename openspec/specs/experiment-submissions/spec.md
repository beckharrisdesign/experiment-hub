# experiment-submissions

## Purpose

Accept waitlist and interest submissions from experiment landing pages and persist them to the hub’s `experiment_submissions` store (via Supabase), with predictable HTTP and CORS behavior for static landings hosted on arbitrary origins.

## Requirements

### Requirement: Public POST landing submission

The system SHALL expose `POST /api/landing-submission` for unauthenticated submission of signup data keyed by experiment.

#### Scenario: Successful submission

- **WHEN** the client sends a JSON body containing a non-empty `email` field
- **THEN** the system SHALL persist a row with `email`, optional `name`, optional `notes`, `experiment` (default `unknown` if omitted), `source` (default `landing-page` if omitted), and `metadata` containing any remaining top-level JSON fields used for experiment-specific answers
- **AND** SHALL respond with HTTP 200 and a JSON body including `success: true` and the created row `id`

#### Scenario: Missing email rejected

- **WHEN** the client omits `email` or sends an empty email value
- **THEN** the system SHALL respond with HTTP 400 and a JSON body `{ error: string }` describing the validation failure
- **AND** SHALL NOT persist a row

#### Scenario: Persist failure surfaces as server error

- **WHEN** persistence fails after validation passes
- **THEN** the system SHALL respond with HTTP 500 and a JSON body containing `error: "Failed to submit response"` and `details` with the underlying message

### Requirement: Cross-origin browser access for landing pages

The system SHALL support browser `fetch` calls from standalone landing bundles via configurable CORS on `POST /api/landing-submission`.

#### Scenario: OPTIONS preflight

- **WHEN** the client issues `OPTIONS /api/landing-submission`
- **THEN** the system SHALL respond with HTTP 204 and CORS headers allowing `POST` and `Content-Type`

#### Scenario: POST includes CORS headers

- **WHEN** the client completes a POST to `/api/landing-submission`
- **THEN** the response SHALL include `Access-Control-Allow-Origin` derived from `LANDING_CORS_ORIGIN` (or equivalent configuration) and allow `POST` with `Content-Type` in `Access-Control-Allow-Methods` / `Access-Control-Allow-Headers`

### Requirement: Malformed JSON request body

The system SHALL reject requests whose body is not valid JSON when a JSON body is expected.

#### Scenario: Invalid JSON body

- **WHEN** the client sends a POST with `Content-Type: application/json` and a body that is not valid JSON
- **THEN** the system SHALL respond with HTTP 400 and a JSON body `{ error: string }` that clearly indicates an invalid JSON payload
- **AND** SHALL NOT persist a row
