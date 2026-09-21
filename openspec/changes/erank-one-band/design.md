# erank-one-band — design

## Context

`/keyword-explorer` renders 33 columns over seven source bands. Three of them — `eRank Keyword Tool`, `eRank Bulk Keywords`, `eRank Tag Report` — spend 17 columns reporting what the proposal establishes is **one measurement printed three times**. This change collapses them into a single `eRank` band of roughly 10 columns, picking the most precisely reported value per field and naming the reporting tools in a `Reported by` column.

The proposal's evidence was re-verified against the regenerated corpus before this document was written (`data/keyword-corpus.json`, 2,310 rows). Two numbers moved and one claim needs qualifying — see **Decision 2**. Nothing found changes the shape of the change.

| Field | Cross-source comparisons | Contradictions |
| --- | --- | --- |
| Avg searches (exact vs exact) | 8 (proposal said 7) | **0** |
| Competition | 27 | **0** |
| KD | 27 | **0** |
| Avg clicks / Avg CTR (Bulk vs Tag, exact) | 2 | **0** |
| Searches — exact vs censored | 20 | **1 boundary collision** |

The searches count rose from 7 to 8 because `#508` regenerated the corpus from 2,293 to 2,310 rows after the proposal was written; the new pair (`embroidery template`, 93 in both Bulk and Tag) agrees. **19 rows gain precision** from the merge, exactly as proposed.

## Goals / Non-Goals

**Goals:**

- One reported value per eRank field on the row, chosen by precision and never computed.
- Provenance survives the collapse — the reader can still see, and still filter by, which eRank tools scored a keyword.
- The band drops from 17 columns to ~10 without losing a single measurement.

**Non-Goals:**

- No averaging, summing or blending. The number on the row is always a number eRank printed.
- No touching Ranked, Targeting, Shop or Etsy Ads — all 15 of their columns survive byte-for-byte, and the inventory above is the check.
- No dropping single-tool fields (Avg clicks, Avg CTR, Google searches, Found via, Tag occurrences).
- No resolving the one genuine boundary collision by hiding it.

## User flow / IA

Unchanged entry, same screen, same controls. What changes inside the table:

1. **Band headers** — seven bands become five: `eRank`, `Ranked`, `Targeting`, `Shop — captured`, `Etsy Ads`.
2. **The eRank band** — 17 columns become 10.
3. **Every other band is untouched**, column for column — see the inventory below.
4. **Toolbar** — unchanged. The source filter keeps all seven of its entries, including the three eRank tools (**Decision 4**).

### Column inventory — all 33, before and after

Taken from `COLUMNS` in `components/KeywordTable.tsx`, not from the proposal's prose. **The table goes from 33 columns to 26.** Only the `kt` / `bulk` / `tag` groups are touched; nothing outside them is read, renamed or removed.

| Band | Before | After | What happens |
| --- | --- | --- | --- |
| *(none)* | `Keyword` | `Keyword` | Untouched. |
| **eRank** | `kt.searches`, `bulk.avgSearches`, `tag.avgSearches` | `Searches` | Merged by precedence. |
| | `kt.competition`, `bulk.etsyCompetition`, `tag.etsyCompetition` | `Etsy comp.` | Merged; all 27 comparisons identical. |
| | `kt.kd`, `bulk.kd`, `tag.kd` | `KD` | Merged; all 27 comparisons identical. |
| | `bulk.avgClicks`, `tag.avgClicks` | `Avg clicks` | Merged; 2 exact comparisons, both agree. |
| | `bulk.avgCtr`, `tag.avgCtr` | `Avg CTR` | Merged; as above. |
| | `tag.googleSearches` | `Google` | Kept — Tag Report only. |
| | `tag.tagOccurrences` | `Tag occ.` | Kept — Tag Report only. |
| | `kt.foundVia` | `Found via` | Kept — Keyword Tool only. |
| | `kt.ratio` | `S / comp.` | **Kept and widened — see Decision 7.** |
| | — | `Reported by` | New. |
| **Ranked** | `ranked` (`Best pos.`) | `Best pos.` | **Untouched.** |
| **Targeting** | `targeting` (`Tag slot`) | `Tag slot` | **Untouched.** |
| **Shop — captured** | `shop.visits`, `shop.etsy`, `shop.google`, `shop.listing`, `shop.sold`, `shop.revenue` | all 6, unchanged | **Untouched.** Reads `row.shopSearch`, which the merge never touches. |
| **Etsy Ads** | `ads.views`, `ads.clicks`, `ads.ctr`, `ads.spend`, `ads.revenue`, `ads.orders`, `ads.roas` | all 7, unchanged | **Untouched.** Reads `row.ads`, which the merge never touches. |

