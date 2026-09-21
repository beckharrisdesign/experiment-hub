---
source: etsy
surface: listing-stats
captured: 2026-09-21
tier: bookend
scope: listing
measures: [visibility, conversion]
subjects: [all]
half_life: rolling
answers: >-
  What each listing earned this year and, separately, in the first week of the
  tag experiment — visits, sales, revenue, traffic source, and the search terms
  buyers typed. The second capture of this surface; the first is 2026-09-20.
---

# Data pull — Etsy listing stats, this year + since day 0, captured 2026-09-21

**Provenance:** two passes over Etsy Shop Manager's per-listing stats pages, all 36 active listings each, taken from the authenticated Chrome session on 2026-09-21 ~17:25 UTC. Unlike the 9/20 capture, which read the rendered table, this one fetched each page and parsed the JSON Etsy embeds in the HTML (the `Search terms`, `Traffic sources`, and `Visits` / `Items Sold` / `Revenue` chart blocks). Same page, same numbers, no rendering — and no dependence on a tab being in the foreground. **Etsy exposes no API for shop stats**; this surface only exists signed in.

| File | Window | What it holds | Read by ingest |
|---|---|---|---|
| `2026-09-21-etsy-listing-stats-search-terms.json` | `this_year` (Jan 1 – Sep 21) | visits, items sold, revenue, six traffic sources, and structured search terms for all 36 listings | yes — `read_listing_stats_json()` now accepts a `search_terms` list beside the 9/20 file's verbatim `term_rows` |
| `2026-09-21-etsy-listing-stats-this-year.csv` | `this_year` | one row per listing: visits, sold, revenue, title | no (inventory) |
| `2026-09-21-etsy-listing-stats-search-terms-since-day0.json` | custom `2026-09-15 → 2026-09-21` | the same fields for the experiment's first seven days, plus a per-day series for visits, items sold and revenue | **no, on purpose** — the `-since-day0` variant keeps it out of `LISTING_STATS_RE`, so it cannot be mistaken for a second this-year capture |

**Pacing.** The two passes ran 36 sequential requests each at roughly half a second apart — faster than a person browsing. Nothing was throttled or challenged, but it is faster than this surface should be hit; the later ads pass (see [ads note](2026-09-21-etsy-ads-listing-keywords.md)) was paced at 6–8 s per page and that is the pace to keep. Neither pass was repeated.

## What surface this is

Captured demand, listing-grained: what actually happened, not what eRank estimates. The `since-day0` file is the first per-day view of the [tag positioning experiment](../../experiments/etsy-notion-sync/docs/tag-positioning-experiment.md) from the shop's own stats rather than from `etsy_listing_snapshots` view counters.

## Distilled findings

**1. This year: 152 visits shop-wide, 3 sales, $14.49** — one more visit than the 9/20 capture, same sales. 12 search terms across 7 listings (11 on 9/20 across 6): the new one is `snowman pattern` on the Snowman snow globe, arrived via Google, the holiday batch's first captured term.

**2. Since day 0 (Sep 15–21): 8 visits across the whole shop, 3 search terms, 0 sales.** Treatment arm: 1 visit (Geometric Rosette, `geometric hand embroidery patterns`, from Google, Sep 16). Control arm: 1 visit (Beginner Botanical, from Etsy app/other pages, Sep 17). Protected: 2 (mandala via Etsy search on Sep 17, `embroidered kippah women`; geometric hoop via app/other on Sep 15). Fall Leaves 2, both Etsy Ads. Beginner floral 1, social. Snowman globe 1, Etsy Ads, Sep 20. Everything else zero. At day 6 the arms are indistinguishable at this grain, which is expected — the readout is day 14 and day 30 view deltas from the snapshots, not this file.

**3. Traffic source, this year, is mostly not search.** Mandala: 12 app/other pages, 8 direct, 7 Etsy Ads, 4 marketing/SEO, 2 social, **2 Etsy search**. Across the shop, `Etsy search` is 2 of 152 visits. The search terms table is therefore a very thin slice of how buyers arrive; the Big Join's Shop band measures the smallest channel.

**4. The 13 zero-visit listings the 9/20 capture skipped are now measured, not assumed.** All 13 still read zero visits this year (9 holiday listings live since 9/16, 4 Grandma Hobbies), and their `search_terms` lists are empty because the page had none, not because the page was skipped.

## Standing read

Does not change the [Big Join read](../ETSY_BIG_JOIN_READ_2026-09-21.md); it takes §G row 1 off the list and gives the 10/15 readout a day-0-anchored baseline that the snapshot counters cannot (they are lifetime totals). Re-capture the `since-day0` window on 2026-09-29 and 2026-10-15 with `end_date` moved — the URL takes it, the ingest ignores the variant, and the day-0 file stays as the first point.

**Confound to carry forward:** `Etsy Ads` is a traffic source here (Fall Leaves, Snowman globe) and a keyword band on the Big Join; both are real but they are different counts (visits here, ad impressions there).

## Where this plugs into the map

Intelligence tier 1 (manual bookend) → evidence. Cite this note in the day-14 sanity check and the release §1 readout; the raw JSON is for the ingest, not for reading.
