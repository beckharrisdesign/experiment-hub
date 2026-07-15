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
| `notion_api.py` | Minimal Notion client (database schema, paginated query, page update) |
| `store.py` | Append-only SQLite store: `listing_snapshots` (with ancestry), `schema_keys`, `runs` audit table |

## Setup

```bash
cd experiments/etsy-notion-sync/prototype
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then fill in credentials
```

Credentials live only in `.env` / environment variables (never committed):

- **Etsy**: complete the Seller App OAuth 2.0 flow once (scope `listings_r`)
  to get `ETSY_OAUTH_TOKEN`; `ETSY_API_KEY` is the app keystring. See
  [Etsy's OAuth docs](https://developers.etsy.com/documentation/essentials/authentication).
- **Notion**: create an internal integration, share the Inventory database
  with it, set `NOTION_TOKEN` + `NOTION_INVENTORY_DB_ID`.
- Confirm the property names in `.env` match the Notion database exactly
  (`SKU`, `Single price sum`, `Inventory value`, `Status`). The sync validates
  Status options against the live schema and skips anything that doesn't
  match, so a mismatch is safe but produces warnings instead of updates.

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

Local cron (daily), running both steps in sequence:

```cron
0 6 * * * cd /path/to/experiments/etsy-notion-sync/prototype && .venv/bin/python capture.py && .venv/bin/python sync_notion.py >> sync.log 2>&1
```

GitHub Actions on a schedule works too (private repo, secrets for the env
vars) — the store would then need to live somewhere persistent (artifact,
committed DB, or a small remote store), so start with local cron.

## Guardrails recap

- Etsy client is GET-only; there is no code path that writes to Etsy.
- `DRY_RUN=true` is the default for the Notion step.
- Quota headers are read on every response; the run pauses below
  `QUOTA_SAFETY_FLOOR` (default 10%) and resumes next cycle.
- `429` + `retry-after` honored; ~200ms pacing between calls.
- Every snapshot is tagged `etsy_api_version=v3` + endpoint + timestamp.
