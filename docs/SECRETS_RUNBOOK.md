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
| 1Password → `BHD Labs` vault | **yes** | by hand, once |
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
- **`STRIPE_WEBHOOK_SECRET_TEST` is intentionally empty** (vault field still the
  scaffold placeholder, `.env.local` line plaintext-blank, verified 2026-08-17).
  No test-mode webhook endpoint exists — the account has test products and
  pricing only — so the secret genuinely does not exist to paste. Nothing
  breaks: the secret only verifies *incoming* webhooks, and Stripe sends none
  without an endpoint. Create a test endpoint when testing ELK's webhook flow
  end-to-end (or use `stripe listen`, which mints its own per-session secret),
  then fill the vault field. Sync refuses `PASTE_VALUE_HERE` as a value, so the
  placeholder can never reach Vercel by accident.

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

### Notion — which database is which

Four Notion databases, and the names do not disambiguate themselves. Parts of
`labs.beckharrisdesign.com` are rendered from two of them, so getting this wrong
changes what the public site shows.

| Variable | Notion database | What it drives |
| --- | --- | --- |
| `NOTION_EXPERIMENTS_DATA_SOURCE_ID` | **BHD Labs Database** | the hub's experiment list + detail pages. Read-only from the app; alternative to the Supabase `experiments` table |
| `NOTION_HISTORY_DATA_SOURCE_ID` | **BHD Labs History** | the History band on public detail pages, approved rows only. Written by `scripts/` via `history-accumulate.yml`, never by the app |
| `NOTION_INVENTORY_DB_ID` | the **Etsy listings** database | **not on the website.** Feeds `etsy-notion-sync.yml` only — SKUs, inventory levels, views, descriptions for shop `WatermarkandHue` (`shop_id` 5568941) |
| — | **BHD Database** | the **portfolio** database (Challenge, TLDR, Year, Themes, Slug). Nothing in this repo reads it |

**`data_source_id` is not `database_id`.** The two `*_DATA_SOURCE_ID`s are *not*
the id in the Notion URL. The hub uses the newer API, where a database contains
data sources with their own ids — fetch with:

```bash
curl -s "https://api.notion.com/v1/databases/<database_id>" \
  -H "Authorization: Bearer $NOTION_TOKEN" -H "Notion-Version: 2025-09-03" \
  | python3 -c 'import json,sys;[print(s["id"],s["name"]) for s in json.load(sys.stdin)["data_sources"]]'
```

`NOTION_INVENTORY_DB_ID` *is* a plain database id — the Python sync pins API
version `2022-06-28`, which predates data sources.

**Token scope is per-database.** Notion integrations are granted page by page, so
a database is invisible to a token until explicitly shared. One token can serve
all of these, but only if every database is connected to that same integration —
check with `POST /v1/search` filtered to `database` before assuming.

**Capabilities are a separate axis from shares** (found 2026-08-17). A token can
*see* a database and still get `403 restricted_resource — "Insufficient
permissions for this endpoint"` on writes: that error means the *integration*
lacks the **Update content** / **Insert content** capability, set at
<https://www.notion.so/profile/integrations>, not a missing share. Reads
succeeding while updates 403 is the fingerprint. Capabilities apply per
integration, so they cover every token of that integration at once.

**To identify whose token you hold** (tokens all look alike): `GET /v1/users/me`
with the token returns the integration's name, and `POST /v1/search` returns
what it can see — both value-free checks. This settled it when the vault token
had to be matched to an integration after the GitHub copy (write-only) was
overwritten.

### Supabase — which project is which

**Two projects, and every key belongs to exactly one of them.** A key from the
wrong project is valid-looking and fails only at runtime — the 2026-08-17 CI
500s were the hub URL paired with the SSO publishable key.

| Project | Ref | Holds | Vault item |
| --- | --- | --- | --- |
| **Experiment Hub 2.0** | `ulqdjuiffpazzixnwwso` | `experiment_submissions`, `experiment_content`, Etsy/ELK/PDF tables | `Supabase experiment-hub` |
| **Simple Seed Organizer** | `orlpgxqbesxvlhlkbnqy` | `seeds`, `user_profiles`, SSO tables | `Supabase simple-seed-organizer` |

- Dashboards: <https://supabase.com/dashboard/project/ulqdjuiffpazzixnwwso/settings/api>
  · <https://supabase.com/dashboard/project/orlpgxqbesxvlhlkbnqy/settings/api>
- When pasting any Supabase key into the vault, confirm the **project name** at
  the top of the dashboard first — the key formats are identical across projects.
- `SUPABASE_SERVICE_ROLE_KEY` bypasses row-level security. Server-side only —
  it must never reach a `NEXT_PUBLIC_*` variable or the browser bundle.
- `lib/pdf-documents.ts` throws without it, so a missing value fails at import
  rather than at call time.

### Figma

- <https://www.figma.com/developers/api#access-tokens> — personal access tokens
  are revoke-and-recreate, no in-place rotate.

### GitHub

- Fine-grained PATs: <https://github.com/settings/tokens?type=beta>
- `GITHUB_DISPATCH_TOKEN` triggers `workflow_dispatch` runs. `secrets.GITHUB_TOKEN`
  is issued per-run by Actions and is **not** rotatable — leave it alone.
