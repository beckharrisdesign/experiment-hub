# Spec: Etsy → Notion Inventory Sync + Historical Data Capture (v2)

> Authored by Katy (2026-07-15). This is the build contract for the experiment.
> Direction is one-way Etsy → Notion only; the system never writes to Etsy.

Confirmed one more useful endpoint detail: Etsy also exposes `GET /v3/application/listings/{listing_id}/inventory` (`getListingInventory`), which returns per-variation data (`products`, `price_on_property`, `quantity_on_property`, `sku_on_property`, `readiness_state_on_property`) — this is the deepest level of field data Etsy exposes for a listing, so the spec below has the capture layer pull this too, not just the top-level listing fields.

## Goal

Build a lightweight, scheduled system with two responsibilities: (1) keep a Notion "Inventory" database in sync with live Etsy shop listings (as before), and (2) capture a full, versioned historical record of shop data over time so the seller can do time-based analysis (price changes, stock depletion, view/favorite trends, listing lifecycle, etc.). Etsy is the source of truth; the system only ever reads from Etsy and writes to its own data store plus Notion. It never writes back to Etsy.

## Why this approach

Etsy's API Terms of Use prohibit screen-scraping or sidestepping the API. This design uses only the official, OAuth-authenticated Etsy Open API **v3** (`https://openapi.etsy.com/v3/application/...`), via the seller's existing registered Seller App. All requests and stored records must be explicitly tagged with the API version (`v3`) they came from, so that if Etsy ships a v4 in the future, historical data stays interpretable and the migration is traceable.

## Data sources (Etsy Open API v3)

- `GET /v3/application/shops/{shop_id}/listings` (`getListingsByShop`) — shop-level listing list, paginated, filterable by `state`, supports `includes=Shipping,Images,Shop,User,Translations,Inventory,Videos,Personalization,BuyerPrice` for the widest single-call field coverage.
- `GET /v3/application/listings/{listing_id}` (`getListing`) — single listing with full schema (title, description, rich_description, timestamps, quantity, tags, materials, shipping profile, taxonomy, pricing, views, favorers, personalization, buyer_price, etc.)
- `GET /v3/application/listings/{listing_id}/inventory` (`getListingInventory`) — per-variation/offering-level detail: products, price_on_property, quantity_on_property, sku_on_property, readiness_state_on_property.
- Auth: `x-api-key` header + OAuth bearer token, scope `listings_r`.
- Rate limits: per-key QPS + rolling 24-hour QPD; `x-remaining-today` / `x-remaining-this-second` response headers show live quota; on `429`, obey `retry-after`.

## Requirement: capture every available field, and stay forward-compatible

1. **No field allow-list.** Do not hand-pick specific fields to store. Instead, capture and persist the entire raw JSON response from each Etsy API call, unmodified, alongside any parsed/normalized fields you derive from it. This guarantees that if Etsy adds a new field to a response tomorrow, it's automatically captured in the raw payload even before the sync code is updated to recognize it.
2. **Schema drift detection.** On each run, diff the set of top-level (and one-level-nested) keys seen in the current response against the set seen in the previous run. If new keys appear, log a "new field detected" notice (field name, endpoint, sample value) so the seller/developer knows to consider surfacing it in Notion or analysis views.
3. **Version tagging.** Every stored record must include: the literal API version string (`"etsy_api_version": "v3"`), the exact endpoint path called, and the timestamp of the call. This makes it possible to distinguish "the data changed" from "the API version/shape changed" during later analysis, and gives a clear upgrade path if Etsy releases v4.
4. **Use the widest `includes`.** Always request the maximum set of valid `includes` values the endpoint supports, so each snapshot has as complete a picture as a single call allows without needing extra round-trips.

## Requirement: data capture mechanism with ancestry (time-based analysis)

