# Tasks — secrets-management

## 0. Prerequisites (Katy — not code, and they block everything)

- [ ] 0.1 Confirm 1Password account recovery is in order — Emergency Kit saved, recovery contact set. Do this **before** cutover, while plaintext values still exist as a fallback: after cutover, losing vault access means losing local dev.
- [x] 0.2 Create a standalone `BHD Labs` vault (not `Private`, not a shared family vault).
      - Named `BHD Labs`, not the `Experiment Hub` the artifacts originally assumed; every reference was renamed to match. A first attempt created a **collection** rather than a vault — collections are client-side *views over existing vaults* and store nothing, which is why `op vault list` could not see it.
- [ ] 0.3 Populate it — **scaffolding done, values are Katy's to paste in.** Ten items created in `BHD Labs` with all 23 fields: `OpenAI`, `Stripe`, `Supabase`, `Figma`, `GitHub dispatch`, `Google OAuth pdf-metadata-viewer`, `PDF session`, `Etsy`, `Notion`, `Vercel`. Every field holds `PASTE_VALUE_HERE`; replace each with the real value. All 23 `op://` references were verified to resolve, so a mistyped field label cannot masquerade as an unfilled one.
      - The last three vendors were **not** in the original plan. The sync script's orphan report flagged 8 GitHub Actions secrets consumed by `etsy-notion-sync.yml`, `history-accumulate.yml`, and `deploy-hub.yml` but absent from the manifest — real credentials that would have stayed unmanaged. Manifest now covers 23 variables with zero orphans.
- [ ] 0.4 Install the Vercel CLI (`npm i -g vercel`) and authenticate it — absent today, and `secret-sync` cannot write to Vercel without it.

## 1. User outcomes (from spec scenarios)

- [ ] 1.1 Printing the env file leaks nothing
- [ ] 1.2 A dedicated vault holds the hub's credentials
- [ ] 1.3 Dev server starts with working credentials
- [ ] 1.4 A broken CLI integration fails loudly, not silently
- [x] 1.5 An agent attempt to print the env file is refused
- [x] 1.6 Legitimate key-name inspection still works
- [ ] 1.7 Sync reports drift and corrects it
- [ ] 1.8 Sync previews before it writes
- [x] 1.9 Orphaned secrets are surfaced, not silently kept
- [ ] 1.10 Rotating a key with no prior context
- [ ] 1.11 The runbook records vendor differences that caused past mistakes

## 2. Prototype shell

- [ ] 2.1 **N/A — no prototype.** This is repo infrastructure (env file, a script, a hook, docs), not an experiment with a running surface. No `experiments/<slug>/prototype/` directory, no port assignment, no `data/prototypes.json` row.

## 3. Implementation

**Cutover — one credential at a time, verifying each before the next.** A bulk rewrite of `.env.local` is the tempting shortcut and the 2026-08-16 rotation is direct evidence against it: that file disagreed with expectations three times in a row.

- [x] 3.1 Write the failing checks first (see §4.2) so the work ships failing-first per `rules/principles.mdc`.
- [ ] 3.2 Convert `OPENAI_API_KEY` to an `op://` reference; confirm resolution before touching anything else. This is the canary — 11 files consume it.
- [ ] 3.3 Convert the remaining credentials: `STRIPE_SECRET_KEY_LIVE`, `STRIPE_SECRET_KEY_TEST`, `STRIPE_WEBHOOK_SECRET_LIVE`, `STRIPE_WEBHOOK_SECRET_TEST`, `SUPABASE_SERVICE_ROLE_KEY`, `FIGMA_ACCESS_TOKEN`, `GITHUB_DISPATCH_TOKEN`. Leave all non-secret config as literal plaintext.
- [ ] 3.4 Wrap the dev script: `"dev": "op run --env-file=.env.local -- next dev"`. Verify worktree symlink resolution still works from a worktree, not just the main checkout.
- [ ] 3.5 Make a failed resolution loud — start-up must name 1Password as the cause and point at the documented bypass, never start with empty credentials (spec 1.4).
- [ ] 3.6 Update `.env.example` so the registry shows which variables are references and which are plaintext config.
- [x] 3.7 Add the `.env*` bulk-read guard to `.claude/hooks/pre-tool-use.sh`, with an explicit carve-out for listing key *names* (spec 1.6). Test both directions before committing — a guard that blocks everything is as bad as one that blocks nothing.
      - Two bugs found by using it rather than by reading it. **False negative:** `grep` was missing from the blocklist, so `grep OPENAI_API_KEY .env.local` printed the value — the guard's biggest hole. **False positive:** any command merely *mentioning* `.env` in a quoted search pattern was blocked, which made searching the codebase for env references impossible. Fixed by stripping quoted sections before looking for a filename, and adding `grep`/`egrep`/`rg`/`ag`. Both are now regression-tested.
