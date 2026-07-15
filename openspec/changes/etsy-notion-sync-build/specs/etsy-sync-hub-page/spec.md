# etsy-sync-hub-page

## Outcomes

See [proposal.md](../../proposal.md) — the hub is where Katy sees what synced and when, and initiates a sync when she needs one ("I want a ui for this work").

## ADDED Requirements

### Requirement: Run history visible on the hub

The experiment's hub page shows what synced and when, so sync state is never checked in a terminal or database console.

**Fails until:** opening the sync page shows the most recent runs read live from Supabase.

The hub SHALL display run history — started time, status, trigger source, listings captured, Notion fields changed, new-field notices, and quota remaining — on the etsy-notion-sync experiment page, newest first.

#### Scenario: Run history renders on the hub page

- **WHEN** Katy opens the etsy-notion-sync page in the hub
- **THEN** she sees the most recent runs with time, status, what changed in Notion, and remaining Etsy quota, without leaving the hub

### Requirement: Sync on demand from the hub

A "Sync now" control lets Katy trigger a real run after shop edits, instead of waiting for the daily schedule.

**Fails until:** clicking "Sync now" produces a new completed run that appears in the on-page history.

The hub SHALL provide a "Sync now" action that dispatches the GitHub Actions workflow and SHALL surface the resulting run in the history with trigger source `manual`.

#### Scenario: Sync now triggers a run

- **WHEN** Katy clicks "Sync now" on the sync page
- **THEN** a new run starts (trigger source `manual`), the page reflects that it's in progress, and the completed run appears in the history
