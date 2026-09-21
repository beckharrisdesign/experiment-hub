# keyword-table-restructure

> **Renamed 2026-09-21** (was `erank-one-band`). The proposal below is the original eRank merge, unchanged and still the change's starting point. It has since grown — header copy, band order, a bucket tier, full bleed, a frozen corner, and listings inside Targeted — at Katy's direction across rounds 02.3–02.8. Those additions live in `design.md` as Decisions 8–13; this file is left as written so the original argument stays readable. Katy, 2026-09-21: *"yes you can rename it."*

## Human anchor

> "The average searches of the erank tag report are the same stats as the average searches of the keyword tool and the bulk tool. Lets combine all the erank data that we have into one grouped set of columns."

— Katy, 2026-09-20

## Outcomes

- **Who:** Katy, reading the Big Join to decide what a keyword is worth.
- **Job:** See eRank's estimate of a keyword **once**, at the best precision any of its three tools reported, instead of reading the same number across three bands and checking whether they agree.
- **Done when:** `/keyword-explorer` carries a single eRank band. A keyword's Searches, Competition and KD appear in one column each, sourced from whichever eRank tool reported them most precisely, with a column naming which tools saw the keyword. The table loses roughly a third of its width without losing a single measurement.
- **Not doing:** no averaging, summing or blending — the merge picks a reported value, never computes one. No touching Ranked, Targeting, Shop or Etsy Ads; those measure genuinely different things and stay their own bands. No dropping the fields only one tool reports (Avg clicks, Avg CTR, Google searches, Found via).

## Why

The current table gives eRank three bands — Keyword Tool, Bulk Keywords, Tag Report — with `Avg searches`, `Etsy comp.` and `KD` repeated in each. That was built on the assumption that three instruments meant three measurements. **Checked against the corpus, they are one measurement reported three times.**

| Field | Uncensored comparisons across sources | Contradictions |
| --- | --- | --- |
| Avg searches | 7 | **0** |
| Competition | 27 | **0** |
| KD | 27 | **0** |

Where two eRank tools both report a field exactly, they are identical — `personalized gift` reads 41,355 in both Keyword Tool and Tag Report; `embroidery kits` reads 2,918 in both Keyword Tool and Bulk Keywords; `hand embroidery` reads 564 in both.

Every apparent disagreement is **precision, not conflict**. `folk art embroidery` reads `6` in the Keyword Tool and `< 20` in the other two: one tool scored it exactly, the others capped it. `6` is below `20`, so the two agree — one is simply more useful.

**This corrects a claim in the previous change.** `keyword-captured-demand`'s proposal cited `folk art embroidery` as evidence that "sources disagree, and only a merged row shows it." That reading was wrong: an exact value and a cap that contains it are not in disagreement. The genuine cross-source conflict in this corpus is elsewhere — listing 4466080258 reporting 2 orders/$12 in Etsy Ads and 1 sold/$6.00 in listing stats — and that one is between *different* surfaces, which this change does not touch.

## What changes

**Three eRank bands become one.** `eRank Keyword Tool`, `eRank Bulk Keywords` and `eRank Tag Report` merge into a single `eRank` band. The three duplicated fields — Searches, Competition, KD — become one column each. The fields unique to one tool keep their own columns inside the band: `Avg clicks` and `Avg CTR` (Bulk and Tag), `Google searches` (Tag), `Found via` (Keyword Tool), `Tag occurrences` (Tag). Nothing measured is dropped.

**The merge picks the most precise reported value; it never computes one.** For each field, an exact value beats a censored one (`6` over `< 20`), and a censored value beats nothing. Where two tools both report exactly they are identical, so the choice is free — proven above, not assumed. **19 rows currently show a censored value that a more precise one can replace.** No averaging, no summing, no "best of" arithmetic: the number on the row is always a number eRank actually printed.

**A `Reported by` column names the tools.** Collapsing three bands into one would otherwise hide which instruments saw a keyword, which is real information — a keyword all three tools scored is better attested than one only the Tag Report mentions. The column lists them, so provenance survives the merge.

**A censored value still reads as censored.** `< 20` keeps its `<`. The merge changes which tool a number came from, never whether it was capped.

**Width.** eRank currently spends 17 of the table's 33 columns. Merging removes the two duplicate sets of Searches / Competition / KD and the duplicate Avg clicks / Avg CTR, taking the band to around 10. On a table measured at 5,108px in production this is the first change that makes it meaningfully narrower without hiding anything — which is consistent with the Big Join rule, since nothing is being edited down. A duplicate is not a signal.

## Capabilities

### New Capabilities

- `erank-merged-source`: eRank's three exports reduced to one reported value per field, chosen by precision and never computed, with the reporting tools named on the row.

### Modified Capabilities

- `keyword-explorer`: three eRank bands collapse into one; the duplicated columns disappear and a `Reported by` column appears.

## Impact

- **New:** a merge step in `scripts/ingest-pulls.py`; an `erank` sub-object on the merged row; a `Reported by` column.
- **Changed:** `KeywordRow` / `KeywordTableRow` lose `keywordTool` / `bulkKeywords` / `tagReport` in favour of one `erank`; the table drops ~7 columns.
- **Unchanged:** Ranked, Targeting, Shop and Etsy Ads; the never-fabricate-a-zero rule; the verbatim-capture rule; compound filters, two-key sort, export and the scroll tools.
- **Settled:** `Reported by` renders **initials** — `KT · B · T` — per Katy, 2026-09-20. On a table this wide, spelling out three tool names per row costs more than it explains, and the band already says eRank.
- **Open before `design.md`:** whether a row should still be filterable by "has Tag Report data" once the band no longer shows which column came from where. The `Reported by` values make it *visible*; whether it stays *filterable* is a separate call.
- **Carried forward:** the MVDS Figma gate is still open from `keyword-captured-demand` (task 4.4). Rounds for this change are drawn on that change's file at Katy's direction, so one MVDS toggle and one round can satisfy both.

## Figma

Drawn on the `keyword-captured-demand` file rather than a new one — Katy, 2026-09-20: *"lets use the figma from 508 to kick off 509."* This deviates from `rules/figma.mdc`'s file-per-change title convention, deliberately: both changes edit the same table, the round numbering continues unbroken, and the open MVDS gate needs enabling once rather than twice.

| | |
| --- | --- |
| File | [`keyword-captured-demand`](https://www.figma.com/design/5zM3iearA5XFhHdjA0lV4D/keyword-captured-demand?node-id=4-3) — shared with #508 |
| Round 02.2 | Page `02.2 Proposed — one eRank band` (`4:2`) → frame `Round 02.2 — one eRank band` (`4:3`) |
| Contents | Before/after on the same six real rows. BEFORE: three bands, 17 columns, with the six duplicated columns marked. AFTER: one band, 10 columns, `Reported by` as initials. |
| Library | **None — gate still open.** `get_libraries` on this file still returns an empty `libraries_added_to_file`; MVDS can only be enabled from the Figma UI. Drawn on `app/globals.css` tokens. |

The BEFORE table is clipped at the frame's right edge, which is not a drawing error — it is the point. Seventeen eRank columns do not fit in 1,500px.
