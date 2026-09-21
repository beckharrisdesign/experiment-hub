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

| Item | Value |
| --- | --- |
| Primary file URL | [`keyword-captured-demand`](https://www.figma.com/design/5zM3iearA5XFhHdjA0lV4D/keyword-captured-demand?node-id=4-3) — **shared with #508** at Katy's direction, 2026-09-20: *"lets use the figma from 508 to kick off 509."* Deliberate deviation from `rules/figma.mdc`'s file-per-change convention: both changes edit the same table, round numbering continues unbroken, and the open MVDS gate needs enabling once rather than twice. |
| As-is frame(s) | The BEFORE half of `Round 02.2` — three bands, 17 columns, with the six duplicated columns marked. It is clipped at the frame's right edge; that is the argument, not a drawing error. |
| Proposed frame(s) | Round 02.2 — page `02.2 Proposed — one eRank band` (`4:2`) → frame `Round 02.2 — one eRank band` (`4:3`). Before/after on the same six real rows; AFTER shows one band, 10 columns, `Reported by` as initials. |
| Libraries / version | **None — gate still open, carried forward from `keyword-captured-demand` task 4.4.** `get_libraries` on `5zM3iearA5XFhHdjA0lV4D` returns an empty `libraries_added_to_file`. Enabling MVDS Core is a Figma UI action only Katy can perform. Drawn on raw `app/globals.css` tokens. **One toggle and one round satisfies both changes.** |
| Code Connect | No mappings to update. `KeywordTable` is a hub component; the MVDS components it consumes are unchanged. |
| Breakpoints | S · 480px / L · 1024px. Behaviour identical at both — the table scrolls horizontally, nothing reflows. This change makes the 480px view meaningfully better for the first time, since seven fewer columns sit between the keyword and the next band. |
| Status | Round 02.2 built. **MVDS gate open.** |

## Decisions

**1 — Precedence is exact > censored > absent, applied per field.** For `Searches`, an exact reading beats a `< 20` cap, and a cap beats nothing. For `Competition` and `KD` the question does not arise: neither Bulk nor Tag carries a censored flag for them, and all 27 cross-source comparisons are identical, so the merge is free — first non-null wins and the result is the same whichever tool is asked. Where two tools both report a field exactly, they agree in every one of the 10 comparisons in the corpus, so the choice is likewise free. The merge never arbitrates between two different exact values because no such pair exists; if one ever appears, the reader should see it rather than have it silently picked — see **Risks**.

**2 — There is one genuine collision, and it is shown rather than resolved.** The proposal claimed every apparent disagreement inside eRank is precision rather than conflict. That is true for 19 of the 20 exact-vs-censored comparisons. It is **not** true for `beginner embroidery`: the Keyword Tool reports exactly `20` (captured 2026-09-18) and the Tag Report reports `< 20` (captured 2026-09-15). `20` is not below `20`, so these two genuinely collide — either eRank's cap means "≤ 20", or the value crossed the threshold in the three days between captures. The merge still takes the exact `20`, because an exact reading is strictly more useful than a cap and the alternative is showing a cap that at least one instrument contradicts. **The proposal's "zero contradictions" framing is corrected here rather than quietly carried forward.** Worth knowing: `20` is the *only* cap magnitude eRank uses in this corpus, and no row ever carries two caps of different size, so this is the single boundary the rule can strike.

**3 — `Reported by` renders initials: `KT · B · T`.** Settled by Katy, 2026-09-20. On a table this wide, spelling out three tool names per row costs more than it explains, and the band label already says eRank. A tool counts as reporting when its sub-object is non-null — i.e. it saw the keyword — which is what makes the column a statement about attestation rather than about any one field.

**4 — The three eRank source filters stay, re-pointed at provenance.** This was the proposal's one open question. It is answered by the code: `SOURCE_FILTERS` in `components/KeywordTable.tsx:417` already offers `Keyword Tool`, `Bulk Keywords` and `Tag Report` as filters, each reading `row.keywordTool !== null` / `bulkKeywords` / `tagReport`. The merge deletes those three fields, so **these filters break unless they are re-pointed** — doing nothing is not a neutral option, it is a silent capability loss. Since `Reported by` must carry the same provenance anyway, re-pointing them at it costs one predicate each. "Has Tag Report data" stays both visible and filterable.

**5 — Row-level provenance in the column, field-level provenance in the cell.** `Reported by` names which tools saw the keyword, but a reader looking at `Searches: 6` still cannot tell which of them printed the 6. Rather than spend columns on per-field provenance, the merged cell carries its source tool in a `title` attribute, so the answer is one hover away at zero width. **This is the one call in this document that goes beyond the proposal** — it is cheap and reversible, and if it is unwanted the column alone still satisfies the proposal's stated bar.

**6 — A censored value still reads as censored.** `< 20` keeps its `<`. The merge changes which tool a number came from, never whether it was capped.

**7 — `S / comp.` survives the merge and gets more rows, with censoring carried into the ratio.** The proposal's inventory of eRank fields missed this column. It is `kt.ratio` — searches divided by competition, computed in `lib/keyword-metrics.ts` — and it is the one eRank column that is *derived* rather than reported, which is how it escaped a list organised by which tool printed what. It must not be dropped: dropping it would be the single real regression available in this change.

Because it reads the Keyword Tool sub-object directly, it renders on **1,931 rows today**. Recomputed from the *merged* searches and competition it renders on **2,078** — 147 more. Of those 147, **114 rest on a censored searches value**, where the true ratio is an upper bound rather than a number. Consistent with Decision 6, the ratio inherits the censoring and renders `< 0.003` rather than `0.003`; the remaining 33 gain an exact ratio. `demandRatio()` changes signature from the Keyword Tool sub-object to the merged one, and returns the censored flag alongside the value.

## Risks / Trade-offs

**The MVDS gate is open and is the main risk, carried forward from #508.** Round 02.2 is token-faithful but component-free. This change ships no new controls, so the exposure is smaller than #508's — the risk is that the *drawing* is wrong, not the build.

**"Zero contradictions" is a claim about today's corpus, not a property of eRank.** Every comparison count here is in the tens, not the thousands, because the three exports overlap on few keywords. The merge rule is safe on the evidence available and would need re-checking if the corpus grew substantially — the rule picks the first non-null on the assumption that exact values agree, and that assumption is measured, not guaranteed.

**Two different exact values would currently be silently resolved.** No such pair exists in 2,310 rows, so no handling is built. If eRank ever prints two different exact numbers for one field, the merge takes the first by precedence and the reader is never told. A cheap guard — surfacing a disagreement rather than picking — is deliberately deferred as speculative, and named here so it is a known gap rather than an oversight.

**The column count is exact; the width saving is not.** 33 → 26 is counted from `COLUMNS`, not estimated. How much narrower that renders is unknown — #508 learned that drawn widths understate reality by 66%, and the removed columns are numeric and narrow while the ones that dominate the 5,108px (`Listing`, `Found via`) all survive. The width win may be a good deal smaller than the column count suggests, and must be read off the running page.

**`Reported by` compresses two questions into one.** A keyword all three tools scored is better attested than one only the Tag Report mentions — but the column says nothing about whether those tools *agreed*, because with one boundary exception they always do. If contradictions become common, this column will be the wrong shape for the job.
