# Archive — secrets-management

**Archived:** 2026-08-21 · **Created:** 2026-08-16 · **Tasks:** 20/20
**Outcome:** SHIPPED

1Password (`BHD Labs` vault) is now the single source of truth for hub
credentials: `.env.local` holds only `op://` references, an agent read-guard
blocks bulk env reads, `scripts/sync-secrets.sh` pushes vault values to Vercel
and GitHub Actions (preview-first, idempotent), and preview deploys resolve
credentials at deploy time via a 1Password service account. Katy closed the
loop 2026-08-21 with a cold runbook follow (OpenAI rotation) and revoked the
superseded `…RQcA` key.

**Evidence:** PRs #382/#383/#384 merged 2026-08-18 with vault-sourced values
verified live in prod; PR #396's `Deploy hub` green on `OP_SERVICE_ACCOUNT_TOKEN`
(run 32527585012) and the post-merge main deploy green (run 32531158113);
`scripts/op-preflight.sh`, `docs/SECRETS_RUNBOOK.md`,
`tests/ci/env-read-guard.test.ts` (24 passing) on disk.

**Left open:** `RESEND_API_KEY`, `NODE_AUTH_TOKEN`, `ADMIN_SECRET` exist only in
Vercel and are not in the sync manifest. `OP_SERVICE_ACCOUNT_TOKEN` (bootstrap
secret, unsyncable by design) still needs a `.env.example` registry entry and a
runbook section — queued as its own task. The guard's `python3` gap is a known,
accepted limitation.
