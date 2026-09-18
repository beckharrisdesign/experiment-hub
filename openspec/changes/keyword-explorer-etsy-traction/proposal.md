# keyword-explorer-etsy-traction

## Human anchor

> "can we cross reference the keywords against actual etsy keyword data? I know its sparse, but a badge or a flag or a column that shows where these keywords are also getting real world traction?"
>
> "what I'd want to know - whether I ranked with that keyword or I'm trying to rank with it by putting it in my listing."
>
> "I want to be able to sort ranked by position so lets make it numeric not text. Same with Targeting - put which of the 13 tags this keyword is listed as, and make that a numeric column too. I also want this to include filtering by exclusion, like less than x or more than y. I dont need status or capture or coverage right now -- don't delete that data but I don't really need to see it in the main table."

— Katy, 2026-09-18

## Outcomes

- **Who:** Katy, reading the Keyword Explorer table while deciding whether a keyword is worth writing a listing for.
- **Job:** See, per keyword row, two separate real-world facts eRank's demand estimate can't tell her: has a W&H listing ever **ranked** for this exact term in Etsy search, and is she currently **targeting** it — the keyword sitting in one of a live listing's 13 tag slots right now, ranked or not. Sort and range-filter on both, the same as any other number in the table.
- **Done when:** every corpus row carries two independent **numeric** columns, sortable like every other numeric column. **Ranked** — the best (lowest) search-result position across any W&H listing that ranks for this exact term in the `erank-spotted-on-etsy` archive; blank when there is no match, never `0`. **Targeting** — the lowest tag-slot number (1–13) at which this exact keyword appears in the tags of any current listing (from live Supabase listing snapshots); blank when untargeted, never `0`. Either can be populated alone — ranked without still being targeted (the term got edited out of the listing since); targeted with no observed rank yet — and that combination is the signal, not a detail to collapse away. Full per-listing detail (every listing/page/position for Ranked, every listing/slot for Targeting) is retained in the `keyword-traction` data even though the visible cell shows one sortable number — **not doing** a value that changes shape depending on match count. Every numeric column in the table, including these two, gets a **range filter** — "less than x" / "more than y" — alongside the existing dropdown and text filters. The existing **Status, Capture and Coverage columns come off the visible table** — the fields stay computed and stored on the row exactly as before, just not rendered, so nothing here touches `keyword-corpus`'s data or its rules.
- **Not doing:** fuzzy or partial matching for either signal (`"snow globe"` inside `"snow globe ornament"` is a judgment call this change does not make) — exact keyword text only, against `erank-spotted-on-etsy` search terms for Ranked and against a listing's own tags array for Targeting. **Targeting no longer checks the title** — a numeric tag-slot value only means something for an actual tag match; a title hit has no slot number to report, so it is out of scope for this signal (it can always be its own future marker if it turns out to matter). No back-filling either signal for keywords that lack it — sparseness is the honest current state, not a bug. No new page or detail view; these are columns on the existing table. No writing anything back to `docs/pulls/`, the pull notes, or Etsy listings — this only reads both archives. No deleting Status/Capture/Coverage data or the corpus fields behind them — hidden from the table, not removed from the model.

## Why

Keyword Explorer answers one question — market demand, from eRank's Keyword Tool — and deliberately answers only that one (`keyword-corpus`'s whole design is refusing to blend measures that disagree, per `docs/pulls/README.md`'s `measures` axis). But Katy runs two other instruments that answer two different questions over the same keywords, and her own framing keeps them apart on purpose: *"whether I ranked with that keyword or I'm trying to rank with it."*

**Ranked** comes from `erank-spotted-on-etsy`: where W&H listings actually rank in Etsy search, for the terms eRank Monitor tracks. Currently 12 rows / 8 terms, 0 of which match the 410-row corpus — confirmed by direct comparison. Expected: the corpus is generic market-research seeds (`alocasia`, `christmas`, `embroidery-font`…), Spotted on Etsy is scoped to this shop's own listings. But it's a pull series — repeat captures accumulate under the same naming rule (`docs/pulls/README.md` § Repeat pulls) — so the overlap grows every re-pull, with zero code changes needed to surface it.