**17 eRank → 10; 16 non-eRank → 16; 33 → 26.** The Shop and Etsy Ads bands are the newest and thinnest-evidenced data in the corpus — 11 and 14 rows respectively — which is exactly why they are called out explicitly rather than assumed safe: a band that appears on 0.5% of rows is the one a careless refactor loses without any test going red.

## Visual design / Figma

> **Correction, 2026-09-21.** Before this round was drawn, the Plugin API was asked what the file actually contains. The answer: **four pages, all of them empty.** `01 Current state` (`0:1`), `02 Proposed` (`1:2`), `02.1 Proposed — scroll tools` (`3:2`) and `02.2 Proposed — one eRank band` (`4:2`) exist as pages and hold **zero children** between them. Every frame previously cited in this document, in this change's proposal, and in `keyword-captured-demand`'s `design.md` — `1:3`, `3:3`, `4:3` — **does not exist**. The file is also named `Document`, not `keyword-captured-demand`. Those citations described drawings that were never made; they are withdrawn rather than repaired. **Round 02.3 below is the first round in this file with anything on the canvas**, and its node IDs were returned by the API that created it.

| Item | Value |
| --- | --- |
| Primary file URL | [`5zM3iearA5XFhHdjA0lV4D`](https://www.figma.com/design/5zM3iearA5XFhHdjA0lV4D/Document?node-id=7-2) — shared with #508 at Katy's direction, 2026-09-20: *"lets use the figma from 508 to kick off 509."* |
| Round 02.3 | Page `02.3 Proposed — full table` (`7:2`) — **the whole table, both states, drawn from the corpus.** |
| As-is frame | `Round 02.3 — Current state · 33 columns` (`7:3`), 3,325 × 368. All 33 columns across 7 bands, with production's current header copy. The three eRank bands visibly repeat Searches / Competition / KD. |
| Proposed frame | `Round 02.3 — Proposed · 26 columns` (`7:255`), 2,717 × 381. One eRank band of 10; `Ranked`, `Targeting`, `Shop — captured` and `Etsy Ads` carry the same columns, values and order as the as-is frame. **Carries Katy's header copy edits (Decision 9), made in Figma on 2026-09-21 and preserved verbatim.** |
| Data | Not mocked. Six real rows rendered through the app's own formatting rules (`num`, `bulkValueLabel`, `demandRatio`) from `data/keyword-corpus.json`. `mandala embroidery pattern` is included specifically because it is one of the few rows carrying **both** Shop and Etsy Ads data, so those bands are populated rather than dashes in both frames. `folk art embroidery` shows the precision merge; `beginner embroidery` shows the Decision 2 collision. |
| Libraries / version | **None — gate still open.** `get_libraries` on this file returns `libraries_added_to_file: []`, and MVDS is not among the libraries available to add, so it cannot be enabled from here at all. Drawn on `app/globals.css` tokens (`--color-background-primary` `#194b31`, `--color-background-secondary` `#113723`, `--color-text-primary` `#cff7d3`, `--color-text-muted` `#4d9a60`, `--color-accent-primary` `#14ae5c`). Inter throughout; Fraunces headings not used, so the titles are not type-faithful. |
| Code Connect | No mappings to update. |
| Breakpoints | S · 480px / L · 1024px. Both frames draw the full table at its natural width, which is what the Big Join rule accepts at every breakpoint. |
| Status | Round 02.3 drawn, alignment corrected to match production, header copy edited by Katy in-file. Verified by screenshot. **MVDS gate open.** |

**Drawn width is not production width.** These frames are 3,325px and 2,717px; production measured **5,108px** for the as-is. The frames use compact hugging widths and six rows, so the absolute numbers understate — #508 recorded the same error at 66%. What the pair is evidence *for* is which columns exist and where, not how wide the result will be.

## Decisions

**1 — Precedence is exact > censored > absent, applied per field.** For `Searches`, an exact reading beats a `< 20` cap, and a cap beats nothing. For `Competition` and `KD` the question does not arise: neither Bulk nor Tag carries a censored flag for them, and all 27 cross-source comparisons are identical, so the merge is free — first non-null wins and the result is the same whichever tool is asked. Where two tools both report a field exactly, they agree in every one of the 10 comparisons in the corpus, so the choice is likewise free. The merge never arbitrates between two different exact values because no such pair exists; if one ever appears, the reader should see it rather than have it silently picked — see **Risks**.

**2 — There is one genuine collision, and it is shown rather than resolved.** The proposal claimed every apparent disagreement inside eRank is precision rather than conflict. That is true for 19 of the 20 exact-vs-censored comparisons. It is **not** true for `beginner embroidery`: the Keyword Tool reports exactly `20` (captured 2026-09-18) and the Tag Report reports `< 20` (captured 2026-09-15). `20` is not below `20`, so these two genuinely collide — either eRank's cap means "≤ 20", or the value crossed the threshold in the three days between captures. The merge still takes the exact `20`, because an exact reading is strictly more useful than a cap and the alternative is showing a cap that at least one instrument contradicts. **The proposal's "zero contradictions" framing is corrected here rather than quietly carried forward.** Worth knowing: `20` is the *only* cap magnitude eRank uses in this corpus, and no row ever carries two caps of different size, so this is the single boundary the rule can strike.

**3 — `Reported by` renders initials: `KT · B · T`.** Settled by Katy, 2026-09-20. On a table this wide, spelling out three tool names per row costs more than it explains, and the band label already says eRank. A tool counts as reporting when its sub-object is non-null — i.e. it saw the keyword — which is what makes the column a statement about attestation rather than about any one field.

**4 — The three eRank source filters stay, re-pointed at provenance.** This was the proposal's one open question. It is answered by the code: `SOURCE_FILTERS` in `components/KeywordTable.tsx:417` already offers `Keyword Tool`, `Bulk Keywords` and `Tag Report` as filters, each reading `row.keywordTool !== null` / `bulkKeywords` / `tagReport`. The merge deletes those three fields, so **these filters break unless they are re-pointed** — doing nothing is not a neutral option, it is a silent capability loss. Since `Reported by` must carry the same provenance anyway, re-pointing them at it costs one predicate each. "Has Tag Report data" stays both visible and filterable.

**5 — Row-level provenance in the column, field-level provenance in the cell.** `Reported by` names which tools saw the keyword, but a reader looking at `Searches: 6` still cannot tell which of them printed the 6. Rather than spend columns on per-field provenance, the merged cell carries its source tool in a `title` attribute, so the answer is one hover away at zero width. **This is the one call in this document that goes beyond the proposal** — it is cheap and reversible, and if it is unwanted the column alone still satisfies the proposal's stated bar.

**6 — A censored value still reads as censored.** `< 20` keeps its `<`. The merge changes which tool a number came from, never whether it was capped.

**7 — `S / comp.` survives the merge and gets more rows, with censoring carried into the ratio.** The proposal's inventory of eRank fields missed this column. It is `kt.ratio` — searches divided by competition, computed in `lib/keyword-metrics.ts` — and it is the one eRank column that is *derived* rather than reported, which is how it escaped a list organised by which tool printed what. It must not be dropped: dropping it would be the single real regression available in this change.

Because it reads the Keyword Tool sub-object directly, it renders on **1,931 rows today**. Recomputed from the *merged* searches and competition it renders on **2,078** — 147 more. Of those 147, **114 rest on a censored searches value**, where the true ratio is an upper bound rather than a number. Consistent with Decision 6, the ratio inherits the censoring and renders `< 0.003` rather than `0.003`; the remaining 33 gain an exact ratio. `demandRatio()` changes signature from the Keyword Tool sub-object to the merged one, and returns the censored flag alongside the value.

**8 — Alignment follows the data type: numbers right, dates right, text left.** Katy, 2026-09-21. This is **not a new behaviour** — `components/KeywordTable.tsx:917` and `:946` already render `column.numeric ? "text-right" : "text-left"`, and 30 of the 33 columns carry `numeric: true`. The three left-aligned columns are `Keyword`, `Found via` and `Listing`, which are the three without a `value` accessor. Round 02.3 was originally drawn uniformly left-aligned, which misrepresented production; both frames are now corrected to match. **No code change is required for numbers or text.**

**There is no date column today**, so the date half of the rule has nothing to bind to yet. It is recorded as the standing rule for the table so that the next date field — a capture date is the obvious candidate, since every source sub-object already carries `capture` — lands right-aligned without re-litigating it. `Tag slot` is worth noting: it reads as text but carries `numeric: true` in code and so renders right today; the drawing follows production rather than quietly reclassifying it.

**9 — Header copy: Title Case, fewer abbreviations, clearer names.** Katy edited the proposed frame directly, 2026-09-21: *"title case, less abbreviation, more clarity."* Her labels are preserved verbatim in frame `7:255` and are the contract for the rename:

| Today | Proposed |
| --- | --- |
| `Searches` | `Search Volume` |
| `Etsy comp.` | `Etsy Competition` |
| `Avg CTR` | `Avg CTR %` |
| `Google` (Tag Report) | `Google Volume` |
| `Tag occ.` | `Tag Occurrence` |
| `S / comp.` | `Search / Competition` |
| `Best pos.` | `Best Position` |
| `Tag slot` | `Tag Slot` |

`Best Position` and `Tag Slot` wrap onto two lines in the drawing (a `U+2028` line separator), which is a header-height decision the implementation should honour rather than flatten. One typo was corrected in place — `Posittion` → `Position`; say the word if that was deliberate.

**This grows the change.** Consolidating eRank does not by itself require renaming `Best Position` or `Tag Slot`, which live in bands this change otherwise does not touch. The rename is carried anyway because the table is read as one surface and a half-renamed header row is worse than either end state. **Still open:** the Shop and Etsy Ads headers Katy did not reach — `L. sold`, `L. revenue`, `Click rate`, `Views`, `Clicks` — remain abbreviated, and whether her rule extends to them is her call, not an inference.

## Risks / Trade-offs

**The MVDS gate is open, and it is now known to be un-closeable from here.** Round 02.3 is token-faithful but component-free, and `get_libraries` shows MVDS is not even offered to this file — so enabling it is a Figma UI action of Katy's, not a step that was skipped. This change ships no new controls, so the exposure is smaller than #508's: the risk is that the *drawing* is off, not the build.

**"Zero contradictions" is a claim about today's corpus, not a property of eRank.** Every comparison count here is in the tens, not the thousands, because the three exports overlap on few keywords. The merge rule is safe on the evidence available and would need re-checking if the corpus grew substantially — the rule picks the first non-null on the assumption that exact values agree, and that assumption is measured, not guaranteed.

**Two different exact values would currently be silently resolved.** No such pair exists in 2,310 rows, so no handling is built. If eRank ever prints two different exact numbers for one field, the merge takes the first by precedence and the reader is never told. A cheap guard — surfacing a disagreement rather than picking — is deliberately deferred as speculative, and named here so it is a known gap rather than an oversight.

**The column count is exact; the width saving is not.** 33 → 26 is counted from `COLUMNS`, not estimated. How much narrower that renders is unknown — #508 learned that drawn widths understate reality by 66%, and the removed columns are numeric and narrow while the ones that dominate the 5,108px (`Listing`, `Found via`) all survive. The width win may be a good deal smaller than the column count suggests, and must be read off the running page.

**`Reported by` compresses two questions into one.** A keyword all three tools scored is better attested than one only the Tag Report mentions — but the column says nothing about whether those tools *agreed*, because with one boundary exception they always do. If contradictions become common, this column will be the wrong shape for the job.
