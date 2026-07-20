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
| Proposed frame(s) | Iter 1 — `02 Proposed` (desktop `6:2`, mobile `14:7`) — original wrapping-chip table. Iter 2 — `02.1 Proposed — Sortable one-line table` (desktop `28:43`, mobile `28:388`) — single-line sortable rows, no Views/Favorites. Iter 3 — `02.2 Proposed — Visibility-weighted priority` (desktop `41:43`, mobile `49:106`) — adds Views + Favorites columns, visibility-weighted order. **Iter 4 (current) — `02.3 Proposed — Discoverability-weighted priority` (page `59:860`, desktop `59:42`, mobile `59:529`)** — decision 11 applied: discoverability-led order, active-sort caret moved from Views to Unmet criteria, drafts shown with a neutral `Draft` badge and excluded from fix-first, shop-summary third stat repurposed to the systemic-gap count. All prior pages kept intact per the numbered-page convention. |
| Libraries         | **MVDS Core** Badge instances for Tier-A status chips (`variant=success`/`destructive`, by key — MVDS not enabled as a team-library dep, same as stop-the-leaks); 16 "hub tokens" vars ported 1:1 from `app/globals.css @theme` (Fraunces/Inter), bound to all fills — no hardcoded hex |
| Code Connect      | None created. Note for apply: hub's `components/ExperimentTypeBadge.tsx` is bespoke, not wired to the MVDS Badge the prototype uses; type badge renders `null` for `commercial` experiments (etsy-notion-sync is commercial) |
| Breakpoints       | S · 480px mobile / L · 1024px desktop (BHD Content Types). Table collapses to stacked cards under `md` (mobile frame built).                                                                          |
| Status            | **Approved 2026-07-20** (iter 3 / `02.2`). Blocker placement = option (a) pure-impact. (As-is mobile not built — desktop-only for as-is; meets the L-minimum bar.) **Frame/decision drift (2026-07-20):** decision 11b changed the ranking key *after* `02.2` was approved. The frame's **layout is still accurate** — same columns incl. Views/Favorites, same one-line rows, same fix-first card — but the **row order it depicts is the superseded visibility-weighted one**, and the page is named accordingly. No re-cut required to build (order is data-driven, not a layout property); if a later iteration is cut, it should be a new numbered page (`02.4`, since `02.3` is now Iter 4) per the convention, never an in-place edit. |

Status color semantics come from theme tokens only (`destructive` for Tier-A fail,
`success` for publishable, `muted`/`primary` for the completeness bar) — no raw hex, per `design-guidelines.mdc`.
**Placeholder-values caveat** (per `rules/figma.mdc`): all field text and every listing name/score/chip
in the frames are illustrative reference, not derived from code or a live Notion/Supabase read; layout,
labels, ordering, and token styling are faithful.

**Exception — `02.3` uses real data (2026-07-20).** Unlike every earlier page, `02.3`'s 20 rows are the
**actual top-20 listings** from `etsy_latest_listing_snapshots`, in the real discoverability order, with
real titles, view/favourite counts, tag counts and states. This was deliberate: the superseded frames
depicted 320/280/240-view listings, so re-sorting *fictional* data would not have shown why the ordering
changed. Only the Tier-B percentages are still derived (computed from a provisional 7-criteria digital /
9-criteria physical set, since `SCORECARD_DEFAULTS` is not final) — treat the **percentages** as
illustrative and everything else on `02.3` as real.

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

   > **Superseded 2026-07-20 by decision 11** (ranking key inverted after live-data verification).
   > The "one order, card == table top rows" principle here still holds — only the sort key changes.

