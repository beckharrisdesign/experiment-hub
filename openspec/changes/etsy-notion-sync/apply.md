# Apply — Etsy → Notion Sync

> Store note: BHD Surfaces, Product Design Patterns, and Pattern Candidates stores (`docs/founder/*`) are pending; surfaces and patterns below are named directly. Code ships via a **child** change (`openspec/changes/etsy-notion-sync-build/`, schema `experiment-hub-lite`) — this file tracks Build Units, learnings, and instrumentation, not code tasks. Build Unit 1 predates this artifact (merged before the BHD change was opened); recorded honestly rather than re-staged.

## BHD Surfaces used

- Experiment hub web app (experiment detail page → prototype surface for the sync page).
- Notion: founder's Inventory database (data view) + BHD Labs Database (registry row).
- CLI (Python scripts — developer/fallback surface).
- GitHub Actions (scheduled + dispatched runs).
- Supabase (hub's existing project — history store, run log, token custody).

## Product Design Patterns applied

- Hub dark-theme conventions (`rules/design-guidelines.mdc`) and MVDS components for the sync page; design context lands in the child change's `design.md` per `rules/figma.mdc`.
- External Positioning variants are n/a across all units — this is a utility (Propose, approved 2026-07-15); no taglines or ad copy exist.

## Build Units

### Build Unit 1: Headless pipeline (capture + Notion sync + OAuth helper)

- **State:** in progress (capture/sync merged via PR #282; OAuth PKCE helper open as PR #284)
- **Purpose:** validation

#### Measurement instrumentation

- `runs` audit table (started/finished, status, snapshots written, new fields, quota remaining) — currently local SQLite, moves to Supabase in Build Unit 2.
- Offline pytest suite (41 tests) covering ancestry, drift detection, rate-limit handling, changed-fields-only sync, dry-run, and OAuth flows.

#### Learnings log

- **2026-07-15:** Etsy v3 access tokens expire after 1 hour and refresh tokens rotate on every use — a static-credential cron is impossible. Led to `oauth_helper.py --refresh` and the Propose decision to move token custody to a service-role Supabase table.
- **2026-07-15:** Review findings worth keeping: `retry-after` can be an HTTP date, not seconds; per-row SQLite commits are an fsync trap on batch writes; a localhost OAuth callback listener must ignore stray requests (`/favicon.ico`) or it exits early.
- **2026-07-15:** The hub registry moved to the Notion BHD Labs Database (`lib/notion-experiments.ts`); `data/experiments.json` is legacy fallback. Experiments must register in Notion, not just JSON.

#### Pattern notes

- Read-only API client with no write methods as an enforced guardrail (tested via `test_client_has_no_write_methods`) — candidate for Service Patterns.
- Append-only snapshot store with `previous_record_id` ancestry + schema-drift watch — candidate reusable shape for any third-party API capture.

---

### Build Unit 2: Server-side store + scheduled runner (Supabase + GitHub Actions)

- **State:** planned
- **Purpose:** both (validation infrastructure; production home for history + tokens)

Scope per Propose: port `listing_snapshots` / `runs` / `schema_keys` to Supabase Postgres (append-only semantics unchanged); Etsy token custody in a service-role-only table; GitHub Actions workflow with daily schedule + `workflow_dispatch`; local cron/SQLite remains documented fallback.

#### Measurement instrumentation

- Supabase `runs` table becomes the canonical run log the hub reads; each row records trigger source (`scheduled` / `manual`) so the "founder uses sync-now" leading indicator is queryable.
- GitHub Actions run history (green-run streak vs the ≥13/14 validation threshold).

#### Learnings log

- _(empty — unit not started)_

#### Pattern notes

- _(none yet)_

---

### Build Unit 3: Hub sync page (run history + sync now)

- **State:** planned
- **Purpose:** validation (proves the v1 shape: operable from the hub, no terminal)

Scope per Propose: prototype page on the experiment's hub entry — run history (time, status, listings captured, fields changed, new-field notices, quota remaining) and a "sync now" button that dispatches the Actions workflow. MVDS components; `design.md` with component mapping in the child change before implementation.

#### Measurement instrumentation

- Page renders from the Supabase `runs` table (no additional tracking needed for run visibility).
- "Sync now" dispatches are counted via trigger-source rows (Build Unit 2 instrumentation) — target ≥3 founder-initiated syncs during the validation window.

#### Learnings log

- _(empty — unit not started)_

#### Pattern notes

- _(none yet)_

---

## Validation window (operates across units)

The two-week live window from the Propose Validation Plan (~start when Build Units 2–3 are live; decision ~14 days later). Not a Build Unit itself — thresholds, kill criteria, and the decision point live in [propose.md](propose.md).
