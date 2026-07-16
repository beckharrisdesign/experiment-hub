# Etsy → Notion Sync

Read-only exploration of the Etsy Open API v3: captures a full, append-only
history of shop listings into SQLite, then mirrors the latest state into a
Notion "Inventory" database. One-directional (Etsy → Notion) by design — no
Etsy write endpoint exists anywhere in this code.

Spec: [../docs/SPEC.md](../docs/SPEC.md) · PRD: [../docs/PRD.md](../docs/PRD.md)

## Layout

| File | Role |
| --- | --- |
| `capture.py` | Pulls all listings (widest `includes`) + per-listing inventory; appends version-tagged snapshots to SQLite |
| `sync_notion.py` | Diffs latest captured state against Notion; writes only changed fields; `DRY_RUN=true` by default |
| `schema_watch.py` | Detects new/unexpected fields in raw responses ("new field detected" notices) |
| `etsy_api.py` | GET-only Etsy v3 client: auth headers, pacing, `429`/`retry-after`, quota floor |
| `oauth_helper.py` | One-time OAuth 2.0 PKCE browser flow + `--refresh` token rotation for cron |
| `notion_api.py` | Minimal Notion client (database schema, paginated query, page update) |
| `store.py` | Append-only SQLite store: `listing_snapshots` (with ancestry), `schema_keys`, `runs` audit table |
| `env.py` | Shared dotenv loading: local `.env` first, repo root `.env.local` as fallback |

## Setup

```bash
cd experiments/etsy-notion-sync/prototype
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in credentials
```

Credentials live only in env files / environment variables (never committed).
Every entry point loads them with this precedence (via `env.py`):

