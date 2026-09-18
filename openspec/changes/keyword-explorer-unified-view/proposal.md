# keyword-explorer-unified-view

## Human anchor

> "no I want them merged. a list of keywords, regardless of where we got them."
>
> "embroidery kits is an example of what I want to eventually happen. data from multiple sources to give different perspectives. So all the fields we have for it should get a column. If its empty its empty. Dont' conflate empty with zero."

— Katy, 2026-09-18

## Outcomes

- **Who:** Katy, reading the Keyword Explorer table while deciding whether a keyword is worth writing a listing for.
- **Job:** See every signal the archive has captured for a keyword — eRank Keyword Tool demand, eRank Bulk Keywords related-suggestion data, eRank Tag Report scoring of W&H's own tags, real-world Etsy ranking, live listing targeting — in one row, without cross-referencing three separate tables by hand. `embroidery kits` today: Keyword Tool (searches 2,918, competition 1,071,034, kd 100) *and* Bulk Keywords (avg searches 2,918, avg clicks 3,195, avg ctr 109%, same competition/kd) *and* nothing from Tag Report or Ranked — that gap pattern, not a single blended number, is the point.
- **Done when:** `/keyword-explorer` renders one table where each row is one keyword (case-insensitive exact text match — the same matching rule `ranked`/`targeting` already use), and every source that has data for that keyword populates its own columns on that row. A source with no data for a keyword leaves its columns blank — never `0`, and never merged into another source's number. The Tag Report (`docs/pulls/2026-09-15-erank-tag-report.csv`, archived but never read into the corpus) lands for the first time, as columns on this merged row rather than a fourth table.
- **Not doing:** no reconciling disagreeing numbers across sources into one "best" value — every source's fields stay its own columns, side by side, exactly as sparse or as populated as the archive actually is. No fuzzy or near-text matching (`"embroidery kits"` and `"embroidery designs"` are different keywords and stay different rows, even though one is a real W&H tag closely related to the other). No new ingestion sources beyond the three already landed or in-flight. No collapsing `found_via`, `matches` (Ranked/Targeting), or any other existing per-source structured detail — those stay exactly as rich as they are today, just reachable from a merged row instead of a source-specific one.

## Why

Three eRank instruments landed against `/keyword-explorer` over one session — Keyword Tool (the original table), Bulk Keywords (landed and read this session, its own `BulkKeywordTable`), and Tag Report (archived a session earlier, still unread) — each built as its own array and its own table, because each arrived as its own distinct CSV schema with its own distinct question (seed demand vs. related-term suggestion vs. score of a tag W&H already uses). That schema-per-table shape was a reasonable default while building the readers, but Katy corrected it directly: a keyword is a keyword regardless of which instrument measured it, and what she wants to see is every measurement of that one keyword together — not three lists she has to hold in her head at once to compare.

This also finishes the "blank, never 0" rule the archive has been building toward all session: `keyword-corpus`'s original coverage rule, the Ranked/Targeting join, the ranked-only synthetic row (`build_ranked_index`, just merged in #504), and Bulk Keywords' censored-value handling are all the same discipline applied source by source. A merged row is the natural end state of that discipline — one row, arbitrarily sparse, nothing in it fabricated.

## What changes

**The corpus becomes one keyword-keyed structure instead of parallel arrays.** Today: `rows` (Keyword Tool + ranked-only synthetic rows), `bulk_keywords.rows` (Bulk Keywords), and an unshipped `tag_report.rows`. After: one array, one row per distinct keyword text (case-insensitive), each row carrying an optional sub-object per source — Keyword Tool (`searches`/`competition`/`kd`/`foundVia`/`coverage`/`current`/`supersededBy`), Bulk Keywords (`avgSearches`/`avgClicks`/`avgCtr`/`etsyCompetition`/`kd`, each numeric field paired with its own censored flag), Tag Report (`tagOccurrences`/`avgSearches`/`avgClicks`/`avgCtr`/`etsyCompetition`/`kd`/`googleSearches`, same censored shape), Ranked (best position + every matching listing), Targeting (best tag slot + every matching listing, still request-time/live, still not part of the static corpus). A source absent for a keyword means that sub-object is `null` on the row — not a zeroed-out shape, an absent one.

**The table gains a column set per source instead of switching tables.** One `KeywordTable`, wider (roughly 18 columns across five sources plus keyword/status), each column sourced from its own sub-object, rendering blank when that sub-object is `null`. The table already scrolls horizontally rather than reflowing at narrow widths (existing convention, `design.md` of `keyword-explorer-etsy-traction`) — this is more columns of the same pattern, not a new one. `BulkKeywordTable` is retired; its logic moves into the merged table's Bulk Keywords column group.

**Tag Report gets its first reader.** `scripts/ingest-pulls.py` gains `read_tag_report_csv()`/whatever the merged build step needs — the value-parsing half (censored `< 20`, `Unknown`, blank KD) already exists as a stashed draft from before this proposal and reuses `parse_bulk_number()` unchanged; the row-shape half needs to change from "own array" to "join onto the merged row by keyword text," matching how Ranked already joins onto Keyword Tool rows today.

**Existing behavior these merged rows must not regress:** the ranked-only synthetic row logic (a term Etsy ranks for with no Keyword Tool data still gets a row) generalizes rather than disappears — it becomes one case of "at least one source has this keyword" rather than a special path bolted onto `build_corpus()` alone. The `current`/`supersededBy` semantics stay per-source (a Keyword Tool capture superseding another Keyword Tool capture says nothing about whether the Bulk Keywords sub-object on the same row is current or stale) — `design.md` settles the exact shape.

## Capabilities

### New Capabilities

- `unified-keyword-row`: one row per distinct keyword (case-insensitive exact match) merging every source's data as independent, individually-nullable column groups — Keyword Tool, Bulk Keywords, Tag Report, Ranked, Targeting — with no cross-source reconciliation and no fabricated values for an absent source.

### Modified Capabilities

- `keyword-explorer`: the table renders the unified row shape instead of three separate arrays/tables; gains a Tag Report column group (first time this instrument reaches the page); `BulkKeywordTable` retires into the merged table.
- `keyword-traction`: Ranked/Targeting's existing join-onto-a-row behavior (from `keyword-explorer-etsy-traction`) continues unchanged in shape, just onto the new unified row instead of the old Keyword-Tool-only row.

## Impact

- **New:** one merged corpus structure replacing three parallel ones; a Tag Report reader in `scripts/ingest-pulls.py`; roughly 8-10 new table columns (Tag Report's own fields); one retired component (`BulkKeywordTable`, folded into `KeywordTable`).
- **Unchanged:** the underlying `docs/pulls/` archive and its README/index conventions; the exact-text, case-insensitive matching rule (extended to a fourth source, not redefined); the never-fabricate-a-zero rule (extended, not redefined); `keyword-traction`'s live Targeting join.
- **Open before `design.md`:** exact column grouping/labeling for a ~18-column table (grouped headers vs. flat, e.g. "Bulk: Avg Searches" vs. a sub-header spanning several columns); whether `current`/`supersededBy` render per-source or are dropped from the visible table entirely (both already exist as hidden-but-computed fields per `keyword-explorer-etsy-traction`'s precedent).
- **Related:** `keyword-explorer-etsy-traction` (the change that shipped Ranked/Targeting) is functionally done — merged via #502 — and should be archived separately; not done as part of this change since its own scope is complete and unrelated to the merge itself.

## Optional links

- PR history this session: #502 (Ranked/Targeting), #503 (Bulk Keywords, merged), #504 (ranked-only rows, open)