1. **Append-only, never overwrite.** Every run writes new rows/records; existing historical records are never mutated or deleted. This is the core requirement for ancestry — the store is a log, not a snapshot-in-place.
2. **Each record represents "this is what listing X looked like at time T."** Suggested minimal record shape:

   ```json
   {
     "captured_at": "2026-07-15T14:00:00Z",
     "etsy_api_version": "v3",
     "endpoint": "/v3/application/shops/{shop_id}/listings",
     "listing_id": 123456789,
     "sku": "WH-UN-S-929E",
     "raw_response": { "...": "full untouched JSON" },
     "parsed": {
       "title": "...", "price": 6.00, "quantity": 50, "state": "active",
       "views": 12, "num_favorers": 1, "last_modified_timestamp": 1234567890, "...": "..."
     },
     "previous_record_id": "<id of the prior record for this listing_id, or null if first-ever capture>"
   }
   ```

   The `previous_record_id` (or an equivalent parent-pointer / lineage field) is the "ancestry" chain: each new capture for a given listing points back to the capture before it, so a full history for any listing can be walked backward in time without relying solely on timestamp sorting — useful if records are ever merged, migrated, or re-ordered.
3. **Storage choice left flexible but must support time-series queries.** A local append-only file (e.g. daily JSONL files) is enough to start; a lightweight embedded database (SQLite) with a `listing_snapshots` table indexed on `(listing_id, captured_at)` is the recommended upgrade path once the seller wants real querying/analysis (e.g. "show me every price this SKU has ever had," "plot inventory depletion over time," "how many days was this listing sold out").
4. **Notion sync is a derived, current-state view — not the historical store.** The Notion database continues to reflect only the latest known state (as in the original spec); the ancestry/history lives in the separate capture store described above. Keep these concerns separate: Notion is the "what's true right now" view for the seller's day-to-day workflow, the append-only store is the "what was true over time" analytical archive.

## Fields synced to Notion (unchanged from v1, still current-state only)

- Price → "Single price sum," Quantity → "Inventory value," Listing state → "Status" (map Etsy `active`/`inactive`/etc. to the matching Notion select options — confirm exact option names before writing).
- Only write fields that changed since the last sync.

## Guardrails (carried over and extended)

1. **Dry-run by default** (`DRY_RUN=true`) for the Notion-write step specifically; the historical capture step is read-only against Etsy and append-only locally, so it's inherently safe to always run.
2. **Credentials only via environment variables**: `ETSY_API_KEY`, `ETSY_OAUTH_TOKEN`, `ETSY_SHOP_ID`, `NOTION_TOKEN`, `NOTION_INVENTORY_DB_ID`.
3. **Respect rate limits explicitly**: read `x-remaining-today` / `x-remaining-this-second` on every response; if remaining quota drops below a safety threshold (e.g. 10%), pause the run and resume next scheduled cycle rather than push through; always honor `429` + `retry-after`.
4. **Gentle pacing** between paginated calls (e.g. 200ms), since this is a scheduled batch job, not a poller.
5. **One-directional only**: never call any Etsy write/update/delete endpoint from this system.
6. **Full audit logging** per run: endpoint called, records fetched, new fields detected, Notion diffs applied, and quota remaining at end of run.
7. **Idempotent Notion sync step**: re-running with no upstream changes produces zero Notion writes (the historical capture step, being append-only, will still write a new "no change" snapshot each run — that's expected and desired for ancestry).

## Suggested project shape

```
etsy-notion-sync/
  capture.py           # pulls full Etsy data, writes append-only historical records (SQLite or JSONL)
  sync_notion.py       # reads latest captured state, diffs against Notion, writes only changed fields
  schema_watch.py      # (or inline) detects and logs new/unexpected fields in raw responses
  requirements.txt
  .env.example
  README.md            # setup, OAuth token acquisition, schema of the historical store, how to query history
```

## Deployment options

- Local cron (daily) or scheduled GitHub Actions (private repo, encrypted secrets) — same as before, now running both `capture.py` and `sync_notion.py` in sequence each cycle.

## Explicitly out of scope

- Any Etsy write/update/delete calls.
- Bidirectional sync (Notion → Etsy).
- Browser automation or scraping of either platform.
- Financial account or payment data handling.

## One-time manual setup (user, not the script)

- Complete Etsy's OAuth 2.0 flow once for the Seller App to obtain `ETSY_OAUTH_TOKEN` (+ refresh token).
- Create a Notion internal integration, share the Inventory database with it, and note the database's data-source ID.
- Decide initial storage backend for the historical capture store (JSONL to start is fine; SQLite recommended once real analysis begins).
