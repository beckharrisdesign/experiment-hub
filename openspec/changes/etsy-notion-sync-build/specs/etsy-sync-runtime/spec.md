# etsy-sync-runtime

## Outcomes

See [proposal.md](../../proposal.md) — Katy operates the sync without a terminal: scheduled runs execute server-side daily and land in Supabase; a manual trigger exists (hub surface covered by `etsy-sync-hub-page`).

## ADDED Requirements

### Requirement: Scheduled server-side sync

The pipeline runs daily with no laptop, terminal, or file editing involved, and every run's snapshots and summary land in Supabase.

**Fails until:** a scheduled GitHub Actions run completes green and its run row (trigger source `scheduled`) plus snapshots are queryable in Supabase.

The system SHALL execute capture and Notion sync daily via a scheduled GitHub Actions workflow, persisting listing snapshots, run summaries, and schema keys to Supabase with append-only semantics.

#### Scenario: Scheduled run lands in Supabase

- **WHEN** the daily schedule fires
- **THEN** a new `runs` row with trigger source `scheduled` is created in Supabase, with its listing snapshots chained to prior captures by `previous_record_id`

### Requirement: Server-side token custody

Etsy's hourly access tokens and rotating refresh tokens are managed entirely server-side; no run ever needs a human to re-authenticate (until the ~90-day refresh-token lapse).

**Fails until:** two consecutive Actions runs succeed with no manual token intervention between them.

The system SHALL store Etsy OAuth tokens in a service-role-only Supabase table and SHALL refresh and persist the rotated tokens at the start of every run.

#### Scenario: Tokens rotate across consecutive runs

- **WHEN** a run starts with the currently stored refresh token
- **THEN** it obtains a fresh access token, persists the newly rotated refresh token, and the next run succeeds using it

### Requirement: Read-only and append-only guarantees hold server-side

Moving to Supabase + Actions changes where the pipeline runs, not what it's allowed to do: Etsy is never written to, history is never mutated.

**Fails until:** the offline test suite passes against the Supabase store backend, including the no-write-methods guardrail test.

The system SHALL make only GET requests to Etsy; SHALL only insert (never update or delete) rows in the snapshot and schema-key tables; and SHALL never delete run rows (a run row may only transition its own status/summary on completion).

#### Scenario: Etsy remains read-only server-side

- **WHEN** any scheduled or manual run executes
- **THEN** Etsy receives only authenticated GET requests, and existing Supabase history rows are byte-identical before and after the run
