# Etsy → Notion Sync - PRD

## Overview

A scheduled, read-only tool that explores the Etsy Open API v3 by capturing a complete, versioned history of shop listing data and mirroring the current state into an existing Notion "Inventory" database. It's for a solo Etsy seller who runs their day-to-day inventory workflow in Notion but wants Etsy to stay the single source of truth. Full technical detail lives in [SPEC.md](SPEC.md).

---

## Problem Statement

- Keeping the Notion inventory database in step with the live Etsy shop is manual today — prices, quantities, and listing states drift out of date.
- Etsy only shows current state; there is no way to answer time-based questions ("every price this SKU has had," "when did this sell out," "view trend since March") because past states are never recorded.
- Etsy's terms prohibit scraping, so any tooling must go through the official OAuth v3 API — nothing off-the-shelf does this capture + Notion mirror combination for a solo shop.

---

## Goals & Objectives

1. Capture every field Etsy exposes for each listing (raw JSON, append-only, version-tagged) so historical analysis is possible later without re-instrumenting.
2. Keep the Notion Inventory database's price, quantity, and status current with zero manual entry.
3. Learn the practical shape of Etsy API v3 (auth, rate limits, includes, inventory endpoint) as groundwork for future Etsy experiments.

---

## Target User

**Primary**: Katy, as a solo Etsy seller who manages inventory in Notion and wants live shop data flowing in automatically, plus a queryable history for pricing and stock decisions.

**Not for**: Multi-shop agencies or anyone needing to push edits back to Etsy — this is strictly one-directional (Etsy → Notion).

---

## Core Features

### MVP scope

- **Historical capture (`capture.py`)**: Pulls all shop listings (widest `includes`) plus per-listing inventory, and appends full raw responses to a local SQLite store with `captured_at`, `etsy_api_version`, endpoint, and a `previous_record_id` ancestry pointer per listing.
- **Schema drift detection (`schema_watch.py`)**: Diffs top-level and one-level-nested response keys against everything seen before and logs "new field detected" notices, so API additions surface automatically.
- **Notion sync (`sync_notion.py`)**: Reads the latest captured state, matches Notion rows by SKU, and writes only changed values to "Single price sum," "Inventory value," and "Status" — dry-run by default (`DRY_RUN=true`).
- **Rate-limit guardrails**: Reads Etsy quota headers on every response, paces calls (~200ms), honors `429` + `retry-after`, and pauses the run when remaining daily quota drops below a safety floor.

**Out of scope for MVP**: Etsy writes of any kind, Notion → Etsy direction, orders/receipts data, image/asset syncing, a UI, hosted deployment (local cron is fine).

---

## Success Metrics

**Outcomes (plain language — what "good" means):**

- After a scheduled run, the Notion Inventory database matches the live Etsy shop for price, quantity, and status — without manual edits.
- The history store can answer time-based questions (e.g. list every distinct price a SKU has had, with timestamps) using plain SQL.

**Failing tests (write these first; each stays false until the outcome is true):**

- Fails until: `pytest` suite passes — capture writes ancestry-chained snapshots, drift detection flags a new key, sync plans only changed fields, dry-run performs zero writes.
- Fails until: two consecutive real runs against the live shop complete within quota, and the second run with no shop changes produces zero Notion writes (idempotency).
- Fails until: a SQL query over `listing_snapshots` returns the full price history for a known SKU.

**Validation phase**

- Capture reliability: 7 consecutive daily runs complete without unhandled errors or quota exhaustion.
- Sync correctness: 0 wrong values written to Notion (spot-check 10 listings after first live run).
- **Go/no-go threshold**: If daily runs hold for two weeks with correct Notion state, keep it running and consider extensions (orders, trends dashboard); if quota or auth friction makes runs unreliable, stop and write up learnings.

**MVP phase**

- Time to answer a history question (price/stock over time): < 5 minutes with a documented SQL query.
- Manual inventory edits in Notion for synced fields: 0 per week.

---

## Validation Plan

No landing page — this is a personal tool experiment. Validation is running the real pipeline against the live shop on a daily schedule (local cron first) for two weeks: watch audit logs for schema drift and quota headroom, spot-check Notion values against Etsy, and run at least one real analysis query against the history store. The write-up of Etsy v3 API learnings is a deliverable in its own right.