**Targeting** comes from live listing content, not a pull archive at all: `getLatestListingSnapshots()` (`lib/etsy-sync.ts`) already exists as a server-side Supabase read — built and unit-tested for `etsy-zero-sales-funnel`, whose own scorecard page has not yet been wired up to call it (its `tasks.md` §3.2 is still open). **Correction from an earlier draft of this proposal**, which claimed that page "already ships in production" — it doesn't; the read itself does exist and is real, but this change is its first live consumer, not a second one. Etsy gives a listing 13 tag slots, and which slot a keyword sits in is itself information worth a number, not just a yes/no. A keyword can be targeted without ranking yet (just added to a listing, too early to show up), or have ranked once without being targeted today (the term got edited out, as `2026-09-17-erank-spotted-on-etsy.md` §2 already documents happening to `calm stitching`). Collapsing those into one marker would erase exactly the distinction Katy asked for.

The alternative — cross-referencing three tables by hand — is the status quo, and is what `2026-09-17-erank-spotted-on-etsy.md`'s own distillation warns against: position, demand and content are different questions, easy to blur when read from memory instead of side by side.

## What changes

**Ranked: a join computed at ingest time, collapsed to a sortable number.** `scripts/ingest-pulls.py`'s corpus build gains a pass that reads every `erank-spotted-on-etsy` CSV in `docs/pulls/`, matches each row's `Search Term` against corpus keywords (case-insensitive exact), and attaches matches to the keyword row — regenerated by the same `--apply` run that already builds the corpus. The same term can have multiple W&H listings ranking at different positions (`snow globe`: two listings, positions 8 and 38) — the **cell value is the best (lowest) position**, because that is what "sort by rank" means, but the full list per listing stays on the row in `keyword-traction` rather than being discarded, the same way `keyword-corpus` keeps every query's tag-occurrence count instead of averaging them away.

