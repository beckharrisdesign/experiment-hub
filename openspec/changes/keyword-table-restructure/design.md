# keyword-table-restructure — design

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

> **Correction, 2026-09-21.** Before this round was drawn, the Plugin API was asked what the file actually contains. The answer: **four pages, all of them empty.** `01 Current state` (`0:1`), `02 Proposed` (`1:2`), `02.1 Proposed — scroll tools` (`3:2`) and `02.2 Proposed — one eRank band` (`4:2`) exist as pages and hold **zero children** between them. Every frame previously cited in this document, in this change's proposal, and in `keyword-captured-demand`'s `design.md` — `1:3`, `3:3`, `4:3` — **does not exist**. The file is also named `Document`, not `keyword-captured-demand`. Those citations described drawings that were never made; they are withdrawn rather than repaired. **Round 02.3 was the first round in this file with anything on the canvas**, and its node IDs were returned by the API that created it. Round 02.4 now supersedes it.

| Item | Value |
| --- | --- |
| Primary file URL | [`5zM3iearA5XFhHdjA0lV4D`](https://www.figma.com/design/5zM3iearA5XFhHdjA0lV4D/Document?node-id=7-2) — shared with #508 at Katy's direction, 2026-09-20: *"lets use the figma from 508 to kick off 509."* |
| Round 02.3 | Page `02.3 Proposed — full table` (`7:2`) — the whole table, both states, drawn from the corpus. Frames `7:3` and `7:255`. **Superseded.** Left as delivered, with Katy's header copy marked on `7:255` — that markup is her feedback on this round, and is what 02.4 answers. |
| Round 02.4 | Page `02.4 Proposed — alignment + header copy` (`11:2`), frames `11:3` / `11:255`. **Superseded.** Katy marked a further copy edit on it — `Tag Occurrence` → `Tag Count` — which 02.5 carries. |
| Round 02.5 | Page `02.5 Proposed — band rules` (`12:2`), frames `12:3` / `12:255`. **Superseded.** Katy renamed two more headers on it — `Best Position` → `Etsy SEO`, `Tag Slot` → `Listings` — which 02.6 carries. |
| Round 02.6 | Page `02.6 Proposed — Observed / Targeted / Performance` (`14:2`), frames `14:3` / `14:273`. The table itself; still the reference for column content. |
| Round 02.7 | Page `02.7 Proposed — frozen corner + full bleed` (`15:2`), frame `15:3`. Two viewport studies at 1440, mid-scroll in both axes — **A** as the current markup would behave, **B** with group labels pinned. |
| Round 02.8 | Page `02.8 Proposed — listings inside Targeted` (`16:2`), frame `16:3`. 28 columns; Targeted holds the count, the listings and the advertised listing, line-delimited. **Line-delimited cells superseded by 02.9.** |
| Round 02.9 *(current)* | Page `02.9 Proposed — sub-rows vs line breaks` (`17:2`), frame `17:3`. Focused study on one keyword: **A** line breaks, **B** listing sub-rows. |
| As-is frame | `Round 02.6 — Current state · 33 columns` (`14:3`), 3,325 × 374. Production as it stands: 33 columns, 7 bands, per-band rules, **no bucket tier**, and `Ranked` sitting before `Targeting`. |
| Proposed frame | `Round 02.6 — Proposed · 26 columns, three buckets` (`14:273`), 2,754 × 422. Carries Decisions 8–11: alignment, Katy's header copy, the band rules, and the **Observed / Targeted / Performance** tier. |
| Data | Not mocked. Six real rows rendered through the app's own formatting rules (`num`, `bulkValueLabel`, `demandRatio`) from `data/keyword-corpus.json`. `mandala embroidery pattern` is included specifically because it is one of the few rows carrying **both** Shop and Etsy Ads data, so those bands are populated rather than dashes in both frames. `folk art embroidery` shows the precision merge; `beginner embroidery` shows the Decision 2 collision. |
| Libraries / version | **None — gate still open.** `get_libraries` on this file returns `libraries_added_to_file: []`, and MVDS is not among the libraries available to add, so it cannot be enabled from here at all. Drawn on `app/globals.css` tokens (`--color-background-primary` `#194b31`, `--color-background-secondary` `#113723`, `--color-text-primary` `#cff7d3`, `--color-text-muted` `#4d9a60`, `--color-accent-primary` `#14ae5c`). Inter throughout; Fraunces headings not used, so the titles are not type-faithful. |
| Code Connect | No mappings to update. |
| Breakpoints | S · 480px / L · 1024px. Both frames draw the full table at its natural width, which is what the Big Join rule accepts at every breakpoint. |
| Status | Round 02.9 current, verified by screenshot. 02.3–02.8 kept; 02.7 remains the reference for scroll behaviour and 02.8 for the full column set. **MVDS gate open.** |

**Each revision is a new numbered page.** Katy, 2026-09-21: *"that should have been 2.4."* The alignment fix and her header copy were first applied on top of 02.3, which overwrote the round rather than answering it. Corrected: 02.3 is restored to how it was delivered (with her copy marks left on it, since those are hers) and **02.4 is the round that carries the response**. `rules/figma.mdc`'s page-per-iteration convention exists so a round stays readable as the thing that was actually reviewed — editing it afterwards destroys the record of what Katy responded to.

**One deviation in the band rule.** Production's rule spans the band's content box — `colSpan` width minus each `th`'s `px-3` padding — so the gaps between rules are that padding. The drawing spans the full band width including inter-column gaps. Visually equivalent at this scale; the implementation should follow the CSS, not measure the frame.

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

**8 — Alignment follows the data type: numbers right, dates right, text left.** Katy, 2026-09-21. This is **not a new behaviour** — `components/KeywordTable.tsx:917` and `:946` already render `column.numeric ? "text-right" : "text-left"`, and 30 of the 33 columns carry `numeric: true`. The three left-aligned columns are `Keyword`, `Found via` and `Listing`, which are the three without a `value` accessor. Round 02.3 was drawn uniformly left-aligned, which misrepresented production; **round 02.4** corrected both frames to match. **No code change is required for numbers or text.**

**There is no date column today**, so the date half of the rule has nothing to bind to yet. It is recorded as the standing rule for the table so that the next date field — a capture date is the obvious candidate, since every source sub-object already carries `capture` — lands right-aligned without re-litigating it. `Tag slot` is worth noting: it reads as text but carries `numeric: true` in code and so renders right today; the drawing follows production rather than quietly reclassifying it.

**9 — Header copy: Title Case, fewer abbreviations, clearer names.** Katy edited the proposed frame directly, 2026-09-21: *"title case, less abbreviation, more clarity."* She marked them on round 02.3's `7:255`; they are carried verbatim into round 02.6's `14:273` and are the contract for the rename:

| Today | Proposed |
| --- | --- |
| `Searches` | `Search Volume` |
| `Etsy comp.` | `Etsy Competition` |
| `Avg CTR` | `Avg CTR %` |
| `Google` (Tag Report) | `Google Volume` |
| `Tag occ.` | `Tag Count` |
| `S / comp.` | `Search / Competition` |
| `Best pos.` | `Etsy SEO` |
| `Tag slot` | `Listings` |

Two headers wrap onto two lines in the drawing (a `U+2028` line separator), which is a header-height decision the implementation should honour rather than flatten. Katy revised this set three times across rounds 02.3–02.5 — `Tag Occurrence` became `Tag Count`, `Best Position` became `Etsy SEO`, `Tag Slot` became `Listings` — so the table above is the state as of round 02.6, not a one-shot rename.

**This grows the change.** Consolidating eRank does not by itself require renaming `Best Position` or `Tag Slot`, which live in bands this change otherwise does not touch. The rename is carried anyway because the table is read as one surface and a half-renamed header row is worse than either end state. **Still open:** the Shop and Etsy Ads headers Katy did not reach — `L. sold`, `L. revenue`, `Click rate`, `Views`, `Clicks` — remain abbreviated, and whether her rule extends to them is her call, not an inference.

**10 — The per-band rule comes back, copied from production rather than invented.** Katy, 2026-09-21: *"we've lost this horizontal rule pattern — it was a really easy way of seeing what cols were grouped together."* She is right that it was lost, and it was lost in my drawing, not in the app: `components/KeywordTable.tsx:884` renders each band label inside `<span class="block border-b-2 border-accent-primary/50 pb-1">`, so every band already carries a 2px accent rule spanning exactly its `colSpan`, with the gaps between rules falling in each `th`'s `px-3` padding. Rounds 02.3 and 02.4 drew a single rule under the whole header row instead, which is a different statement — it separates header from body but says nothing about grouping.

Round 02.5 restores the real thing, and with it the rest of the band-label treatment the earlier rounds had also flattened: **uppercase with letter-spacing**, `--color-text-secondary` rather than accent, and the window in **parentheses, normal-case, muted** (`Shop — captured (this year)`) rather than folded into the label with a `·`. The band names now match `GROUPS` exactly, including `Etsy Ads — targeted`, which the earlier rounds had shortened to `Etsy Ads`.

**This matters more to this change than to any other.** The argument for merging is that three bands report one measurement, and the per-band rule is what makes that visible at a glance in the as-is frame — three separate underlines over three repetitions of Searches / Competition / KD. Without it the duplication has to be read column by column. **No code change: the app already does this; the drawing was wrong.**

**11 — Three buckets over the five bands: Observed, Targeted, Performance.** Katy, 2026-09-21: *"consider the high-level buckets as Observed (generic erank stats), Targeted (the keywords we're putting in real listings), and Performance (the rankings, real visits and clicks and purchases from real listings)."*

| Bucket | Bands | Columns | What it claims |
| --- | --- | --- | --- |
| **Observed** | `eRank` | 10 | A third party's estimate of the market. Nothing here has touched a W&H listing. |
| **Targeted** | `Targeting` | 1 | A deliberate act: this keyword was put in a real listing's tags. |
| **Performance** | `Ranked`, `Shop — captured`, `Etsy Ads — targeted` | 14 | What really happened — where we rank, who arrived, what they bought. |

The type comments back the split rather than the labels doing it: `TargetingMatch` is documented as *"a keyword's presence in current listing tags… `null` means not currently targeted"*, which is Targeted exactly; eRank's `tagOccurrences` is a query-scoped count from eRank's own export, so it stays Observed despite the word "tag".

**This forces one column-order change, and only one.** Production orders the bands `… Ranked, Targeting, Shop, Ads`, which splits Performance around Targeted. Swapping `Targeting` and `Ranked` makes all three buckets contiguous and nothing else has to move. That swap is the whole structural cost of the bucket tier.

**Targeted holds a single column, and that is the finding, not a flaw.** Ten columns of what someone else estimated, fourteen of what happened, and one recording what we actually chose to do. The asymmetry is real and the tier makes it visible for the first time; it is not a reason to pad the bucket out.

**Resolved by Decision 13 — where `Etsy Ads` belongs.** It sits in Performance here because every one of its seven columns is an outcome (views, clicks, spend, revenue, orders, ROAS), and Katy's definition of Performance names clicks and purchases, which only this band has. But the band is literally called *Etsy Ads — targeted*: a paid keyword is also a deliberate act, and an argument for putting it in Targeted is available. Recorded as Katy's call, not assumed.

**Visual hierarchy.** Buckets are 12px Bold, `--color-text-primary`, 1.5px tracking, over a **3px accent rule at full opacity**. Bands stay 11px Medium, `--color-text-secondary`, over a **2px accent rule at 50%**. Three weights of rule now carry three levels of grouping. One layout rule falls out of it: **a bucket is never narrower than its own label** — `Targeted` spans one narrow column, so that column widens to 86px to fit the word rather than letting it wrap.

**12 — Full bleed, a frozen corner, and pinned group labels.** Katy, 2026-09-21: *"bring back the frozen keyword column again so I can see how that plays with all these headers. perhaps frozen headers too. I also think this should break my typical max width rule and attempt to fill all available horizontal space."*

Three parts, and only the first is close to free.

**Full bleed.** `app/keyword-explorer/page.tsx:53` wraps the page in `mx-auto w-full max-w-[1200px]`. This surface breaks that rule. The honest accounting: at 1,440 the table still leaves **1,250px off-screen**; at the 1,200 cap it would be 1,490px. Full bleed buys about **240px — roughly three narrow columns.** Real, but it does not make a 2,690px table fit, and it should not be sold as if it did.

**The frozen corner.** Freeze already exists, but only in half the places it now needs to be: `KeywordTable.tsx:901` puts `sticky left-0` on the **column-header** row and `:944` on body cells. The band row's `th` has no sticky treatment, and **the bucket row this change adds has none either** — so freezing the keyword today would pin the word `Keyword` while the two tiers above it slid away. There is also **no `sticky top-0` anywhere**: vertical header freeze is entirely new. Study A draws the composition correctly — body, frozen column, frozen header block, and the corner that belongs to both.

**Pinned group labels — the finding.** Study A also shows what freezing *cannot* fix. Scrolled into the middle of Performance, the bucket label is off-screen entirely and the band label reads `PTURED (this year)`. Freezing the header row pins it **vertically**; it does nothing horizontally, and a left-aligned label at the start of a 14-column band is gone the moment you scroll into that band. The wider the buckets, the worse it gets — which means **the bucket tier from Decision 11 makes this worse, not better**, since its groups are the widest on the table.

Study B is the fix: each bucket and band label is `position: sticky; left: <frozen column width>` on the **label span**, so it rides the left edge of the scroll region while any of its columns are in view and hands over to the next group. Same mechanism as the frozen column, applied to the label rather than the cell. **Without this, Decision 11's buckets are legible only at rest**, which on a table this wide is most of the time not the case.

**Implementation gotcha.** The table renders with `border-collapse`, and sticky cells under `border-collapse: collapse` drop their borders in several browsers — the per-band rules of Decision 10 are exactly the borders at risk. Expect to move those rules onto the label span's own `border-b` (where Decision 10 already puts them) rather than onto the cell, and to verify the frozen column's divider renders at all.

**13 — Targeted answers "which listings", and the Ads band splits.** Katy, 2026-09-21: *"the ads are part of targeting - but they use listing as the unit of currency not keyword… the listings related to the keyword should go in targeted right after the count. So if three listings target the keyword I should see three listings right next to it. delimited by line breaks not commas."*

**The grain observation is the key, and it resolves the open Ads question from Decision 11.** The buckets do not actually divide by *source*; they divide by **whether a row records a choice we made or a result we got** — and the Ads band contains both. That we bid on this keyword, for this listing, is a deliberate act. Views, clicks, spend, revenue, orders and ROAS are what happened. So the band splits, exactly as `Targeting` and `Ranked` already split the same way:

| | The choice → **Targeted** | The result → **Performance** |
| --- | --- | --- |
| Tags | which listings carry the keyword, at which slot | where those listings rank (`Ranked`) |
| Ads | which listing we advertise it for | views, clicks, spend, revenue, orders, ROAS |
| Search | — | which listing a searcher reached, visits, sold, revenue |

Etsy Ads therefore does **not** move wholesale into Targeted. One column does — `Advertised on` — and the six outcome columns stay in Performance.

**Targeted becomes three columns:** `Listings` (the count), `Targeted on` (each listing on its own line, prefixed with its tag slot), `Advertised on`. The count column replaces what was previously the *best slot* — the slot survives, moved onto each listing's own line, which is strictly more information than `best` was.

**The data supports it and the cell stays small.** Live from `etsy_latest_listing_snapshots`: **36 active listings, 404 distinct tags, 1.16 listings per tag on average, 7 at most, and only 8 tags on four or more listings.** A line-delimited cell is normally one line and never more than seven. Line breaks over commas was the right call at this width — four comma-joined titles wrap into an unreadable paragraph. **Superseded by Decision 14**: the lines become sub-rows, which keeps the scannability and adds per-listing alignment.

**Two things this needs from the code, neither of which exists.** `computeTargeting` (`lib/keyword-traction.ts:37-46`) reads `RawListing`, which carries `title`, but stores only `{listingId, slot}` — the titles are dropped at the point they are available. And `lib/keyword-traction.ts:158` collapses `targeting: row.targeting?.best ?? null` at the client boundary, so `matches` never reaches the table at all. Both are small changes; neither is a rendering tweak.

**The finding: 108 keywords W&H actively targets have no row on this table.** Of 404 live tags, only **296 match a corpus keyword — 12.8% of the 2,310 rows**. The other 108 are tags on live listings that eRank has never scored, and the table cannot show them, because the corpus is built at ingest while Targeting is joined per-request. There is direct precedent for fixing this — Katy, 2026-09-18: *"add a row for the ranked keywords even if they don't have entries from the erank data"* — and the same argument applies with more force here, since these are keywords we *chose*. **Out of scope for this change; recorded as the next one.**

**Two columns now called "Listing".** `Targeted on` (listings carrying the tag) and Shop's `Listing` (the listing a searcher reached) are different claims. Shop's needs renaming — `Landed on` is the obvious candidate — or the table teaches the reader that "Listing" means two things.

**Cost: row height.** A keyword on four listings is a four-line row. `embroidery pattern` in round 02.8 is roughly four times the height of `folk art embroidery`. Uniform row height is gone, and with it easy vertical scanning; the drawing shows this honestly rather than sampling only single-listing keywords.

**14 — Sub-rows, not line breaks — and the reason is the opposite of the one that prompted the question.** Katy, 2026-09-21: *"so where we have more than one listing - should these be line breaks or pivot table style sub rows? that way \"Advertised on\" can align to the proper row."* **Sub-rows, yes — but they will rarely align anything, and that is exactly why they are worth having.**

The hoped-for alignment mostly does not exist in the data:

| Check | Result |
| --- | --- |
| Advertised keywords that are tagged on *any* listing | **3 of 14** |
| …whose ad listing is among that keyword's tagged listings | **1 of 3** |
| Landed-on keywords that are tagged on any listing | **0 of 11** |

`embroidery pattern` is the case in round 02.9: tagged on four listings, advertised on a **fifth that carries no such tag**. Under line breaks the advertised listing sits beside four unrelated ones and adjacency implies a relationship the data does not have. Under sub-rows it gets its own line with an empty `Slot` cell, and the gap becomes legible: **we are paying for a keyword on a listing that does not carry it.** That is a shop-strategy finding the table currently hides, and Decision 13's line-delimited cell would have kept hiding it.

**Sub-row membership is the union, not the intersection** — every listing related to the keyword by *any* relationship (tagged ∪ advertised ∪ landed-on ∪ ranked), because the whole point is the rows where one relationship holds and the others do not.

**The cost is a change of grain, and it is real.** The table stops being one row per keyword, which is the contract the corpus, the sort, the compound filters and the CSV export are all built on. Open questions the specs must answer: does sorting by `Search Volume` order parents only (sub-rows travelling with their parent), and does a filter on `ROAS` match a parent whose *sub-row* passes? The honest default is **sort and filter stay keyword-grained on the parent, sub-rows always travel with it** — otherwise a filter can orphan a listing from the keyword that explains it.

**The cost is bounded by how rare this is.** Rows with any listing relationship at all: 296 targeted + 14 advertised + 11 landed + 8 ranked = **at most 329 before dedupe, 14.2% of 2,310.** Nearly **86% of rows have no sub-rows whatever** and render exactly as they do today. Sub-rows appear only where there is something to align — which is also, unavoidably, where there is something to disagree.

**This supersedes the line-break half of Decision 13.** The `Targeted on` column keeps its content; it stops being a multi-line cell and becomes one line per sub-row. `Listings` (the count) stays on the parent, where it now doubles as the sub-row count.

## Risks / Trade-offs

**The MVDS gate is open, and it is now known to be un-closeable from here.** Round 02.9 is token-faithful but component-free, and `get_libraries` shows MVDS is not even offered to this file — so enabling it is a Figma UI action of Katy's, not a step that was skipped. This change ships no new controls, so the exposure is smaller than #508's: the risk is that the *drawing* is off, not the build.

**The change is no longer only about eRank.** It started as "merge three bands into one". It now also renames eight headers, reorders two bands, adds a grouping tier, takes the page full-bleed, and adds vertical header freeze plus horizontally pinned group labels — none of which the eRank merge requires. Each addition is Katy's and each is recorded, but the specs and tasks have to cover a table-wide restructure, not a band merge, **Renamed to `keyword-table-restructure` on 2026-09-21** (Katy: *"yes you can rename it"*) — kept whole rather than split, so the reasoning that connects the decisions stays in one place.

**"Zero contradictions" is a claim about today's corpus, not a property of eRank.** Every comparison count here is in the tens, not the thousands, because the three exports overlap on few keywords. The merge rule is safe on the evidence available and would need re-checking if the corpus grew substantially — the rule picks the first non-null on the assumption that exact values agree, and that assumption is measured, not guaranteed.

**Two different exact values would currently be silently resolved.** No such pair exists in 2,310 rows, so no handling is built. If eRank ever prints two different exact numbers for one field, the merge takes the first by precedence and the reader is never told. A cheap guard — surfacing a disagreement rather than picking — is deliberately deferred as speculative, and named here so it is a known gap rather than an oversight.

**The column count is exact; the width saving is not.** 33 → 26 is counted from `COLUMNS`, not estimated. How much narrower that renders is unknown — #508 learned that drawn widths understate reality by 66%, and the removed columns are numeric and narrow while the ones that dominate the 5,108px (`Listing`, `Found via`) all survive. The width win may be a good deal smaller than the column count suggests, and must be read off the running page.

**`Reported by` compresses two questions into one.** A keyword all three tools scored is better attested than one only the Tag Report mentions — but the column says nothing about whether those tools *agreed*, because with one boundary exception they always do. If contradictions become common, this column will be the wrong shape for the job.
