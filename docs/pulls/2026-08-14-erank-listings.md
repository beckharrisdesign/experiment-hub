---
source: erank
surface: listings
captured: 2026-08-14
tier: external
scope: listing
measures: [visibility, demand]
subjects: [patterns, grandma-hobbies]
half_life: 30d
answers: >-
  eRank's per-listing grade, visibility score, total views and "superstar
  keyword" for 27 listings on 2026-08-14 — the shop as eRank scored it a
  month before the tag experiment.
---

# Data pull — eRank Listings, 27 listings, captured 2026-08-14

**Provenance:** Katy's export from eRank → Listing Optimization → Listings, captured 2026-08-14, found un-landed in `~/Downloads` on 2026-09-21 and landed as `2026-08-14-erank-listings.csv`. Not read by the ingest; no reader for this surface. Columns: listing, tracking, grade, visibility score, total revenue, total views, superstar keyword, tags.

## What surface this is

eRank's listing-level verdict: a letter grade and a visibility percentage, with the one tag it thinks carries the listing. The grade is eRank's, the views are Etsy's lifetime counters as eRank read them.

## Distilled findings

**1. 21 of 27 graded A, 5 graded E, 1 B — and the five E's are the Grandma Hobbies line,** which had zero tags on Aug 14 (the [improvement plan](../ETSY_LISTING_IMPROVEMENT_PLAN_2026-09.md)'s P1). The grade tracks tag count, not anything buyers see.

**2. Visibility 29% for the leaf mandala and one geometric listing, 9% for everything else.** 204 lifetime views across the catalogue on Aug 14; the [9/21 snapshot](2026-09-21-etsy-listing-stats.md) has the mandala alone at 87.

**3. The "superstar keyword" column is eRank guessing the listing's best tag** — `embroidery pattern` for the mandala, `geometric wheel pattern`, `fall leaves pattern`, `beginner floral embroidery`. Most of those are tags the shop no longer uses after the 9/15 rewrite, which is the only reason to keep the column: it is what eRank thought the shop was betting on before the experiment.

## Where this plugs into the map

Intelligence tier 3 (external tools) → evidence → the ledger (August baseline) and the 10/15 readout, as the pre-experiment picture of which tags eRank credited.
