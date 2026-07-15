# Tasks — etsy-notion-sync-build

## 1. User outcomes (from spec scenarios)

- [ ] 1.1 Scheduled run lands in Supabase — the daily sync completes with no human involved, and Katy can see the run (trigger source `scheduled`) and its snapshots in Supabase
- [ ] 1.2 Tokens rotate across consecutive runs — two back-to-back runs succeed with zero manual token work
- [ ] 1.3 Etsy remains read-only server-side — runs only ever GET from Etsy, and existing history rows are never mutated
- [ ] 1.4 Run history renders on the hub page — Katy opens the experiment page and sees what synced, when, what changed, and quota remaining
- [ ] 1.5 Sync now triggers a run — Katy clicks the button, sees it queued/running, and the completed run appears in the history

## 2. Prototype shell

- [ ] 2.1 **Tailwind v4/v3 spike (gate for all UI tasks):** ~~decide the consumption path~~ **decided 2026-07-15: hub upgrades to Tailwind v4 as its own change (`hub-tailwind-v4`)** — spike confirmed the package ships v4 source only (no compiled CSS). Remaining: after the upgrade lands, install `@beckharrisdesign/mvds` and render `Button`/`Badge`/`Card`/`Section` on a dev-only route to close this task.
- [x] 2.2 Supabase schema migration (hub project): `etsy_listing_snapshots` (append-only, ancestry FK), `etsy_runs` (incl. `trigger_source`), `etsy_schema_keys`, `etsy_tokens` (service-role-only RLS; no client access to any of these tables)

## 3. Implementation

- [x] 3.1 Python store gains a Supabase backend (PostgREST) selected by env, same append-only interface as SQLite; existing pytest suite passes against both
- [x] 3.2 Token custody: run start reads refresh token from `etsy_tokens`, rotates it, persists the new pair; `oauth_helper.py` gains a one-time "seed tokens to Supabase" mode
- [x] 3.3 GitHub Actions workflow: daily schedule + `workflow_dispatch(trigger_source)`; secrets: `ETSY_API_KEY`, `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`, `NOTION_TOKEN`, `NOTION_INVENTORY_DB_ID`
- [x] 3.4 Hub API routes: `GET` recent runs (server-side Supabase read; no client keys) and `POST` sync-now (admin-cookie-gated, fail closed; dispatches the workflow via GitHub API)
- [ ] 3.5 Sync page on the experiment entry per `design.md` mapping (`Section`/`Layer`, `Card` list, `Badge` status, `Button` CTA, `Callout` warnings; MVDS principles: no hardcoded colors, no margin spacing, no raw flex/grid); poll while a run is active; optimistic queued row on dispatch

## 4. QA

- [ ] 4.1 Manual walkthrough aligned to Outcomes: open sync page → history renders from real Supabase data → click Sync now → run queues, executes, completes → history updates → spot-check Notion values against Etsy
- [ ] 4.2 Automated: pytest (store backends, token rotation with mocked PostgREST) + vitest (runs route, dispatch route auth fail-closed, page components); both suites green in CI
- [ ] 4.3 Validation entry gate: two consecutive *scheduled* runs green with no manual intervention (this starts the two-week validation window from the parent Propose)
