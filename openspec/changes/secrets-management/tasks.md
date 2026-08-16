# Tasks — secrets-management

## 0. Prerequisites (Katy — not code, and they block everything)

- [ ] 0.1 Confirm 1Password account recovery is in order — Emergency Kit saved, recovery contact set. Do this **before** cutover, while plaintext values still exist as a fallback: after cutover, losing vault access means losing local dev.
- [ ] 0.2 Create a standalone `Experiment Hub` vault (not `Private`, not a shared family vault).
- [ ] 0.3 Populate it — one item per vendor, fields per credential: `OpenAI`, `Stripe` (live/test/webhook), `Supabase` (url / service role / publishable), `Figma`, `GitHub dispatch`, `Google OAuth (pdf-metadata-viewer)`.
- [ ] 0.4 Install the Vercel CLI (`npm i -g vercel`) and authenticate it — absent today, and `secret-sync` cannot write to Vercel without it.

## 1. User outcomes (from spec scenarios)

- [ ] 1.1 Printing the env file leaks nothing
- [ ] 1.2 A dedicated vault holds the hub's credentials
- [ ] 1.3 Dev server starts with working credentials
- [ ] 1.4 A broken CLI integration fails loudly, not silently
- [ ] 1.5 An agent attempt to print the env file is refused
- [ ] 1.6 Legitimate key-name inspection still works
- [ ] 1.7 Sync reports drift and corrects it
- [ ] 1.8 Sync previews before it writes
- [ ] 1.9 Orphaned secrets are surfaced, not silently kept
- [ ] 1.10 Rotating a key with no prior context
- [ ] 1.11 The runbook records vendor differences that caused past mistakes

## 2. Prototype shell

- [ ] 2.1 **N/A — no prototype.** This is repo infrastructure (env file, a script, a hook, docs), not an experiment with a running surface. No `experiments/<slug>/prototype/` directory, no port assignment, no `data/prototypes.json` row.

## 3. Implementation

**Cutover — one credential at a time, verifying each before the next.** A bulk rewrite of `.env.local` is the tempting shortcut and the 2026-08-16 rotation is direct evidence against it: that file disagreed with expectations three times in a row.

- [ ] 3.1 Write the failing checks first (see §4.2) so the work ships failing-first per `rules/principles.mdc`.
- [ ] 3.2 Convert `OPENAI_API_KEY` to an `op://` reference; confirm resolution before touching anything else. This is the canary — 11 files consume it.
- [ ] 3.3 Convert the remaining credentials: `STRIPE_SECRET_KEY_LIVE`, `STRIPE_SECRET_KEY_TEST`, `STRIPE_WEBHOOK_SECRET_LIVE`, `STRIPE_WEBHOOK_SECRET_TEST`, `SUPABASE_SERVICE_ROLE_KEY`, `FIGMA_ACCESS_TOKEN`, `GITHUB_DISPATCH_TOKEN`. Leave all non-secret config as literal plaintext.
- [ ] 3.4 Wrap the dev script: `"dev": "op run --env-file=.env.local -- next dev"`. Verify worktree symlink resolution still works from a worktree, not just the main checkout.
- [ ] 3.5 Make a failed resolution loud — start-up must name 1Password as the cause and point at the documented bypass, never start with empty credentials (spec 1.4).
- [ ] 3.6 Update `.env.example` so the registry shows which variables are references and which are plaintext config.
- [ ] 3.7 Add the `.env*` bulk-read guard to `.claude/hooks/pre-tool-use.sh`, with an explicit carve-out for listing key *names* (spec 1.6). Test both directions before committing — a guard that blocks everything is as bad as one that blocks nothing.
- [ ] 3.8 Write `scripts/sync-secrets.sh`: read the vault, diff against Vercel and GitHub Actions, report added / updated / unchanged / orphaned. **Preview by default; writing requires an explicit flag.**
- [ ] 3.9 Handle GitHub *environment* secrets, not just repo secrets — `SUPABASE_URL` and both `NOTION_*_DATA_SOURCE_ID`s live there, which is why they were invisible during the rotation audit.
- [ ] 3.10 Write the rotation runbook: per credential, where it is stored, what consumes it, vendor-specific steps, and the ordering rule (revoke last — revoking early breaks CI and prod while local dev keeps working).
- [ ] 3.11 Reconcile `README.md` (lines 103–104) with the declared `packageManager: pnpm@10.33.0`. Same drift class as the session-start hook fixed in this branch; leaving it means the next person follows stale instructions.

## 4. QA

- [ ] 4.1 **Manual walkthrough** — aligned to §1: print `.env.local` and confirm only `op://` references appear (1.1, 1.2); start dev from a fresh shell in a worktree and exercise an OpenAI-backed route (1.3); disable CLI integration and confirm the failure names 1Password (1.4); have an agent attempt `cat .env.local` and confirm refusal, then confirm a key-name listing still works (1.5, 1.6); run sync in preview against a deliberately drifted variable, then apply and re-run to confirm it reports unchanged (1.7, 1.8, 1.9); follow the runbook cold for one credential (1.10, 1.11).
- [ ] 4.2 **Automated smoke** — a vitest check asserting no line in `.env.local` matches a known secret prefix (`sk-`, `sk_live_`, `sk_test_`, `GOCSPX-`, `figd_`), plus a shell test exercising the pre-tool-use guard in both directions. Both must fail before §3 and pass after.
- [ ] 4.3 **Post-cutover verification** — run the existing `experiments/simple-seed-organizer/prototype/app/tests/openai-connection.test.ts` against the resolved key, confirming the reference path works end to end and not just at start-up.
- [ ] 4.4 Only after §4.1–4.3 pass: revoke the superseded OpenAI key `…RQcA` and complete the outstanding GitHub Actions + Vercel updates from the 2026-08-16 rotation, which this system now makes a one-command operation.
