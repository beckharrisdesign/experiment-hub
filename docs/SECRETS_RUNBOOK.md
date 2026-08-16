# Secrets runbook

Where every credential lives, what reads it, and how to rotate it.

Written because the 2026-08-16 rotation took two days, most of it spent
rediscovering things that were already known — which vendor supports in-place
rotation, which places hold a copy, and what order avoids an outage.

> **The registry is `.env.example`.** It lists every variable with its
> provenance and no values. Check it before hunting for a credential; the answer
> is usually that you already have one.

---

## The ordering rule

**Revoke last. Always.**

Create the new credential → update every consumer → verify with a real call →
*then* revoke the old one.

Both credentials are valid simultaneously at every vendor here, so overlapping
costs nothing and gapping costs an outage. More importantly, revoking early
produces the most confusing failure mode available: **CI and production break
while local dev keeps working perfectly**, because local was the thing you just
updated. That nearly happened on 2026-08-16.

## Where copies live

| Location | Authoritative? | How it is written |
| --- | --- | --- |
| 1Password → `Experiment Hub` vault | **yes** | by hand, once |
| `.env.local` (repo root, symlinked into every worktree) | no — holds `op://` references | edited once at migration |
| Vercel → Production env vars | no — derived | `scripts/sync-secrets.sh --apply` |
| GitHub Actions → **repo** secrets | no — derived | `scripts/sync-secrets.sh --apply` |
| GitHub Actions → **environment** secrets | no — derived | `scripts/sync-secrets.sh --apply` |

Environment secrets are the ones that hide. `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, and both `NOTION_*_DATA_SOURCE_ID`s are referenced
by workflows but do **not** appear in `gh secret list`, because that command
shows repo secrets only. Use `gh secret list --env <name>`.

---

## Per-vendor rotation

### OpenAI

**No in-place rotate.** Keys are shown once at creation and cannot be re-read or
re-issued, so rotation is always create-then-revoke.

- Dashboard: <https://platform.openai.com/api-keys>
- Keys live under the **project**, not the legacy "User API keys" list. Create
  the replacement in the same project so scoping matches.
- Consumed by 11 files across `packages/ai-utils`, Simple Seed Organizer, and
  Etsy Listing Manager.
- Verify with `experiments/simple-seed-organizer/prototype/app/tests/openai-connection.test.ts`
  before revoking.

### Stripe

**Rolls with a grace period** — the one vendor here that does. Rolling lets the
old key keep working for a chosen window, so there is no reason to gap.

- Live: <https://dashboard.stripe.com/apikeys> · Test: <https://dashboard.stripe.com/test/apikeys>
- `STRIPE_MODE` selects which key the code uses. `lib/etsy-listing-kit/stripe.ts`
  treats **anything other than `live` as test** — so a blank or misspelled value
  silently means test mode.
- Webhook signing secrets (`STRIPE_WEBHOOK_SECRET_*`) are separate credentials
  with their own rotation, found under the webhook endpoint, not the API keys page.

### Google OAuth (pdf-metadata-viewer)

- Console: <https://console.cloud.google.com/apis/credentials> → OAuth client
  `pdf-metadata-viewer web`
- Resetting the client secret invalidates the old one immediately — **no grace
  period** — so update Vercel in the same sitting.
- Removing a secret from disk does **not** revoke it. A leaked client secret is
  live until reset in the Console.
- Related non-secret settings that break things when wrong: the redirect URI must
  match character-exactly, and publishing status must be **Published**, not
  Testing — apps left in Testing get refresh tokens that expire after 7 days.

### Supabase

- Dashboard: <https://supabase.com/dashboard/project/ulqdjuiffpazzixnwwso/settings/api>
- `SUPABASE_SERVICE_ROLE_KEY` bypasses row-level security. Server-side only —
  it must never reach a `NEXT_PUBLIC_*` variable or the browser bundle.
- `lib/pdf-documents.ts` throws without it, so a missing value fails at import
  rather than at call time.

### Figma

- <https://www.figma.com/developers/api#access-tokens> — personal access tokens
  are revoke-and-recreate, no in-place rotate.

### GitHub

- Fine-grained PATs: <https://github.com/settings/tokens>
- `GITHUB_DISPATCH_TOKEN` triggers `workflow_dispatch` runs. `secrets.GITHUB_TOKEN`
  is issued per-run by Actions and is **not** rotatable — leave it alone.

---

## Rotating, step by step

1. **Roll or recreate** at the vendor, using the notes above. Do not revoke yet.
2. **Update the 1Password item** in the `Experiment Hub` vault — one item per
   vendor, so this is a single edit even for multi-field vendors like Stripe.
3. **Local picks it up automatically.** `.env.local` holds an `op://` reference,
   so there is nothing to edit and no restart-with-stale-env failure mode.
4. **Preview the sync:**
   ```bash
   ./scripts/sync-secrets.sh
   ```
   Reports what would change in Vercel and GitHub Actions. Writes nothing.
5. **Apply it:**
   ```bash
   ./scripts/sync-secrets.sh --apply
   ```
6. **Redeploy.** Env-only changes do not trigger a build and Vercel's git
   auto-deploy is off — run **Deploy Hub** on `main`:
   <https://github.com/beckharrisdesign/experiment-hub/actions/workflows/deploy-hub.yml>
7. **Verify with a real call** — the vendor's test above, or any route that
   exercises the credential in production.
8. **Now revoke** the old credential.

## If 1Password is unavailable

`op run` is a hard dependency of local dev, so a broken CLI integration stops
`pnpm dev`. In order of likelihood:

- **Desktop app locked or quit.** Unlock it. The CLI delegates auth to the app
  and has no session of its own — `op whoami` reporting "account is not signed
  in" is normal and is *not* a useful readiness check. Use `op vault list`.
- **Integration toggle off.** 1Password → Settings → Developer → *Integrate with
  1Password CLI*. Quit the app fully (⌘Q) and reopen.
- **Genuinely blocked and you need to work now.** Read the values you need with
  `op read 'op://Experiment Hub/<item>/<field>'` and export them into your shell
  for that session only. Do **not** paste them back into `.env.local` — a
  temporary plaintext copy that outlives the emergency is the exact problem this
  system removed.

**Losing vault access means losing local dev.** Confirm the 1Password Emergency
Kit and a recovery contact are in place; that is cheap insurance and it must be
done before it is needed.