- **`Experiment Hub PAT` (classic) is the highest-risk credential in this estate.**
  Scopes include `admin:enterprise`, `admin:org`, `admin:org_hook`,
  `admin:repo_hook`, `admin:ssh_signing_key`, `admin:gpg_key`, `audit_log`,
  `repo`, `user`, `workflow`, `write:packages` — effectively full account
  control, and classic tokens cannot be limited to specific repositories.
  Expires 2026-10-03.
  Treat it as the top rotation priority if it is ever exposed, and prefer
  retiring it: a fine-grained `Experiment Hub FGT` already exists for what looks
  like the same job. Before deleting, establish what still uses it.
  **Do not authenticate the `gh` CLI with it** to work around a missing
  fine-grained permission — that trades a scoped token for total account
  authority to save one settings change.
- **Fine-grained PATs expire, and nothing here warns you.** As of 2026-08-16 there
  are three, all on rolling dates: `Claude Code` (the `gh` CLI — expires
  2026-09-08), `Experiment Hub FGT` (2026-10-14), `Cursor Integration`
  (2026-08-17). An expiry is a silent outage with a timer on it — the failure
  looks like a permissions bug, not an expired credential.
  Check <https://github.com/settings/personal-access-tokens> when a GitHub call
  starts failing for no reason, and record the expiry date on the matching
  1Password item so it is visible next to the value.
- **Editing a fine-grained PAT's permissions does not change its value**;
  *Regenerate token* does. Prefer editing — regenerating means chasing down every
  place the old value was pasted, which for these tokens is not fully knowable.
- **`Actions` is not `Secrets`.** The endpoints live at `/actions/secrets/…`, so a
  token with *Read and Write access to actions* looks like it should work — it
  cannot. GitHub governs secret management with a separate **Secrets**
  permission: `PUT` and `DELETE /repos/{owner}/{repo}/actions/secrets/{name}`
  both require `Secrets: write`, while listing needs `Secrets: read`.
  Useful corollary when identifying which token the CLI holds: if `gh secret
  list` works, that token already has `Secrets: read`, so any token lacking the
  permission entirely is not the one in use.
- **The `gh` CLI's own PAT needs `Secrets: Read and write`** for `sync-secrets.sh`
  to write GitHub targets. Being a repo admin is not sufficient: fine-grained PATs
  grant permissions individually, so a token can list secrets and still fail to
  set or delete them with `403 "Resource not accessible by personal access token"`.
  If sync reports Vercel succeeding while every GitHub variable fails, this is why.

---

## Vault item dates

Items use the **API Credential** category, which carries `valid from` and
`expires` DATE fields. Creating an item with `op item create` leaves both at
`-43140` — **31 December 1969** — so 1Password reports every credential as
expired and shows an error badge. Set both explicitly whenever you add an item:

```bash
op item edit "<item>" --vault "BHD Labs" \
  'valid from[date]=YYYY-MM-DD' 'expires[date]=YYYY-MM-DD'
```

The field cannot be cleared — an empty value is rejected, so it must hold a date.

**Convention as of 2026-08-16:** `expires` is a **rotation review date**, one year
out, not a vendor expiry. Most credentials here never expire on their own, which
is precisely why they rot unnoticed. Where a vendor *does* impose an expiry —
GitHub fine-grained PATs — use the real date instead, so the item and GitHub
agree.

## Vercel will not give you a Sensitive value back

`vercel env ls` shows each variable as **Sensitive** or **Non-sensitive**, and
`vercel env pull` writes the literal string `[SENSITIVE]` for every Sensitive one
rather than the value. There is no flag that changes this — Sensitive means
write-only, the same as GitHub Actions secrets.

So Vercel is **not** a recovery source for most credentials. Only Non-sensitive
variables can be read back, and as of 2026-08-16 that is just `SUPABASE_URL`,
`SUPABASE_SERVICE_ROLE_KEY`, and `ADMIN_SECRET` — the last two arguably
mislabelled, since a service-role key bypasses row-level security and should be
Sensitive.

`sync-secrets.sh` refuses to push `[SENSITIVE]` for exactly this reason. If a
migration ever appears to succeed but every value is 11 characters long, this is
what happened.

## Rotating, step by step

1. **Roll or recreate** at the vendor, using the notes above. Do not revoke yet.
2. **Update the 1Password item** in the `BHD Labs` vault — one item per
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
`pnpm dev`. The dev script runs `scripts/op-preflight.sh` first, so the failure
is a message pointing here — not Next starting with empty credentials and
failing three layers deep. In order of likelihood:

- **Desktop app locked or quit.** Unlock it. The CLI delegates auth to the app
  and has no session of its own — `op whoami` reporting "account is not signed
  in" is normal and is *not* a useful readiness check. Use `op vault list`.
- **Integration toggle off.** 1Password → Settings → Developer → *Integrate with
  1Password CLI*. Quit the app fully (⌘Q) and reopen.
- **macOS denying the calling app access to 1Password's data.** Symptom: `op`
  reports "No accounts configured" even though the app is running and the
  integration toggle is on. `op vault list --debug` names it: *"operation not
  permitted"* reading `settings.json` under 1Password's Group Container — the
  app your shell runs inside (e.g. the Claude desktop app, observed 2026-08-17)
  lacks the macOS privacy grant to read another app's data. Fix: run from a
  terminal that has the permission, or grant the hosting app access in System
  Settings → Privacy & Security (Full Disk Access is the blunt but reliable
  option). The toggle being on in 1Password cannot fix this; it is a grant to
  the *calling* app, not a 1Password setting.
- **Genuinely blocked and you need to work now.** Read the values you need with
  `op read 'op://BHD Labs/<item>/<field>'` and export them into your shell
  for that session only. Do **not** paste them back into `.env.local` — a
  temporary plaintext copy that outlives the emergency is the exact problem this
  system removed.

**Losing vault access means losing local dev.** Confirm the 1Password Emergency
Kit and a recovery contact are in place; that is cheap insurance and it must be
done before it is needed.
