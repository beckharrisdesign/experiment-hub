# Design — listing-completeness-scorecard

## Context

The scorecard renders on the **public** labs project page for the etsy-notion-sync experiment
(`app/experiments/[slug]/page.tsx`, already `force-dynamic`). All scored data already lives in
Supabase: `etsy_snapshots.raw_response` stores the **full listing JSON** (every `includes`
field) per capture, and the hub already reads Supabase server-side with the service-role key
(`lib/etsy-sync.ts::getEtsySyncRuns`). So this is a **read + render** layer — no new Etsy calls,
no Python/capture change, no DB migration.

## Goals / Non-Goals

**Goals:**

- Show, per listing, Tier-A pass/fail + Tier-B completeness %, and a shop-level "fix these first" list.
- Compute from the latest captured snapshot only; send **only scores/flags** to the browser (no PII).
- Keep scoring thresholds in one tunable module so v1 defaults can change without touching UI.

**Non-Goals:**

- No sync trigger on the public page (stays on authenticated admin `EtsySyncPanel`).
- No new Supabase table / no persisted score history (trending is a later L2 concern).
- No attributes/properties scoring (deferred — needs a capture-widen).

## User flow / IA

```
  Public labs project page  (/experiments/etsy-notion-sync)
  ├─ existing experiment header + Notion fields  (unchanged)
  └─ NEW: "Listing health" section
        ├─ Shop summary strip:  X/20 publishable-complete · median Tier-B %
        ├─ Fix these first  (ranked): Tier-A failures on top, then lowest Tier-B %
        │     • "Listing 123 — Not publishable-complete: no photo, quantity 0"
        │     • "Listing 456 — 40% complete: +6 photos, +9 tags, no video"
        └─ Full sortable table: ALL listings, one condensed single-line row each
              cols → Listing · Publishable · Views · Favorites · Completeness · Unmet (condensed)
              • sortable headers (default: fix priority — most-visible with issues first)
              • each listing links to its Etsy edit view
              • no "+N more" — every captured listing renders
```

Anonymous visitor sees all of the above; nothing is behind auth; no buyer/account data appears.

## Visual design / Figma

Figma **as-is + proposed** pair built and screenshot-verified (2026-07-20), per the `stop-the-leaks` process.
**File convention** (per `rules/figma.mdc`): numbered pages `00 Components` / `01 Current state` / `02 Proposed`; each new proposal iteration is a new numbered page (`02.1`, `02.2`, …), never an in-place edit of an existing proposal page.

| Item              | Value                                                                                                                                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary file URL  | https://www.figma.com/design/EdxL37LSW5exXAepqaH9ZM ("experiment-detail — listing-completeness-scorecard", BHD team drafts)                                                                          |
| As-is frame(s)    | `01 Current state → As-is · Desktop 1024` (node `4:2`) — current experiment page reconstructed from `app/experiments/[slug]/page.tsx`                                                                 |
| Proposed frame(s) | Iter 1 — `02 Proposed` (desktop `6:2`, mobile `14:7`) — original wrapping-chip table. Iter 2 — `02.1 Proposed — Sortable one-line table` (desktop `28:43`, mobile `28:388`) — single-line sortable rows, no Views/Favorites. **Iter 3 (current) — `02.2 Proposed — Visibility-weighted priority` (desktop `41:43`, mobile `49:106`)** — adds Views + Favorites columns, one visibility-weighted fix-priority order, fix-first card == table top rows. All prior pages kept intact per the numbered-page convention. |
| Libraries         | **MVDS Core** Badge instances for Tier-A status chips (`variant=success`/`destructive`, by key — MVDS not enabled as a team-library dep, same as stop-the-leaks); 16 "hub tokens" vars ported 1:1 from `app/globals.css @theme` (Fraunces/Inter), bound to all fills — no hardcoded hex |
| Code Connect      | None created. Note for apply: hub's `components/ExperimentTypeBadge.tsx` is bespoke, not wired to the MVDS Badge the prototype uses; type badge renders `null` for `commercial` experiments (etsy-notion-sync is commercial) |
| Breakpoints       | S · 480px mobile / L · 1024px desktop (BHD Content Types). Table collapses to stacked cards under `md` (mobile frame built).                                                                          |
| Status            | As-is + proposed built & verified; design pending approval. (As-is mobile not built — desktop-only for as-is; meets the L-minimum bar.)                                                               |

Status color semantics come from theme tokens only (`destructive` for Tier-A fail,
`success` for publishable, `muted`/`primary` for the completeness bar) — no raw hex, per `design-guidelines.mdc`.
**Placeholder-values caveat** (per `rules/figma.mdc`): all field text and every listing name/score/chip
in the frames are illustrative reference, not derived from code or a live Notion/Supabase read; layout,
labels, ordering, and token styling are faithful.

**Build follow-up (not blocking):** the table, completeness bars, and chips were built natively with
tokenized primitives (the accepted "existing markup" fallback); a hub `BHD Labs / shadcn` `Table` +
`Progressbar` exist and swapping to them is a clean later refinement.

**Known frame gaps (honest, from the build):**
- **Mobile parity:** the `02.1`/`02.2` mobile frames omit the upper experiment-fields band
  (Status / Why / Hypothesis / Exec summary) the desktop frames show — they go Hero → Listing
  health → cards. A desktop/mobile parity gap to close in apply (implementation renders the full
  page responsively regardless).
- **Header label color:** column labels use the code's `text-text-primary` mint (`#cff7d3`), matching
  `page-client.tsx` — not white as Etsy's footer/reference used.