- [x] 3.8 Write `scripts/sync-secrets.sh`: read the vault, diff against Vercel and GitHub Actions, report added / updated / unchanged / orphaned. **Preview by default; writing requires an explicit flag.**
      - **Verified end-to-end in preview** against the real `BHD Labs` vault: preflight passes, all 23 manifest entries resolve as "not in vault yet", and the orphan pass reports zero after the manifest was extended. Only the `--apply` write path is still unexercised, pending vault contents and the Vercel CLI. One design consequence worth knowing: GitHub Actions secrets are write-only (`gh secret list` returns names and timestamps, never values), so "unchanged" cannot be decided by reading the target. The script records a SHA-256 of each value it writes to a gitignored `.secrets-sync-state` (hashes only). The honest limitation: a value edited directly in the Vercel or GitHub UI is invisible to this and will report "unchanged" until the vault value moves.
- [x] 3.9 Handle GitHub *environment* secrets, not just repo secrets — `SUPABASE_URL` and both `NOTION_*_DATA_SOURCE_ID`s live there, which is why they were invisible during the rotation audit.
      - Environment name is `Production – experiment-hub` (en-dash), used by `etsy-notion-sync.yml`. Separately: `ci.yml` references `secrets.SUPABASE_URL` **without** declaring an `environment:`, so it resolves against repo secrets — where no such secret exists. That job has been running with empty Supabase values. Out of scope here, but it should be looked at.
- [x] 3.10 Write the rotation runbook: per credential, where it is stored, what consumes it, vendor-specific steps, and the ordering rule (revoke last — revoking early breaks CI and prod while local dev keeps working).
- [x] 3.11 Reconcile `README.md` (lines 103–104) with the declared `packageManager: pnpm@10.33.0`. Same drift class as the session-start hook fixed in this branch; leaving it means the next person follows stale instructions.

## 4. QA

- [ ] 4.1 **Manual walkthrough** — aligned to §1: print `.env.local` and confirm only `op://` references appear (1.1, 1.2); start dev from a fresh shell in a worktree and exercise an OpenAI-backed route (1.3); disable CLI integration and confirm the failure names 1Password (1.4); have an agent attempt `cat .env.local` and confirm refusal, then confirm a key-name listing still works (1.5, 1.6); run sync in preview against a deliberately drifted variable, then apply and re-run to confirm it reports unchanged (1.7, 1.8, 1.9); follow the runbook cold for one credential (1.10, 1.11).
- [x] 4.2 **Automated smoke** — a vitest check asserting no line in `.env.local` matches a known secret prefix (`sk-`, `sk_live_`, `sk_test_`, `GOCSPX-`, `figd_`), plus a shell test exercising the pre-tool-use guard in both directions. Both must fail before §3 and pass after.
      - `tests/ci/env-read-guard.test.ts` — **24 passing**, both directions.
      - `tests/ci/no-plaintext-secrets.test.ts` — **2 failing by design**, naming `OPENAI_API_KEY`, `STRIPE_SECRET_KEY_LIVE`, `STRIPE_SECRET_KEY_TEST`, `FIGMA_ACCESS_TOKEN`. These stay red until §3.2–3.3 convert the file, which is the point of a failing-first check.
      - Assertion messages name **variables only, never values** — a failing run prints into a public CI log, and a leak guard that leaks would be worse than none.
      - Skips in CI (`describe.skipIf`), because `.env.local` is untracked and no workflow creates one. Verified — so these failures are local-only and do not redden the PR.
- [ ] 4.3 **Post-cutover verification** — run the existing `experiments/simple-seed-organizer/prototype/app/tests/openai-connection.test.ts` against the resolved key, confirming the reference path works end to end and not just at start-up.
- [ ] 4.4 Only after §4.1–4.3 pass: revoke the superseded OpenAI key `…RQcA` and complete the outstanding GitHub Actions + Vercel updates from the 2026-08-16 rotation, which this system now makes a one-command operation.
