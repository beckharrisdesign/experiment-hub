# keyword-explorer-unified-view — design

## Context

`/keyword-explorer` renders two tables today: `KeywordTable` (Keyword Tool rows plus the ranked-only synthetic rows from #504) and `BulkKeywordTable` below it, each a different eRank instrument with its own CSV schema. A third instrument, the Tag Report, has sat archived and unread since 2026-09-15. This change merges all of them into one row per keyword with a column group per source.

Round 01 was drawn at proposal time per the schema and settled the header treatment and the blank treatment. Round 02.1 here carries the as-is/proposed pair on MVDS and the breakpoints. Numbering continues from round 01 rather than restarting.

**Counted while drawing 02.1, and it reframes the change:** the 2022 rows the corpus holds today collapse to **1939 distinct keywords** — the surplus is the same keyword captured twice. Adding 96 bulk-only keywords and 258 Tag-Report-only tags gives **2293 merged rows**. So the merge both *collapses* (duplicate captures of one keyword) and *expands* (keywords no instrument but one has seen). The header count on the page changes meaning accordingly: "2022 observations" becomes "2,293 keywords".

## Goals / Non-Goals

**Goals:**

- One table on the page, with a band naming each source above its own short column headers.
- Every source's fields reachable on the row for a keyword, however sparse that row is.
- Absence renders one way, and never as `0`.
- The Tag Report reaches the page for the first time.

**Non-Goals:**

- No reconciling disagreeing values across sources into a single "best" number — `folk art embroidery` reads 6 in Keyword Tool and `< 20` in two others, and the design shows all three rather than picking.
- No reflow, card fallback or column-hiding at narrow widths. The table scrolls horizontally, as it already does.
- No second blank treatment distinguishing a reported `Unknown` from an absent source (round 01 decision).
- No change to how Ranked or Targeting are computed — only what row they land on.

## User flow / IA

Unchanged entry: `/keyword-explorer` is a root route, reached directly while writing a listing. One screen, no navigation.

What changes inside it:

1. **Header** — keyword count instead of observation count, and "across 5 sources" instead of "across N captures".
2. **Filters** — the existing Capture / Status / range-column Selects stay MVDS `Select`. A Source filter is the one addition, so a reader can narrow to rows a given instrument has data for.
3. **One table** — source bands, then column headers, then rows. The reader scans down a keyword, then across its sources.
4. **The Bulk Keywords section is gone** — its heading, its explanatory paragraph and its table are absorbed. The `< N` / dash explanation the paragraph carried moves to a single note under the merged table, since it now applies to three sources rather than one.

## Visual design / Figma

| Item                | Value                                                                                                                                                                                                                                                                                                |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Primary file URL    | [`keyword-explorer-unified-view`](https://www.figma.com/design/xYzJT8BDwMyTKhtH2qfOh6/keyword-explorer-unified-view) — design file (a surface question; a board cannot answer what a 20-column table looks like)                                                                                        |
| As-is frame(s)      | Page `01 Current state` (`0:1`) → `As-is · Desktop 1024` (`6:45`) — reconstructed from `app/keyword-explorer/page.tsx`, `components/KeywordTable.tsx` and `components/BulkKeywordTable.tsx`. Real MVDS `Select` and `Badge` instances; row values from the live corpus.                                  |
| Proposed frame(s)   | Page `02.1 Proposed — MVDS` (`7:11`) → `Proposed · Desktop 1024` (`7:12`) and `Proposed · Mobile 480` (`7:223`) — **current**. Round 01 (`02 Proposed`, page `1:2`, frame `1:3`) stays intact: it carries both header treatments and the decision record, and is superseded only as a visual treatment. |
| Libraries / version | `MVDS Core` — `lk-d54f86bc…09687`, subscribed to this file 2026-09-20. Colour and type from `app/globals.css` tokens (`--color-background-primary` `#194b31`, `--color-text-primary` `#cff7d3`, `--color-accent-primary` `#14ae5c`), Fraunces headings / Inter body.                                     |
| Code Connect        | No mappings to update. `KeywordTable` is a hub component, not an MVDS one; the MVDS components it consumes (`Select`, `Badge`) are unchanged by this work.                                                                                                                                              |
| Breakpoints         | S · 480px mobile / L · 1024px desktop (BHD Content Types) — see `rules/design-guidelines.mdc`. Both drawn. The table is 2,008px at either, so both scroll; 1024 shows through the Bulk Keywords band, 480 shows the keyword plus two Keyword Tool columns.                                               |
| Status              | Round 02.1 built and screenshotted; awaiting approval.                                                                                                                                                                                                                                                 |

### Round series

| Round | Page | What it settled |
| --- | --- | --- |
| 01 | `02 Proposed` (`1:2` → `1:3`) | Grouped source bands over per-header prefixes; one blank treatment. Low-fidelity, bespoke palette — deliberately not the hub's. |
| 02.1 | `02.1 Proposed — MVDS` (`7:11`) | The same decisions rendered on MVDS and real tokens, at both breakpoints, against the as-is. |

## Decisions

**1 — Source bands carry no colour of their own.** Round 01 gave each band its own hue, which read well on a neutral board but has no basis in the hub's tokens: the only multi-hue token set is `--color-score-1…5`, which means *score*, and borrowing it to mean *source* would be inventing a colour semantics the system does not have. In 02.1 every band is `--color-text-secondary` with a `--color-accent-primary` rule beneath it, and identity comes from the label and the grouping. If the bands later need to be told apart at a glance, that is a token conversation in MVDS, not a local override here.

**2 — Round 01's palette was a delta, and this is where it is paid off.** The low-fi board was slate; the hub is dark green. That was the right trade for a round asking "is 20 columns readable" — but it means 02.1, not 01, is the frame to judge colour and contrast against.

**3 — The `< N` note moves and generalises.** Today the censored-value explanation lives in the Bulk Keywords section's paragraph, because Bulk Keywords was the only censored source. Tag Report is censored the same way, so the note becomes one line under the merged table covering both.

**4 — A Source filter is added, and it is the only new control.** With 90% of Tag Report tags appearing in no other source, an unfiltered table is mostly blank by construction. Narrowing to "rows Bulk Keywords has data for" is the cheapest way to make the table dense on demand without hiding anything by default.

**5 — Mobile keeps every column.** 480px shows roughly three columns before scrolling, which is poor — but the alternatives are worse: hiding columns makes the sparseness invisible, and a card-per-keyword layout destroys the side-by-side comparison that is the entire point of merging. Horizontal scroll is the existing convention (`keyword-explorer-etsy-traction` § design) and it is kept.

## Risks / Trade-offs

**A 20-column table is genuinely hard to read, and no header treatment fixes that.** Round 01 chose the better of two options, not a good one. The mitigation is the Source filter plus per-column sorting; if that proves insufficient in use, the next move is a per-source column-group toggle, which is deliberately out of scope here.

**`current` / `supersededBy` is still unresolved, and the merge makes it sharper.** 2022 rows collapsing to 1939 keywords means 83 keywords carry more than one Keyword Tool capture, and the merged row shows one set of values. Which capture wins, and whether the row says so, is not settled by this document — it was parked as open at proposal time and stays open. `tasks.md` must not assume an answer; if implementation forces one, it comes back here first.

**The as-is frame is a reconstruction, not a capture.** `pnpm dev` needs 1Password, which agent-spawned shells cannot reach, so `01 Current state` is drawn from the source rather than screenshotted from the running page. Row values are real (pulled from `data/keyword-corpus.json`), but spacing and type are read off Tailwind classes rather than measured from a browser. Treat small metric differences as reconstruction error, not as proposed change.

**Retiring `BulkKeywordTable` removes a tested component.** Its censored-value rendering and its `current`/`superseded` Badge are covered by existing tests; those behaviours must survive the move into the merged table rather than being rewritten, or the change quietly loses coverage.
