---
source: erank
surface: spotted-on-etsy
captured: 2026-09-17
tier: external
scope: shop
measures: [position]
subjects: [patterns, holiday, grandma-hobbies]
half_life: 14d
answers: >-
  Where W&H listings actually rank in Etsy search, by term. Positions move fast — re-pull before citing.
---
# Data pull — eRank "Spotted on Etsy", captured 2026-09-17

**Provenance:** eRank Monitor export, 2026-09-17. Raw file kept alongside this note as `2026-09-17-erank-spotted-on-etsy.csv` (12 rows, small enough to keep in-repo like the tag report). Archive a copy flat in `Drive: W+H Listings/W+H Data Pulls/`.

**Why this one matters more than the others:** it is the shop's **first direct observation of organic ranking position**. Every prior instrument measured something downstream — visits (Search Analytics), impressions and clicks (ads panels), or marketwide demand (eRank tag report). None of them could answer *where does a listing actually sit in Etsy's results*. This does, for 12 listing/term pairs. It arrives on **day 2** of the tag positioning experiment, which makes it a near-baseline observation rather than a readout.

## The rows, mapped

Listing ids resolved against the `2026-09-17` snapshot; arms from the [experiment plan](../../experiments/etsy-notion-sync/docs/tag-positioning-experiment.md).

| Listing | Arm | Search term | Page | Pos |
|---|---|---|---|---|
| 4466076995 *Digital geometric…* | **protected** | `calm stitching` | 1 | **1** |
| 4417250834 *Digital hand drawn leaves…* | **control** | `calm stitching` | 2 | 2 |
| 4466795015 *Digital hand-drawn firecracker…* | **control** | `calm stitching` | 2 | 43 |
| 4415081378 *Diamond Wreath…* | **treatment** | `geometric wreath` | 2 | 20 |
| 4555463358 *Wooden Wick Candle…* | hygiene | `wooden wick candle` | 1 | 17 |
| 4555463082 *…Button…* | hygiene | `small gift for her` | 1 | 47 |
| 4555463292 *…Soy Candle…* | hygiene | `candles for her` | 2 | 24 |
| 4576478365 *Poinsettia…* | holiday | `flower hoop` | 1 | 24 |
| 4576496750 *Penguin Snow Globe…* | holiday | `snow globe` | 2 | 8 |
| 4576496750 *Penguin Snow Globe…* | holiday | `snow globes` | 2 | 19 |
| 4576478385 *Snowman Snow Globe…* | holiday | `snow globe` | 2 | 38 |
| 4576478385 *Snowman Snow Globe…* | holiday | `snow globes` | 2 | 39 |

## Distilled

**1. The shop ranks #1 on a term, and it produces no traffic. This is the finding.**

`4466076995` sits at **page 1, position 1** for `calm stitching` — the best organic placement the shop has ever been observed to hold. That listing has **9 views in 30 days**.

A #1 ranking that yields single-digit views means the term has essentially no search volume. The placement is real and hollow at the same time. This is the single most clarifying data point in the ecosystem so far, because it separates two things every other instrument conflated:

- **Position** — where you rank. Apparently fine, even excellent.
- **Demand** — how many people search that term at all. Apparently near zero.

The shop's problem is not that it ranks badly. **It ranks well for things nobody searches.**

This also closes the loop on [the eRank tag report's point 3](2026-09-15-erank.md): the niche/positioning tags read "< 20 searches" or "Unknown" there, and here we see what holding rank on one of them actually buys. Nothing.

**2. Three listings rank on `calm stitching` — and all three carry the *old* generic title.**

`4466076995` (protected), `4417250834` and `4466795015` (both control) all end "— PDF download for calm stitching". The treatment rewrite replaced that exact phrase with per-listing positioning phrases ("Calming Evening Craft", "slow stitching gift", etc.).

So the intervention **removed a phrase the shop demonstrably ranks on**, from six listings, without knowing it ranked. That was invisible on 2026-09-14: Search Analytics reports *visits*, and a #1 on a zero-volume term generates no visits to report.

Read this as a **caveat on the day-30 comparison, not as a reason to revert**. If treatment underperforms control, one candidate explanation is now on the record that was not available when the copy was approved — and it is a confound the verdict rule does not currently account for. Reverting mid-window would destroy the measurement; noting it costs nothing.

**3. The treatment mechanism works — fast.**

`4415081378` was retitled to lead with "Diamond Wreath" inside the 2026-09-14→15 window, and by 2026-09-17 it ranks for **`geometric wreath`** — a term it could not have ranked for under its old cloned title. Two days, new descriptor, new ranking.

Page 2 position 20 is deep, and `geometric wreath` is likely another low-volume term, so this is **mechanism confirmed, value unproven**. It is exactly what the experiment predicted would happen; whether it produces views is the day-30 question.

**4. Tagging empty listings produced real placements on commercial terms.**

Three of the five Grandma Hobbies listings appear, including `4555463358` at **page 1, position 17** for `wooden wick candle` — a genuine buying term, unlike the craft niche vocabulary. All five had **0 of 13 tag slots filled** before the hygiene pass.

Worth separating from the rest of this note: these are **physical products in a different market**, with search volume the pattern catalogue does not have. That is the point. The hygiene batch, which was never the experiment, may be the most commercially informative thing in this capture.

**5. The holiday titles Etsy wanted to rewrite are already ranking.**

`4576496750` sits at page 2 position 8 for `snow globe`; the poinsettia at page 1 position 24 for `flower hoop`. These are the exact titles Etsy's dashboard proposed shortening on 2026-09-17, [dismissed the same day](2026-09-17-etsy-title-suggestions.md).

Weak but real support for the dismissal: the current titles are earning placement on the terms they were drafted for. Weak because these are fresh listings and rankings move; real because it is first-party evidence pointing the opposite way from the platform's advice.

## Standing read — what this changes

**It does not change the experiment.** No mid-window edits; day 0 stays 2026-09-15, day 30 stays 2026-10-15.

**It does add a question the verdict rule cannot currently answer.** The rule scores treatment vs control on views, and calls "flat" if both stay at 0–2 views, with thumbnails as the next hypothesis. This capture suggests a different next hypothesis: if the shop already ranks at or near #1 on its chosen terms and still gets no traffic, **thumbnails are not the constraint either — term selection is.** You cannot photograph your way out of a term nobody searches.

At day 30, take this pull alongside the views comparison and ask explicitly:

- Where do treatment listings rank on their **new** descriptors, versus where control listings rank on `calm stitching`? Compare **rank and volume together** — a page-2 ranking on a searched term beats a #1 on a dead one.
- Did any term in this capture produce measurable visits in Search Analytics? If `calm stitching` at #1 produced none, that number is the shop's clearest read yet on what a positioning term is worth.
- Re-run this export. Twelve rows on day 2 is a baseline; the delta is the signal.

## Where this plugs into the map

Intelligence tier 3 (external tools) → evidence → experiment readout. Fifth archived pull, and the first measuring **position** rather than outcome or demand. Read it with [the eRank tag report](2026-09-15-erank.md) (demand) and [the ads dashboard](2026-09-16-etsy-ads-dashboard.md) (paid outcome) — position, demand and conversion are three different questions and the shop now has one instrument for each.