- **Fraunces weight:** titles use Fraunces Regular (no static Medium instance in Figma); code uses
  `font-medium` (500). Cosmetic approximation in the frame only.

## Decisions

1. **Scoring computed in TypeScript at render time, from Supabase `raw_response`.**
   A new server-only helper (extend `lib/etsy-sync.ts` or a sibling `lib/etsy-scorecard.ts`)
   reads the latest `etsy_snapshots` row per listing for `endpoint = shops/{shop_id}/listings`,
   selecting `raw_response`, and a pure `scoreListing(raw)` function returns Tier-A/Tier-B results.
   *Why:* the raw listing JSON is already in Supabase; scoring in the surface that renders it
   needs no migration, no Python change, and keeps thresholds one edit away. At ~20 listings,
   per-request compute is trivial (page is already `force-dynamic`).

2. **Section on the existing experiment page, not a sub-route.** Least surface; reuses the
   Notion-backed layout already there. (Founder lean, 2026-07-20.)

3. **Server-side read, scores-only to client = PII-safe by construction.** The service-role
   Supabase read happens in the server component; the client receives only computed
   scores/flags/criteria names, never `raw_response` (which could contain `user`/buyer fields
   via the `User` include).

4. **Thresholds live in one config object** (`SCORECARD_DEFAULTS`: photos 10, tags 13 / ≤20 chars,
   title 140, materials 13, styles 2, min description length). Marked † = "verify in Shop Manager,
   don't block." Equal weight per applicable Tier-B criterion in v1.

5. **Physical/digital awareness:** `listing_type = download` excludes shipping, processing, and
   return-policy criteria from both the Tier-A gate and the Tier-B denominator.

6. **Table behavior (founder feedback 2026-07-20):** the full table shows **all** captured
   listings (no "+N more" — the shop already has 20+), **one condensed single-line row** per
   listing, with **sortable** column headers. The unmet-criteria cell is condensed to fit one
   line — a compact count + truncated preview (e.g. "4 unmet · No photo, Qty 0, +2") rather than
   wrapping chips. Default sort is fix-first (Tier-A fails on top, then ascending Tier-B %); the
   separate "Fix these first" card stays as the top-offenders highlight. Sorting is client-side
   over the already-loaded rows (server sends all scored rows; ~20 items → no pagination).

7. **Reuse the main experiments table component (founder feedback 2026-07-20):** the scorecard
   table must use the **same** table as the hub home page — the sortable table in
   `app/page-client.tsx` (dark-green `background-primary` header, state-driven
   `sortColumn`/`sortDirection` with a ↓/↑ caret on the active column, title+subtitle rows,
   colored **score-pill** thresholds green→yellow→orange→red). It is currently inline in
   `page-client.tsx`; **apply must extract it into a shared component** (e.g.
   `components/SortableExperimentTable` or a generic `components/ScoreTable`) and consume it in
   both the home page and the scorecard — no bespoke second table. The completeness % reuses the
   score-pill color treatment.

8. **Link every listing to its Etsy edit view (founder feedback 2026-07-20):** each listing in
   the table and the fix-first list links to `https://www.etsy.com/your/shops/me/listing-editor/edit/{listing_id}`,
   mirroring how the main table rows are `<Link>`s to the experiment detail page. **Owner-only
   nuance:** the edit view requires being signed in as the shop owner, so the link is actionable
   for the founder; anonymous public visitors following it hit Etsy's sign-in. The `listing_id`
   is not sensitive (it appears in the public listing URL), so exposing it on the public page is
   fine. (Optional later: also expose the public `url` field for non-owner visitors.)

9. **Visibility-weighted fix priority + single source of order (founder feedback 2026-07-20):**
   the table shows sortable **Views** (`views`) and **Favorites** (`num_favorers`) columns — both
   already captured — and there is **one** fix-priority order used by BOTH the table's default
   sort and the "fix these first" card. Per the "highlights echo the set" principle
   (`design-guidelines.mdc` #8), the card is **literally the top N rows of the table's default
   order** — same membership, same sequence, same caption — never a separately-ranked list.
   Rationale for the order: a live listing pulling 300 views at 45% complete is losing sales
   *now*, so impact = visibility × fixability surfaces the most-visible fixable listings first.
   Suggestions cite the numbers ("320 views, 18 ♥ but 45% — add 6 photos + a video").
   **All listings appear in the table** — Tier-A blockers are shown and flagged "Not publishable",
   **not hidden** (hiding your most-broken listings is itself untrustworthy). **Open (tunable)
   question:** whether blockers sort purely by impact (0 views → they sink) or are pinned to the
   top as max-severity; either way the card must mirror the table. **Scope note:** this pulls the
   *current-value* slice of L2 (visibility) into L1 for prioritization; the favorites/views
   **trend over time** remains L2.

## Risks / Trade-offs

- **`raw_response` completeness:** scoring assumes the stored raw listing carries the full
  `includes` set (images/videos/tags/materials). Confirmed from `capture.py` (stores the whole
  `listing` object) — but a **task will assert** an alt-text/image field is actually present on a
  real snapshot before trusting the alt-text criterion.
- **Latest-per-listing read:** `store_supabase.latest_parsed_by_listing` selects only `parsed`;
  the hub read must select `raw_response` instead (query the base table with a latest-per-listing
  filter, or confirm the `LATEST_VIEW` exposes `raw_response`). Small, verified in a task.
- **No persisted scores:** recomputing per request means no score-over-time trend yet — accepted;
  trending belongs to L2, and the append-only snapshots already retain the raw history to backfill later.
- **Threshold accuracy:** v1 defaults are best-effort (Handbook caps not re-confirmed live).
  Mitigated by centralizing them and tuning after the first real run.