10. **Pre-apply data verification (2026-07-20).** Tasks 4.3 and 4.4 were run against live Supabase
    (`ulqdjuiffpazzixnwwso`) *before* implementation rather than as post-build QA. Findings:

    - **4.3 — resolved, non-issue.** The view `etsy_latest_listing_snapshots` **does** expose
      `raw_response` (jsonb). The `parsed`-only narrowing is in the *Python client's* select string
      (`store_supabase.py:113`), not the view. No migration, no new view needed.
    - **Endpoint literal correction:** the stored value is the un-interpolated template
      `/v3/application/shops/{shop_id}/listings` — note the `/v3/application/` prefix. It must be
      matched with `=`, **not** `LIKE '%listings%'`: the inventory endpoint
      `/v3/application/listings/{listing_id}/inventory` also contains "listings" and silently
      doubles the row count with objects that have none of the scored fields.
    - **4.4 — fields present, values genuinely empty.** Across 25 listing snapshots: `images`
      populated (avg 8.4), `tags` non-empty on 22/25 (avg 11.3), `description`/`title`/`views`/
      `num_favorers` all present. But `images[].alt_text` is **null on every image**, and `videos`,
      `materials`, `style` are **`[]` on all 25**. These are *genuine* empties, not capture gaps —
      `Images` and `Videos` are both in `LISTING_INCLUDES` (`etsy_api.py:13`), so the API returned
      the fields and they are really empty.
    - **Composition:** 21 digital (`download`) / 4 physical; 22 active / **3 draft**.

11. **Ranking inverted toward discoverability; percentage stays complete (2026-07-20).**
    Two consequences follow from decision 10, and they are split across two different numbers:

    **(a) Tier-B % keeps every applicable criterion**, including the four that all 25 listings fail.
    A universally-failed criterion adds an identical constant to every score, so it changes the
    absolute number but has *zero* effect on ordering. Including it keeps the percentage an honest,
    stable, trendable absolute measure. Explicitly **rejected:** dynamically dropping
    universally-failed criteria from the denominator — that makes a listing's score change when
    *other* listings change (fix alt-text on three listings and every other listing's percentage
    drops without anything about them changing), which is untrustworthy across two page loads and
    would poison any later trend view. The four systemic gaps surface **once** in the shop-summary
    strip as a shop-level finding, not as 25 identical row-level flags.

    **(b) `rankFixPriority` sorts on fixable discoverability gaps, not visibility.** Decision 9's
    premise — impact = visibility × fixability — assumes a pool of listings that get traffic. The
    live data says otherwise: **105 views total across 25 listings, max 21, half the shop tied at
    0–2 views, 12 favorites total.** Ranking by views on that distribution amplifies noise rather
    than prioritizing; the gap between 21 views and 2 views is not a real difference in opportunity.
    For a zero-traffic shop the lever is *discoverability* (tags and title keywords — the inputs to
    Etsy search), so the primary key becomes tag/title gap severity, with **views demoted to a
    tiebreak**. Decision 9's single-order and card-mirrors-table rules are unchanged.
    **Full key order (normative — spec, design and tasks must agree):**
    `discoverability gap ↓ → views ↓ → num_favorers ↓ → listing_id ↑`. Favourites is retained as a
    secondary tiebreak (carried over from decision 9) rather than dropped; it breaks the views ties
    that dominate this dataset before `listing_id` has to.
    **Assumption flagged (founder-confirmed 2026-07-20):** the tags→discoverability link is
    reasoned from general Etsy search mechanics, *not* measured in this shop's data. If that link
    is weaker than assumed, this ordering weakens with it.

    **(c) Drafts excluded from fix-first, retained in the table.** A `state = draft` listing cannot
    sell, so "not publishable" on it is a category label, not a miss worth surfacing first. The 3
    drafts stay in the table with a state marker (not hidden — same honesty rule as blockers).

    **(d) Deterministic final tiebreak (`listing_id`).** With this many exact ties on every prior key,
    order would otherwise shuffle between renders depending on row order, making the
    "fix-first == table top rows" scenario untestable.

