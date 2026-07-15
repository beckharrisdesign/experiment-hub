# Propose — Etsy → Notion Sync

> Store note: Business Patterns, Service Patterns, and BHD Ecosystem stores (`docs/founder/*`) are pending; this artifact draws on `explore.md` (approved 2026-07-15), the approved spec (`experiments/etsy-notion-sync/docs/SPEC.md`), and founder direction in session. Explore permutation A (personal tool, hub-integrated) is the committed shape; permutation B (multi-seller SaaS) is deferred, founder-declared future direction.

## Business Brief

### Monetization model

**Utility — no monetization model attached (founder, 2026-07-15).** This is classified as a utility: internal infrastructure whose return is workflow time saved, owned shop data, and Etsy v3 API competence. Deliberately not "free-for-now" (which implies future pricing pressure) — a utility has no monetization question to answer. If the deferred SaaS permutation is ever picked up, that becomes a separate change with its own Business Brief, informed by what this utility proves.

### Pricing

n/a — utility.

### SKUs / tiers

n/a — utility.

### Internal Positioning

For Katy the maker-seller, this is the pipeline that makes Etsy data hers: every listing's full history captured on her infrastructure, Notion kept current without data entry, and a hub page that shows the shop's pulse — the on-ramp to an eventual maker-facing sync product.

## Service Brief

### Use cases included in v1

- Daily unattended capture of all shop listings (widest field coverage + per-listing inventory) into an append-only, version-tagged history store.
- Notion Inventory database mirror: price / quantity / status, changed-fields-only, dry-run default.
- **Hub prototype page: see what synced and when** (run history: time, status, listings captured, fields changed, new-field notices, quota remaining) **and trigger a sync on demand** ("sync now").
- History queries: every price a SKU has had, stock depletion over time, schema drift log.

### Use cases NOT included in v1

- No Etsy writes; no Notion → Etsy direction; no orders/receipts/payments data (unchanged from Explore).
- No trends/charts UI — that is the post-validation build (issue #283, on MVDS).
- No multi-shop, no other users, no credential custody beyond the founder's own tokens.
- No alerting/notifications (email, Slack) on run failures — run status is visible on the hub page only.
- No landing page or public write-up in v1.

### Surfaces involved

- **Hub web app** — prototype page on the experiment's hub entry (run history + sync-now), MVDS components, design context in the child change's `design.md`.
- **CLI** — existing Python scripts remain runnable directly (developer/fallback surface).
- **Notion** — Inventory database stays the day-to-day data view; BHD Labs Database row is the registry entry.

### Platforms involved

- Etsy Open API v3 (OAuth PKCE, scope `listings_r`, read-only).
- Notion API (inventory mirror + hub registry).
- **Supabase (hub's existing project)** — canonical store for run summaries and listing snapshots, replacing local-only SQLite so the deployed hub can read sync state. Append-only schema ports 1:1 (`listing_snapshots`, `runs`, `schema_keys`). Etsy tokens live in a service-role-only table because Etsy rotates refresh tokens on every use — a static GitHub secret cannot hold them.
- **GitHub Actions** — execution environment: daily scheduled run + `workflow_dispatch` for the hub's "sync now" button (the deployed hub cannot run local Python; the local cron design from the spec remains a supported fallback).
- Vercel (hub hosting, unchanged).

## Validation Plan

### Method

Run the real pipeline against the live shop on the daily schedule for two weeks, operated only through the hub page (no terminal after setup). This validates the hypothesis (zero-manual-edit currency + usable history) and the v1 shape (hub-visible, hub-triggerable).

### Traffic / sample

The founder's own shop: every active listing, every day, plus ad-hoc "sync now" runs after real shop edits.

### Budget

Time: ~2–4 days build for the storage move + hub page (child change), then ~10 min/week of attention during the window. Money: $0 incremental (existing Supabase project, GH Actions free tier, existing accounts).

### Success thresholds

- ≥13 of 14 scheduled runs complete green without manual intervention.
- 0 incorrect values written to Notion (spot-check 10 listings twice during the window).
- Re-run with no shop changes produces 0 Notion writes (idempotency holds in production).
- "Sync now" from the hub works, and the founder actually uses it at least 3 times for real shop events.
- One real history question answered from the store in under 5 minutes.

### Kill criteria

- Unattended runs need manual rescue more than 3 times in the window (token, quota, or API instability).
- Etsy quota or terms make daily full-shop capture infeasible.
- Founder finds herself editing Notion inventory fields manually anyway — the mirror isn't trusted or isn't sufficient.

### Decision point

~2026-07-29 (end of window): thresholds met → keep running as permanent infrastructure, promote trends UI (issue #283) to the next Build Unit, and open Explore-level thinking for deferred permutation B. Kill criteria hit → stop the schedule, archive with learnings (the Etsy v3 API knowledge is a deliverable either way).

## Measurement Brief — Intent

### Success metric

Zero manual edits to synced Notion inventory fields per week, sustained after the validation window, with the founder checking sync state on the hub rather than in a terminal.

### Leading indicator

Consecutive green scheduled runs visible on the hub page; founder-initiated "sync now" events (usage = trust).

### Kill criteria

Founder reverts to manual Notion edits, or stops consulting sync state entirely for 30+ days — the tool has become decoration.

## Score re-run (optional, prompted after Propose drafts complete)

Draft: no deltas proposed — the Supabase/GH Actions shape raises ongoing complexity slightly but stays within "$: 5" (still ~$0/mo, still solo-days of work). Founder may adjust on review.

| Dim | Explore | Propose | Delta |
|---|---|---|---|
| B | 2 | 2 | 0 |
| P | 5 | 5 | 0 |
| C | 3 | 3 | 0 |
| $ | 5 | 5 | 0 |
| S | 2 | 2 | 0 |
