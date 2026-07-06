# Supabase Postgres upgrade — assessment and plan

_Investigated 2026-07-06. Question: are recent failing builds related to the early-July Supabase outage, and what is the LOE to move the project to a current Postgres version?_

## TL;DR

- **The Supabase outage is not a factor in any recent build failure.** CI is green everywhere; the recurring red check is a workflow-config quirk, and the one failed Vercel build was a TypeScript error (already fixed).
- **Upgrading Postgres is low-risk here** and is the **patch-only scenario: under 1 hour total**. Confirmed 2026-07-06 via the management API: the project (`Experiment Hub 2.0`, `ulqdjuiffpazzixnwwso`) runs **Postgres 17.6.1.063** — already PG 17, but below the 17.6.1.121 threshold from the July incident. The upgrade is a patch restart (~1–2 min downtime), not a major-version migration.

## Failing-build findings

1. **`require-resolved-threads.yml` fails on every push** (main and branches) with zero jobs executed and instant failure. The workflow declares only `pull_request` / review triggers, yet GitHub records failed `push`-event runs — a startup/config failure. It is cosmetic noise, never blocks merges, and long predates the outage. Fix separately.
2. **The single failed Vercel deployment (June 30)** failed type-checking: `Property 'Graduated' is missing in type ... Record<ExperimentStatus, string>` in `StatusSelect.tsx` (at `app/admin/StatusSelect.tsx` when that build ran; the file now lives at `app/admin/(protected)/StatusSelect.tsx`). Fixed the next day in the branch-repair commit. Not infrastructure-related.
3. **Builds cannot be affected by Supabase availability**: CI builds against `https://placeholder.supabase.co` and `next build` performs no database queries.

## What the outage was

Early-July 2026 Supabase incidents degraded project **creation, restarts, resizes, and restores**; running databases stayed up. Residual impact was limited to instances running Postgres **older than 17.6.1.121**, and only surfaced during restarts, restores, or upgrades. Sources: [status.supabase.com](https://status.supabase.com/), [incident history](https://status.supabase.com/history).

Implication: serving traffic was never at risk, but the project should be on a current PG 17 patch (≥ 17.6.1.121) so future restarts/upgrades aren't in the vulnerable cohort.

## Why upgrade risk is low for this project

- All database access goes through `supabase-js` / PostgREST over HTTPS — no direct wire-protocol clients, no connection-pooler coupling in app code.
- Schema is six small migrations (`supabase/migrations/001–006`) using nothing version-sensitive: plain tables, `gen_random_uuid()`, FKs, check constraints, RLS.
- Reads have a JSON fallback (`lib/data.ts`), so a brief DB blip degrades rather than breaks public pages.
- No application code changes are expected.

## Plan

1. **Preflight (~30 min)**
   - ~~Confirm current Postgres version~~ **Done 2026-07-06: `17.6.1.063`** (management API, after the earlier 502s cleared). Target: any patch ≥ 17.6.1.121.
   - Advisors run 2026-07-06 — no upgrade blockers. Pre-existing security lints to handle separately: `linked_repos` still carries the permissive `Service role full access` policy (the manual `drop policy` from the PR #260 follow-up has not been applied yet); `checkpoints`, `phase_transitions`, `drift_alerts`, `advisor_history` have RLS disabled; `experiment_content` and `notes` have RLS enabled with no policies.
   - Target: latest PG 17 patch (≥ 17.6.1.121).
   - Run Supabase advisors; confirm a fresh backup exists.
   - **Wait for full resolution on status.supabase.com before upgrading** — the incident specifically affected older-version instances during upgrades/restarts.
2. **Upgrade (~15–30 min)**
   - Dashboard → Infrastructure → Upgrade.
   - Patch upgrade = restart (~1–2 min downtime). Major jump (e.g. 15 → 17) = in-place `pg_upgrade`, a few minutes of downtime. One-way; hence the backup check.
   - Pick a quiet window.
3. **Verify (~1–2 hr)**
   - Smoke the real flows against prod: admin status change (reads and writes use different clients — the #264 lesson), notes CRUD, linked-repos endpoints, landing submission.
   - `npx vitest run`; skim Supabase logs and advisors; spot-check Vercel prod pages.

## LOE estimate

| Scenario | Estimate |
| --- | --- |
| **Already on PG 17, patch-only (confirmed: 17.6.1.063 → latest)** | **< 1 hour** |
| PG 15 → 17 major upgrade (not applicable) | 3–5 hours |

Optional, separable chore: bump `@supabase/*` client packages (currently postgrest-js 2.10x — fine either way).

## Follow-ups

- [ ] Fix or remove the `require-resolved-threads.yml` push-event failure noise.
- [x] Confirm exact Postgres version — `17.6.1.063` (2026-07-06).
- [ ] Schedule and execute the patch upgrade per the plan above (after status.supabase.com shows the July incidents fully resolved).
- [ ] Apply the outstanding PR #260 follow-up: `drop policy if exists "Service role full access" on linked_repos;` (advisors confirm it is still live).