1. real environment variables
2. the prototype's local `.env` (wins over the fallback when present)
3. the repo root `.env.local` — the canonical shared location (see
   `/.env.example`), so keys used by both the hub and experiments
   (`NOTION_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) only need
   to be set once. Etsy-specific keys stay in the local `.env` because
   `oauth_helper.py --write-env` rewrites tokens there.

The prototype stays runnable standalone: outside the repo (no `.env.local`
or `.git` in any parent directory) only the local `.env` is loaded.

Credential setup:

- **Etsy** — one-time OAuth 2.0 flow (scope `listings_r`), automated by the helper:
  1. In the [Etsy developer portal](https://www.etsy.com/developers/your-apps),
     copy your Seller App's **keystring** into `ETSY_API_KEY` and its
     **shared secret** into `ETSY_SHARED_SECRET` in `.env` (Etsy requires both
     in the `x-api-key` header since 2026-02-09), and add
     `http://localhost:8181/callback` to the app's **Callback URLs**.
  2. Run `python oauth_helper.py --write-env`. It opens etsy.com in your
     browser; sign in and click **Grant access**. The helper catches the
     redirect, exchanges the code (PKCE), looks up your `ETSY_SHOP_ID`, and
     writes `ETSY_OAUTH_TOKEN` / `ETSY_REFRESH_TOKEN` / `ETSY_SHOP_ID` into `.env`.
  3. Access tokens expire after **1 hour**; refresh tokens last ~90 days and
     rotate on use. Scheduled runs refresh first:
     `python oauth_helper.py --refresh --write-env`. (If the refresh token
     ever lapses — e.g. the job didn't run for 90+ days — just redo step 2.)
- **Notion**: create an internal integration, share the Inventory database
  with it, set `NOTION_TOKEN` (fine to keep in the repo root `.env.local`)
  + `NOTION_INVENTORY_DB_ID`.
- Property mapping (defaults match the real Inventory database): rows match
  on `Etsy Listing ID` first, `SKU` as fallback; price writes to `Etsy price`
  and quantity to `Inventory level` (both plain numbers — Notion's API cannot
  write rollups/formulas like `Single price sum` or `Inventory value`). The
  sync validates Status options against the live schema and skips anything
  that doesn't match, so a mismatch is safe but produces warnings instead of
  updates.

## Run

```bash
python capture.py       # always safe: read-only vs Etsy, append-only locally
python sync_notion.py   # DRY_RUN=true by default — logs the plan, writes nothing
DRY_RUN=false python sync_notion.py   # real Notion writes
```

Each capture run appends one snapshot per listing per endpoint (listings +
inventory), even when nothing changed — that's intentional; the history store
is a log. Run summaries (counts, new fields, quota remaining) go to stdout
and the `runs` table.

## Tests (offline, no credentials needed)

```bash
python -m pytest
```

## Querying history

```bash
sqlite3 data/etsy_history.sqlite3
```

```sql
-- Every price a SKU has ever had
SELECT captured_at, json_extract(parsed, '$.price') AS price
FROM listing_snapshots
WHERE sku LIKE '%WH-UN-S-929E%'
  AND endpoint = '/v3/application/shops/{shop_id}/listings'
ORDER BY captured_at;

-- Inventory depletion over time for one listing
SELECT captured_at, json_extract(parsed, '$.quantity') AS quantity
FROM listing_snapshots
WHERE listing_id = 123456789
  AND endpoint = '/v3/application/shops/{shop_id}/listings'
ORDER BY captured_at;

-- Walk the ancestry chain backward from the newest snapshot
WITH RECURSIVE chain(id, previous_record_id, captured_at) AS (
  SELECT id, previous_record_id, captured_at FROM listing_snapshots
  WHERE listing_id = 123456789 AND endpoint LIKE '%/listings'
  ORDER BY id DESC LIMIT 1
  UNION ALL
  SELECT s.id, s.previous_record_id, s.captured_at
  FROM listing_snapshots s JOIN chain c ON s.id = c.previous_record_id
)
SELECT * FROM chain;

-- Schema drift: fields Etsy added since the first run
SELECT endpoint, key, first_seen_at FROM schema_keys
WHERE first_seen_at > (SELECT MIN(first_seen_at) FROM schema_keys)
ORDER BY first_seen_at DESC;
```

## Scheduling

### Server-side (canonical): GitHub Actions + Supabase

`.github/workflows/etsy-notion-sync.yml` runs `scheduled_run.py` daily (and on
`workflow_dispatch` from the hub's "Sync now" button). In this mode:

- The store is Supabase (`STORE_BACKEND=supabase`): `etsy_listing_snapshots`,
  `etsy_runs`, `etsy_schema_keys` — same append-only semantics, enforced by
  DB triggers, service-role-only RLS.
- Etsy tokens live in the `etsy_tokens` table (Etsy rotates refresh tokens on
  every use, so a static secret can't hold them). Seed once after the browser
  flow: `python oauth_helper.py --to-supabase`.
- Repo secrets: `ETSY_API_KEY`, `ETSY_SHARED_SECRET`, `ETSY_SHOP_ID`,
  `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NOTION_TOKEN`,
  `NOTION_INVENTORY_DB_ID`.
- Etsy is the source of truth: the workflow captures every listing state
  (`ETSY_LISTING_STATES` defaults to all five), and listings with no matching
  Notion row are auto-created with their listing id, title, price, quantity,
  and status — so a listing made on the fly shows up in Notion the next run.
  (Status values need matching options on the Notion Status property; unknown
  options are skipped with a warning.)
  Repo variable `ETSY_SYNC_DRY_RUN=false` flips real Notion writes on
  (defaults to dry-run when unset — no commit needed either way).

### Local cron (fallback)

```cron
0 6 * * * cd /path/to/experiments/etsy-notion-sync/prototype && .venv/bin/python oauth_helper.py --refresh --write-env && .venv/bin/python capture.py && .venv/bin/python sync_notion.py >> sync.log 2>&1
```

The refresh step must come first: Etsy access tokens only live for an hour,
so yesterday's token is always stale by the next scheduled run. Local runs
default to `STORE_BACKEND=sqlite` (`data/etsy_history.sqlite3`).

## Guardrails recap

- Etsy client is GET-only; there is no code path that writes to Etsy.
- `DRY_RUN=true` is the default for the Notion step.
- Quota headers are read on every response; the run pauses below
  `QUOTA_SAFETY_FLOOR` (default 10%) and resumes next cycle.
- `429` + `retry-after` honored; ~200ms pacing between calls.
- Every snapshot is tagged `etsy_api_version=v3` + endpoint + timestamp.