12. **Fix-first card stays, and stays ahead of the table (founder decision 2026-07-20).**
    Resolves the open question raised under decision 11 / the `02.3` build. The card is **not**
    replaced by the systemic batch-fix callout.

    *Rationale (founder):* the shape and nature of the data will change over time — today's thin
    discoverability spread (19 of 25 listings already at the full 13 tags) is a snapshot, not a
    permanent property of the shop. Designing the ordering around one snapshot would over-fit.
    More fundamentally, UX principle: **show people what to act on before dumping the unopinionated
    list.** An unranked table is a report; a ranked highlight is a recommendation.

    *Resulting hierarchy (all three tiers already specified, no new work):*
    1. **Shop summary strip** — shop-level systemic gaps (decision 11a). Sits *above* fix-first, so
       the batch-fix finding is surfaced first without displacing the per-listing recommendation.
    2. **"Fix these first" card** — per-listing, actionable, literal top-N of the table order
       (decision 9's highlights-echo-the-set rule, unchanged).
    3. **Full table** — every listing, unopinionated, re-sortable.

    *Consequence for the weak-discrimination risk below:* accepted rather than mitigated. The
    ordering is centralized in `rankFixPriority`, so it sharpens on its own as the data changes —
    no code change needed when tag coverage or traffic shifts.

## Risks / Trade-offs

- ~~**`raw_response` completeness**~~ — **CLOSED 2026-07-20** (decision 10). Fields present; four
  are genuinely empty shop-wide, handled by decision 11(a).
- ~~**Latest-per-listing read**~~ — **CLOSED 2026-07-20** (decision 10). `etsy_latest_listing_snapshots`
  exposes `raw_response`; the `parsed`-only narrowing was in the Python client, not the view.
- **Ranking rests on an unmeasured assumption (new, from decision 11b):** discoverability-weighted
  ordering assumes tags/title drive Etsy search visibility. Not measured in this shop's data.
  Mitigated by centralizing the ranking in one pure function (`rankFixPriority`) so the key can be
  re-weighted in a single edit once real traffic data exists.
- **⚠️ Discoverability also discriminates weakly on today's data (new, surfaced while building `02.3`
  with real rows):** the shop is *already* well-tagged. Of 25 listings, **3 have 0 tags (all drafts),
  3 have 12, and the remaining 19 sit at the full 13** — so once drafts are excluded from fix-first,
  the discoverability key separates only **3** listings before collapsing to the views tiebreak, and
  the top recommendation is the marginal "add 1 tag". This is visible in `02.3`: rows 4–6 differ, rows
  7–20 are effectively views-ordered. **Implication:** decision 11b is still better than ranking on
  views alone (which tied 11 of 25 at 0–2 views), but neither key is strong, because the shop's real
  gaps are the four **systemic** ones — alt text, video, materials, styles — which are shop-level, not
  per-listing, and are surfaced by decision 11a's summary-strip line rather than by any ordering.
  ~~**Open question for the founder:**~~ **RESOLVED 2026-07-20 — see decision 12.** The card stays and
  stays ahead of the table; the systemic finding surfaces above it in the summary strip. Weak
  discrimination is **accepted, not mitigated**: it is a property of today's snapshot, and
  `rankFixPriority` sharpens on its own as tag coverage and traffic change.
- **Four criteria are currently non-discriminating (new, from decision 10):** alt-text, videos,
  materials, styles fail on 100% of listings, so they inform the shop-level strip but contribute
  nothing to per-listing ordering. If any becomes partially satisfied later, it starts
  discriminating on its own with no code change — the denominator is static by design (11a).
- **Thin physical coverage (new, from decision 10):** only 4 of 25 listings are physical (1 active,
  3 draft), so the digital/physical branch (decision 5) is exercised but barely. Unit tests must
  cover the physical path with fixtures rather than relying on live data.
- **No persisted scores:** recomputing per request means no score-over-time trend yet — accepted;
  trending belongs to L2, and the append-only snapshots already retain the raw history to backfill later.
- **Threshold accuracy:** v1 defaults are best-effort (Handbook caps not re-confirmed live).
  Mitigated by centralizing them and tuning after the first real run.
