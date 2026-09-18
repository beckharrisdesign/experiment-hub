# design — keyword-explorer-etsy-traction

## Context

`keyword-explorer` (merged #500/#501) ships a static, sortable/filterable table over `data/keyword-corpus.json`. This change adds two numeric traction signals to that table — Ranked and Targeting — plus a numeric range filter, and drops three existing columns from view. Figma round 01 was drawn at proposal time per the schema; round 02.1 carries the numeric-columns-and-range-filter revision Katy asked for. Numbering continues here rather than restarting.

## Goals / Non-Goals

**Goals:**

- Ranked and Targeting as plain numeric, sortable columns — best position, lowest tag slot — blank (never `0`) when absent.
- A range filter ("less than x" / "more than y") usable on every numeric column, not just the two new ones.
- Status, Capture and Coverage off the visible table; their data and `keyword-corpus`'s rules for them untouched.
- Targeting reads live listing tags on every request; a Supabase failure degrades that one column, not the page.

**Non-Goals:**

- Fuzzy/partial matching for either signal.
- Matching Targeting against listing titles — tag slots only, since a title hit has no slot number.
- Multiple simultaneous range filters across different columns — one active range filter at a time (Decisions, below).
- A per-row detail view surfacing every ranking listing or every tagged listing — the collapsed number is the row; the full list lives in the data for a future surface, not this one.
- Re-introducing Status/Capture/Coverage anywhere in this change.

## User flow / IA

Unchanged from `keyword-explorer`: land on the full corpus sorted by Searches descending, reduce with the filter row, sort any column. This change only changes what the filter row and the table columns are.

1. **Filter row** gains one range-filter control: pick a numeric column, set a min and/or max, rows outside the bound drop out — combined with the existing keyword/capture/query filters.
2. **Table columns**, left to right: **Keyword** (grows) · Searches · Competition · KD · **Ranked** · **Targeting** · Found via (query) · Searches / comp. Ranked and Targeting sit right after the three demand metrics they extend, ahead of the two lower-traffic columns — a reader scans "how much demand, am I already winning it" before "which query surfaced this, what's the ratio."
3. Status, Capture and Coverage are gone from the row entirely in this view.

## Visual design / Figma

| Item | Value |
| --- | --- |
| Primary file URL | <https://www.figma.com/design/qN2BGnkJSbwAuD9aibhpZ3> |
| As-is frame(s) | `01 Current state` → `As-is · Desktop 1024` (`3:3`) — reconstructed from shipped `components/KeywordTable.tsx`; no Ranked/Targeting/range-filter exists there. |
| Proposed frame(s) | `02.1 Proposed — numeric columns, range filters` → `Proposed · Desktop 1024` (`4:4`) — **current**. Round `02 Proposed` (`2:72`) is superseded (text-badge treatment) and stays intact per the page-per-iteration rule. |
| Libraries / version | `MVDS Core` (`lk-d54f86bc…`), subscribed to the file 2026-09-18 · `@beckharrisdesign/mvds@0.3.0` in code. Round 02.1 is rough (shape/composition) — not yet token-audited, and the implementation diverged from it in two ways, both intentional: **`Select` stays MVDS** for the range-filter column picker, but the min/max fields are a plain `<input type="number">` — matching this file's own existing un-wrapped `<input type="search">` for the keyword filter, not MVDS `Field`, which requires a `label` prop and its own layout chrome the filter row doesn't need. **`Badge` is removed, not unchanged** — it only existed for the Status column, which this change hides. |
| Code Connect | No mappings to update — no new shared component; the range filter is route-local, same as the existing filter controls. |
| Breakpoints | S · 480px / L · 1024px. No new breakpoint behavior: the table already scrolls rather than reflows (`keyword-explorer/design.md`), and two extra numeric columns plus one more filter control extend that pattern without changing it. Not re-drawn at 480 in this rough round — nothing about the mechanism differs by width. |
| Status | Round 02.1 built and reviewed; approved 2026-09-18 (Katy: "approved for all gates in this change"). |

## Decisions

**Ranked and Targeting collapse to their best value; the rest of the match lives underneath, not on screen.** `keyword-traction`'s spec requires this: the visible cell is one sortable number (lowest position for Ranked, lowest tag slot for Targeting), while every listing/page/position (Ranked) or listing/slot (Targeting) match stays on the row's data. No detail view surfaces the rest in this change — Non-Goals.

**One active range filter, not one per column.** The rough Figma chip (`Ranked ≤ 20`) shows the shape but not a commitment to a persistent control per column — six numeric columns' worth of always-visible min/max pairs would crowd the existing filter row past what `keyword-explorer`'s own "no verbose slop" precedent tolerates. Implementation: a single range-filter cluster — column picker (reusing the `Select` pattern already in the filter row) + two plain `<input type="number">` fields for min/max (not MVDS `Field` — see the Libraries/version row above) — that applies to whichever numeric column is currently chosen. Combines with the existing keyword/capture/query filters (Status's own filter dropdown stays; only the Status *column* is hidden — see below). Scoped down from "range filter on every column visible at once" to "range filter, on the column of your choice" — the capability specs asked for (any numeric column filterable by range) is intact; only the UI's simultaneity is scoped for this change. Flagged as a real trade-off, not silently decided (Risks, below).

**Targeting is computed server-side, per request, not baked into the static corpus.** `getLatestListingSnapshots()` reads current listing `tags` from Supabase — "current" is the entire point of Targeting (a keyword that gets un-tagged tomorrow must stop showing a slot number tomorrow, not at the next `ingest-pulls.py --apply`). The Keyword Explorer route gains its first non-static data dependency. Implementation: the route's server component calls `getLatestListingSnapshots()`, computes a keyword→slot map via a new pure function (`lib/keyword-traction.ts`), and merges it onto the statically-loaded corpus rows before rendering — the corpus JSON and its static import are otherwise untouched.

**Supabase failure degrades Targeting only, silently.** If `getLatestListingSnapshots()` throws (missing env vars in a preview deploy, a transient Supabase error), the server component catches it, treats Targeting as unavailable for every row (blank, same as "no match"), and renders the rest of the page normally. No banner, no partial-page error state — consistent with Katy's round-01 feedback on `keyword-explorer` cutting the caveat banner ("the rule stays, I just don't need all the verbose slop"). The failure is logged server-side for anyone debugging it, not surfaced to the table.

**Ranked and Targeting sit immediately after KD, ahead of Found via / Searches per comp.** Reading order follows decision priority: demand (Searches/Competition/KD), then "am I already winning this" (Ranked/Targeting), then supporting detail (which query surfaced it, the demand ratio). This is a call this document is making, not one asked for verbatim — flagged as a decision rather than presented as given.

**Blank, not `0`, is enforced at the data layer, not just the render layer.** Both `lib/keyword-corpus.ts` (Ranked, from the static corpus) and the new `lib/keyword-traction.ts` (Targeting, from live snapshots) return `null` for "no match" — never `0` — so a future consumer of either function inherits the invariant instead of having to know to re-check it at render time.

## Risks / Trade-offs

**One active range filter at a time is a real reduction from "filter by range on any/every column simultaneously."** If Katy wants to combine two range filters (e.g. Searches > 100 AND Competition < 20) in the same view, this implementation doesn't support that yet — she'd filter one, read the results, then switch the filter to the other column. Accepted for this change because it ships the capability (range filtering exists, on any numeric column) without the UI complexity of N simultaneous min/max pairs; revisit if single-column filtering proves not enough in practice.

**Targeting depends on Supabase being reachable at request time.** Unlike every other column, Targeting's value can differ between two page loads seconds apart if Supabase is flaky — not because the underlying data changed, but because the read failed once and succeeded the next time. Mitigated by the silent-degrade decision above (a failed read reads as "no data," which is honest — it truly is unknown right now — never as "not targeted").

**Best-value collapsing discards order information a future view might want.** Ranked's "lowest position" and Targeting's "lowest slot" both assume lower is more useful to see first, which is true for search position but not obviously true for tag slot (Etsy doesn't strongly weight tag order). Accepted per Katy's explicit ask for a single sortable number; the full per-listing/per-slot detail is retained specifically so a later change can revisit this without re-deriving it from source data.
