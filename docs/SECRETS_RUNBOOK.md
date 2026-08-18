# Secrets runbook

## The mental model

**One master copy; everything else is derived from it and can be regenerated.**

```mermaid
flowchart LR
    V["1Password vault: BHD Labs\n(edit values ONLY here)"]
    E[".env.local\nholds op:// pointers, never values"]
    D["pnpm dev\nfills real values at startup"]
    VC["Vercel\n(takes effect next deploy)"]
    GH["GitHub Actions\n(takes effect next workflow run)"]
    V -- "pointers" --> E --> D
    V -- "sync --apply" --> VC
    V -- "sync --apply" --> GH
```

- The vault is the only place a value is **edited**. Vercel and GitHub hold
  copies because they can't read the vault at runtime — but the next sync
  overwrites them, so editing those dashboards by hand is wasted work.
- `.env.local` contains no secrets, only pointers — printing it leaks nothing.
- Because of this shape, rotating **any** credential is always the same five
  steps, whatever the vendor:
  **create new at vendor → paste into the vault item → push → verify → revoke old.**

What variable exists where: `.env.example` is the registry (names + provenance, no values).

```bash
bash scripts/sync-secrets.sh          # preview what would change
bash scripts/sync-secrets.sh --apply  # push to Vercel + GitHub Actions
```

**Revoke LAST.** Revoking early breaks CI and prod while local dev keeps working —
the most confusing failure available. Vercel values only take effect on the
**next deploy**; GitHub values apply on the next workflow run.

## Where you rotate

Your part is two steps: **create the new value at the link below, paste it into
the vault item.** Then run the sync (or ask Claude to), verify, revoke.

| Vault item | You rotate at | Watch out |
| --- | --- | --- |
| OpenAI | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | keys live under the **project**, not "User API keys" |
| Stripe | [live keys](https://dashboard.stripe.com/apikeys) · [test keys](https://dashboard.stripe.com/test/apikeys) | rolls with a grace period. Webhook secrets are separate, under the **endpoint** |
| Supabase experiment-hub | [settings → API](https://supabase.com/dashboard/project/ulqdjuiffpazzixnwwso/settings/api) | confirm the project name — keys look identical across projects |
| Supabase simple-seed-organizer | [settings → API](https://supabase.com/dashboard/project/orlpgxqbesxvlhlkbnqy/settings/api) | same warning, other direction |
| Google OAuth pdf-metadata-viewer | [console credentials](https://console.cloud.google.com/apis/credentials) → `pdf-metadata-viewer web` | reset is an **instant kill**, no grace — push to Vercel in the same sitting |
| Notion | [integrations](https://www.notion.so/profile/integrations) → **BHD Portfolio** | needs Update/Insert **capabilities** + a connection to each database |
| Figma | [Settings → Security → PATs](https://www.figma.com/developers/api#access-tokens) | |
| GitHub | [fine-grained PATs](https://github.com/settings/tokens?type=beta) | prefer **editing** permissions (keeps the value) over regenerating |
| Etsy | [etsy.com/developers/your-apps](https://www.etsy.com/developers/your-apps) | |
| Vercel | [account → tokens](https://vercel.com/account/settings/tokens) | tokens are never re-viewable |
| PDF session | nowhere — mint any long random string | only invalidates live sessions |

<details>
<summary>How each credential gets verified after a push (Claude's job — just ask "verify the &lt;vendor&gt; credential")</summary>

OpenAI → `experiments/simple-seed-organizer/prototype/app/tests/openai-connection.test.ts` ·
Stripe → ELK checkout ·
Supabase hub → prod page load ·
Supabase SSO → SSO live test in CI ·
Google → PDF viewer sign-in ·
Notion / Etsy → dispatch `etsy-notion-sync.yml` ·
GitHub dispatch token → hub "Sync now" button ·
Vercel → `deploy-hub.yml` ·
PDF session → PDF viewer sign-in

</details>

## Rules that were each learned the hard way

- **Deployed copies are write-only.** GitHub secrets can't be read back; Vercel
  Sensitive values read back as `[SENSITIVE]`. The vault is the only recoverable
  copy — sync overwriting a target destroys the old value forever.
- **Environment secrets hide.** `gh secret list` shows repo secrets only; add
  `--env "Production – experiment-hub"` (en-dash) for the rest.
- **Keys look identical across Supabase projects.** Hub tables live in
  `ulqdjuiffpazzixnwwso`, SSO tables in `orlpgxqbesxvlhlkbnqy`. Confirm the
  project name before pasting anything.
- **Notion 403 `restricted_resource` on a write = missing capability, not a
  missing share.** Capabilities (Update/Insert content) are per-integration, in
  integration settings. Identify any token with `GET /v1/users/me`; list what it
  sees with `POST /v1/search`.
- **GitHub `Actions` permission ≠ `Secrets` permission.** `gh secret set` needs
  `Secrets: Read and write` on the PAT; repo admin is not sufficient.
- **Fine-grained PATs expire silently.** A GitHub call failing "for no reason" —
  check [expiry dates](https://github.com/settings/personal-access-tokens) first,
  and record the date on the 1Password item.
- **`op item create` writes epoch dates.** Set `valid from`/`expires` explicitly
  or 1Password badges the item as expired since 1969.
- **Sweep `~/Downloads` after any Google credential reset:**
  `grep -rlE "GOCSPX-|sk_live_|sk-proj-|ntn_|github_pat_|figd_|whsec_" ~/Downloads`

## Which Notion database is which

| Variable | Database | Drives |
| --- | --- | --- |
| `NOTION_EXPERIMENTS_DATA_SOURCE_ID` | BHD Labs Database | hub experiment list + detail pages (public site) |
| `NOTION_HISTORY_DATA_SOURCE_ID` | BHD Labs History | History band on detail pages (public site) |
| `NOTION_INVENTORY_DB_ID` | Etsy listings | `etsy-notion-sync.yml` only — not the website |

The two `*_DATA_SOURCE_ID`s are **not** the id in the Notion URL — fetch data
sources via `GET /v1/databases/<database_id>` (API version `2025-09-03`).
`NOTION_INVENTORY_DB_ID` *is* a plain database id (the Python sync pins `2022-06-28`).

## Intentionally empty

`STRIPE_WEBHOOK_SECRET_TEST` — no test-mode webhook endpoint exists (live-only at
this scale). Sync refuses the `PASTE_VALUE_HERE` placeholder, so it can never be
pushed by accident. Create a test endpoint if ELK's webhook flow ever needs
end-to-end testing.

## If 1Password is unavailable

`pnpm dev` runs `scripts/op-preflight.sh` and fails pointing here. Readiness
check is `op vault list` (`op whoami` lies under app integration). Causes, in
order: app quit/locked → open it · integration toggle off → 1Password Settings →
Developer → *Integrate with 1Password CLI*, then ⌘Q and reopen · macOS denying
the calling app (op says "No accounts configured" with everything on) → run from
a terminal that has the grant, or System Settings → Privacy & Security.
Emergency bypass, per shell only: `export KEY="$(op read 'op://BHD Labs/<item>/<field>')"` —
never paste values back into `.env.local`.