**Targeting: a live check against current listing tags, also a sortable number.** The Keyword Explorer page (currently a static import, per `keyword-explorer/design.md`'s "no runtime read to fail on Vercel") awaits `withTargeting()` (`lib/keyword-traction.ts`) — the I/O wrapper that calls `getLatestListingSnapshots()`, checking each corpus keyword against the `tags` array of every current listing (exact match, case-insensitive), and merges the result onto the corpus rows. **The cell value is the 1-based slot index** (1–13) of the earliest match across listings, mirroring Ranked's "lowest is the headline number" rule. This is the one piece of the surface that is no longer purely static — `design.md` settles the fetch/caching shape: `getLatestListingSnapshots()` holds a 60-second per-server-instance cache (added after review — "request-time" means "at most a minute stale," not strictly per-request), and `withTargeting()`'s own try/catch means a Supabase hiccup degrades the Targeting column, not the whole page.

**Both are numbers, not badges, so they sort and range-filter like every other column.** No more "Ranked · pos 8" text — the cell is `8`, blank when there is no match (never `0`, which would misrepresent "no data" as "ranks first"). This is a reversal of Figma round 01, which rendered both as MVDS `Badge` components; round 02.1 (below) replaces them.

**A range filter joins the existing filter row.** Today's filters are dropdowns (capture/query/status) plus free-text on keyword — nothing lets Katy ask "searches > 100 and competition < 20" or "ranked ≤ 10". Every numeric column (Searches, Competition, KD, Searches/comp., and the two new ones) gets a min/max range filter; `design.md` decides the control (paired number inputs vs. an operator-and-value picker).

**Status, Capture and Coverage leave the visible table, not the data model.** All three stay computed on every row exactly as `keyword-corpus` already produces them — nothing about the corpus, the ingest step, or the "absence is not a verdict" rule changes. They simply stop being rendered as columns; `design.md`/`tasks.md` decide whether they're gone entirely for now or tucked behind a future per-row detail view.

**Sparse-by-default is the expected state for Ranked, not a fallback to design around.** At today's data, 0 of 410 rows carry a Ranked value; Targeting will show real coverage immediately since it reads current listings directly. Both must read as correct and unremarkable at whatever count they show, not as broken or empty-state-worthy.

## Capabilities

### New Capabilities

- `keyword-traction`: two independent numeric signals joined onto `keyword-corpus` rows — **Ranked** (best position, from the `erank-spotted-on-etsy` pull series, ingest-time) and **Targeting** (lowest matching tag-slot 1–13, from live listing snapshots, request-time) — the best-match collapsing rule, the full per-listing detail retained underneath it, and the "absence is not a verdict, blank not zero" semantics that mirror `keyword-corpus`'s own filtered-subset rule.

### Modified Capabilities

- `keyword-explorer`: the table gains two numeric, sortable, range-filterable columns sourced from `keyword-traction`; gains a numeric range filter usable on every numeric column, existing ones included; loses Status, Capture and Coverage as visible columns (data unchanged, still computed); and the route gains a server-side data dependency it didn't have before (Targeting). Row-grain and no-pagination rules are unchanged.

## Impact

- **New:** one ingest step (inside the existing `scripts/ingest-pulls.py --apply` run) for Ranked; one server-side Supabase read (reusing `lib/etsy-sync.ts::getLatestListingSnapshots`, no new credential) for Targeting; two numeric fields (plus their retained per-listing detail) on the corpus's keyword rows; two table columns; one range-filter control, generalized across all numeric columns; three columns hidden (not removed) from the table.
- **Unchanged:** `keyword-corpus`'s demand data and its own rules, `docs/pulls/` conventions and `index.json`, every other hub surface, the Status/Capture/Coverage fields themselves.
- **Architecture note, settled in `design.md`:** Targeting is the first thing on this route that isn't a static import. The route stays a hub page, not an API route, but it can no longer claim zero runtime dependencies. `design.md` § Decisions settles what the page shows if the Supabase read fails or the env vars are absent (e.g. in a preview deploy): `withTargeting()` degrades Targeting to blank for every row rather than taking down a page that otherwise has everything it needs baked in — and `getLatestListingSnapshots()` holds a 60-second cache on top, so the read itself doesn't happen on every single request either (§ Risks/Trade-offs).
- **Data dependency, not a blocker:** Ranked ships useful (if sparse) at 12 rows / 8 terms today and grows with zero further code changes as `erank-spotted-on-etsy` is re-pulled. Targeting ships with real, current coverage from day one.

## Optional links

- Figma rounds (rough — shape and composition, per `rules/figma.mdc` § When the first round happens), file `keyword-explorer-etsy-traction` (`qN2BGnkJSbwAuD9aibhpZ3`):
  - `01 Current state` → `As-is · Desktop 1024` (node `3:3`) — reconstructed from the shipped `components/KeywordTable.tsx`; no Ranked/Targeting column exists there today.
  - `02 Proposed` → `Proposed · Desktop 1024` (node `2:72`) — round 01, **superseded**: Ranked/Targeting as MVDS `Badge` text (`"Ranked · pos 8"`). Left intact per the page-per-iteration rule, not the frame to review.
  - `02.1 Proposed — numeric columns, range filters` → `Proposed · Desktop 1024` (node `4:4`) — **current**: <https://www.figma.com/design/qN2BGnkJSbwAuD9aibhpZ3?node-id=4-4>. Ranked/Targeting as plain right-aligned numbers (blank, not `0`, when absent), a range-filter chip (`Ranked ≤ 20`) added to the filter row, Status/Capture/Coverage dropped from the header.
- The archives this joins: [`docs/pulls/README.md`](../../../docs/pulls/README.md) (landing zone + `measures` axis), [`2026-09-17-erank-spotted-on-etsy.md`](../../../docs/pulls/2026-09-17-erank-spotted-on-etsy.md) (Ranked source), [`lib/etsy-sync.ts`](../../../lib/etsy-sync.ts) (Targeting source, `getLatestListingSnapshots`)
- The capability this extends: [`openspec/changes/keyword-explorer/`](../keyword-explorer/) (not yet archived — proposal, design, tasks for the table this adds markers to)
- Where `getLatestListingSnapshots()` comes from: [`openspec/changes/etsy-zero-sales-funnel/`](../etsy-zero-sales-funnel/) (built and unit-tested there; this change is its first live caller, not a second one — see the correction above)
- No `experiments/<slug>/` — hub platform work, per `rules/openspec-workflow.mdc` § Shared hub behavior.
