# etsy-zero-sales-funnel — tasks

> Design approved 2026-07-20 (`02.2`). Scope: L1 listing-completeness scorecard, read-only,
> rendered publicly on the etsy-notion-sync experiment page; scored in TS from the latest
> Supabase snapshot (no new Etsy calls, no migration).
>
> **Amended 2026-07-20 (design decisions 10–11), after running 4.3/4.4 against live Supabase
> pre-build.** Ranking key inverted from visibility-weighted to discoverability-weighted (the shop
> has 105 total views across 25 listings — visibility does not discriminate). Tier-B % keeps every
> applicable criterion. Both original risks closed. See `design.md` decisions 10–11.

## 1. User outcomes (from spec scenarios)

- [ ] 1.1 Listing missing a required field is flagged with the reason
- [ ] 1.2 Fully-gated listing passes Tier A
- [ ] 1.3 Percentage reflects how many criteria are met
- [ ] 1.4 Digital listing excludes physical-only criteria
- [ ] 1.5 Every captured listing shows as one condensed row
- [ ] 1.6 Table loads in discoverability-weighted fix-priority order
- [ ] 1.7 A listing with thin tags is prioritized over a fully-tagged one
- [ ] 1.7a Views break ties but do not lead the order
- [ ] 1.7b Order is stable across renders (ties resolve by `listing_id`)
- [ ] 1.7c Drafts appear in the table but not in fix-first
- [ ] 1.8 The fix-first highlight matches the table's default order
- [ ] 1.9 User re-sorts by a column
- [ ] 1.10 Each listing links to its Etsy edit view
- [ ] 1.11 Scores are visible to an anonymous visitor
- [ ] 1.12 Sync trigger stays on the authenticated admin
- [ ] 1.13 Scorecard produced without contacting Etsy

## 2. Scaffold (hub app — extends the merged etsy-notion-sync surface, no new prototype dir)

- [x] 2.1 `lib/etsy-scorecard.ts`: pure `scoreListing(raw)` + `SCORECARD_DEFAULTS` (photos 10, tags 13/≤20, title 140, materials 13, styles 2, min description length) and Tier A/B result types. Physical/digital aware. No I/O — unit-testable. **Denominator is static: keep every applicable criterion, including the four currently failing shop-wide (alt-text, videos, materials, styles) — do NOT drop non-discriminating criteria dynamically** (design 11a). (→ 1.1–1.4)
- [x] 2.2 `lib/etsy-scorecard.ts`: `rankFixPriority(scored[])` — one **discoverability-weighted** order. **Key order is normative: `discoverability gap ↓ → views ↓ → num_favorers ↓ → listing_id ↑`** (tag/title gap leads; views and favourites are tiebreaks only; `listing_id` guarantees stable order across renders). Used by both the table default sort and the fix-first card; `topFixFirst(scored, n)` returns the literal top-N of that order, **excluding `state = draft`**. (design 11b–11d) (→ 1.6, 1.7, 1.7a, 1.7b, 1.7c, 1.8)
- [x] 2.3 Server-only Supabase read `getLatestListingSnapshots()` (mirror `lib/etsy-sync.ts::getEtsySyncRuns`, service-role) selecting `raw_response` from the **`etsy_latest_listing_snapshots` view** (confirmed to expose it) where **`endpoint = '/v3/application/shops/{shop_id}/listings'` — exact match on the un-interpolated literal, NOT `LIKE '%listings%'`** (the inventory endpoint also matches and doubles the rows). (→ 1.13)
- [ ] 2.4 Add the scorecard to the auth-free `/dev/components` preview surface with sample snapshots for visual verification before wiring the live page.

## 3. Implementation

- [x] 3.1 Extract the inline sortable table from `app/page-client.tsx` into a shared component (e.g. `components/ScoreTable`) — dark-green header, `sortColumn`/`sortDirection` carets, title+subtitle rows, colored score pills — and consume it in both the home page and the scorecard (no bespoke second table). (→ 1.5, 1.9)
- [ ] 3.2 "Listing health" section on `app/experiments/[slug]/page.tsx`, gated to the etsy-notion-sync experiment: server-side read (2.3) → `scoreListing`/`rankFixPriority`, sending only scores/flags to the client (no `raw_response`, no PII). (→ 1.11, 1.13)
- [ ] 3.3 Shop summary strip (X/N publishable-complete · median Tier-B % · N need a fix) + **shop-level systemic-gap line for the four criteria failing on 100% of listings** (surfaced once here, not as 25 identical row flags — design 11a) + "Fix these first" card rendered as `topFixFirst` (the literal top rows of the table order). (→ 1.8)
- [ ] 3.4 Per-listing table via `ScoreTable`: columns Listing · Publishable · Views · Favorites · Completeness · Unmet (condensed count + preview); all rows, one line each; default fix-priority order; blockers flagged "Not publishable"; **drafts retained with a `state` marker** (in the table but out of fix-first — design 11c). (→ 1.5, 1.6, 1.7, 1.7c)
- [ ] 3.5 Each listing (table rows + fix-first items) links to `https://www.etsy.com/your/shops/me/listing-editor/edit/{listing_id}`. (→ 1.10)
- [ ] 3.6 Confirm no sync trigger renders on the public page; trigger stays on `app/admin/(protected)` `EtsySyncPanel`. (→ 1.12)

## 4. QA

- [ ] 4.1 Manual walkthrough (running hub): anonymous visitor sees the scorecard on `/experiments/etsy-notion-sync` — Tier-A flags with reasons, Tier-B %, fix-first card == table top rows, edit links, column re-sort, no trigger, no buyer/account data. (→ 1.1, 1.5–1.12)
- [x] 4.2 Automated smoke (vitest, `tests/lib/etsy-scorecard.test.ts`): Tier-A flags each missing field with reason; passes when complete; Tier-B % matches met/applicable; digital excludes physical-only from denominator (**use a physical fixture — only 1 active physical listing exists live**); `rankFixPriority` orders **discoverability-weighted with views as tiebreak**; ties broken by `listing_id` so order is stable across runs; drafts absent from `topFixFirst`; `topFixFirst` == first N of the ranked table. (→ 1.1–1.4, 1.6–1.8)
- [x] 4.3 ~~**Risk:** assert the Supabase read returns `raw_response`~~ — **CLOSED pre-build 2026-07-20.** `etsy_latest_listing_snapshots` exposes `raw_response` (jsonb); the `parsed`-only select was in the Python client, not the view. Also corrected the endpoint literal (see 2.3). (design 10)
- [x] 4.4 ~~**Risk:** assert `images[].alt_text` / `videos` / `tags` present on a real snapshot~~ — **CLOSED pre-build 2026-07-20.** All keys present. `tags`/`images` populated; `alt_text` null on every image and `videos`/`materials`/`style` `[]` on all 25 — genuine empties, not capture gaps (`Images`+`Videos` are both in `LISTING_INCLUDES`). Handling set by design 11a. (design 10)
