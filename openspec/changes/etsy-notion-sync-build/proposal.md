# Proposal — etsy-notion-sync-build

Child change of [etsy-notion-sync](../etsy-notion-sync/) (BHD parent: [explore](../etsy-notion-sync/explore.md) · [propose](../etsy-notion-sync/propose.md) · [apply](../etsy-notion-sync/apply.md)). Implements Build Units 2–3.

## Human anchor

> "I want a ui for this work - not to have to edit python files every time I want to do it."
>
> "…the ui is a prototype inside the hub… which shows what synced, when, and allows me to initiate another sync when I need to."
>
> — Katy, 2026-07-15 (session, verbatim)

## Outcomes

- **Who:** Katy, solo Etsy seller, operating the sync from the experiment hub.
- **Job:** See what synced and when, and kick off a sync on demand — without a terminal or editing files.
- **Done when:** Scheduled runs execute server-side daily and land in Supabase; the hub experiment page shows run history (time, status, listings captured, fields changed, new fields, quota); a "Sync now" button triggers a real run whose result appears in that history.
- **Not doing:** Trends/charts UI (post-validation, issue #283); any Etsy write; multi-user or multi-shop; alerting/notifications.

## Why

Build Unit 1 (headless pipeline) works but is operable only from a terminal with local files — the founder's anchor above rejects that as the operating model. The deployed hub can't read local SQLite or run local Python, so run visibility and triggering require the server-side shape decided in the parent Propose: Supabase as canonical store, GitHub Actions as runtime.

## What changes

- Python store gains a Supabase (Postgres) backend for `listing_snapshots` / `runs` / `schema_keys` (append-only semantics unchanged); Etsy token custody moves to a service-role-only table because Etsy rotates refresh tokens on use. Local SQLite remains the documented fallback.
- New GitHub Actions workflow: daily scheduled capture+sync, plus `workflow_dispatch` for on-demand runs.
- New hub prototype page on the experiment's entry: run history from Supabase + "Sync now" (API route → workflow dispatch). MVDS components; design context in `design.md` before implementation.

## Capabilities

### New Capabilities

- `etsy-sync-runtime`: server-side sync execution — Supabase-backed append-only store, token custody, scheduled + dispatched GitHub Actions runs.
- `etsy-sync-hub-page`: hub surface for sync observability and control — run history view + manual trigger.

### Modified Capabilities

- none (hub experiment detail page gains a prototype surface via existing registry mechanisms).

## Impact

- `experiments/etsy-notion-sync/prototype/` — store backend abstraction, runner entrypoint.
- `.github/workflows/` — new workflow (secrets: Etsy keystring, Supabase service key, Notion token).
- Hub app — new route/components for the sync page + API route for dispatch; MVDS per `design.md`.
- Supabase (hub project) — new tables, service-role policies.

## Optional links

- PRD: `experiments/etsy-notion-sync/docs/PRD.md` · Spec: `experiments/etsy-notion-sync/docs/SPEC.md`
- Experiment directory: `experiments/etsy-notion-sync/`
