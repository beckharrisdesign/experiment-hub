# etsy-zero-sales-funnel — tasks

> Design approved 2026-07-20 (`02.2`). Scope: L1 listing-completeness scorecard, read-only,
> rendered publicly on the etsy-notion-sync experiment page; scored in TS from the latest
> Supabase snapshot (no new Etsy calls, no migration). Blocker placement = option (a) pure-impact.

## 1. User outcomes (from spec scenarios)

- [ ] 1.1 Listing missing a required field is flagged with the reason
- [ ] 1.2 Fully-gated listing passes Tier A
- [ ] 1.3 Percentage reflects how many criteria are met
- [ ] 1.4 Digital listing excludes physical-only criteria
- [ ] 1.5 Every captured listing shows as one condensed row
- [ ] 1.6 Table loads in visibility-weighted fix-priority order
- [ ] 1.7 A high-visibility fixable listing is prioritized over a low-visibility one
- [ ] 1.8 The fix-first highlight matches the table's default order
- [ ] 1.9 User re-sorts by a column
- [ ] 1.10 Each listing links to its Etsy edit view
- [ ] 1.11 Scores are visible to an anonymous visitor
- [ ] 1.12 Sync trigger stays on the authenticated admin
- [ ] 1.13 Scorecard produced without contacting Etsy

## 2. Scaffold (hub app — extends the merged etsy-notion-sync surface, no new prototype dir)

- [ ] 2.1 `lib/etsy-scorecard.ts`: pure `scoreListing(raw)` + `SCORECARD_DEFAULTS` (photos 10, tags 13/≤20, title 140, materials 13, styles 2, min description length) and Tier A/B result types. Physical/digital aware. No I/O — unit-testable. (→ 1.1–1.4)
- [ ] 2.2 `lib/etsy-scorecard.ts`: `rankFixPriority(scored[])` — one visibility-weighted order (views, favorites tiebreak) used by both the table default sort and the fix-first card; `topFixFirst(scored, n)` returns the literal top-N of that order. (→ 1.6–1.8)
- [ ] 2.3 Server-only Supabase read `getLatestListingSnapshots()` (mirror `lib/etsy-sync.ts::getEtsySyncRuns`, service-role) selecting `raw_response` for the latest snapshot per listing where `endpoint = shops/{shop_id}/listings`. (→ 1.13)
- [ ] 2.4 Add the scorecard to the auth-free `/dev/components` preview surface with sample snapshots for visual verification before wiring the live page.

## 3. Implementation

- [ ] 3.1 Extract the inline sortable table from `app/page-client.tsx` into a shared component (e.g. `components/ScoreTable`) — dark-green header, `sortColumn`/`sortDirection` carets, title+subtitle rows, colored score pills — and consume it in both the home page and the scorecard (no bespoke second table). (→ 1.5, 1.9)
- [ ] 3.2 "Listing health" section on `app/experiments/[slug]/page.tsx`, gated to the etsy-notion-sync experiment: server-side read (2.3) → `scoreListing`/`rankFixPriority`, sending only scores/flags to the client (no `raw_response`, no PII). (→ 1.11, 1.13)
- [ ] 3.3 Shop summary strip (X/N publishable-complete · median Tier-B % · N need a fix) + "Fix these first" card rendered as `topFixFirst` (the literal top rows of the table order). (→ 1.8)
- [ ] 3.4 Per-listing table via `ScoreTable`: columns Listing · Publishable · Views · Favorites · Completeness · Unmet (condensed count + preview); all rows, one line each; default fix-priority order; blockers flagged "Not publishable" (option a). (→ 1.5, 1.6, 1.7)
- [ ] 3.5 Each listing (table rows + fix-first items) links to `https://www.etsy.com/your/shops/me/listing-editor/edit/{listing_id}`. (→ 1.10)
- [ ] 3.6 Confirm no sync trigger renders on the public page; trigger stays on `app/admin/(protected)` `EtsySyncPanel`. (→ 1.12)

## 4. QA

- [ ] 4.1 Manual walkthrough (running hub): anonymous visitor sees the scorecard on `/experiments/etsy-notion-sync` — Tier-A flags with reasons, Tier-B %, fix-first card == table top rows, edit links, column re-sort, no trigger, no buyer/account data. (→ 1.1, 1.5–1.12)
- [ ] 4.2 Automated smoke (vitest, `tests/lib/etsy-scorecard.test.ts`): Tier-A flags each missing field with reason; passes when complete; Tier-B % matches met/applicable; digital excludes physical-only from denominator; `rankFixPriority` orders visibility-weighted; `topFixFirst` == first N of the ranked table. (→ 1.1–1.4, 1.6–1.8)
- [ ] 4.3 **Risk (from design):** assert the Supabase read returns `raw_response` (not only `parsed`) — the existing `latest_parsed_by_listing` selects only `parsed`; verify the scorecard query/view exposes `raw_response`.
- [ ] 4.4 **Risk (from design):** assert `images[].alt_text` (and `videos`, `tags`) are actually present on a real captured snapshot before trusting the alt-text / video / tag criteria; adjust `SCORECARD_DEFAULTS` handling if a field is absent.
