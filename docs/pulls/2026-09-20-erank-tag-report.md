---
source: erank
surface: tag-report
captured: 2026-09-20
tier: external
scope: shop
measures: [demand, difficulty]
subjects: [all]
half_life: 90d
answers: >-
  eRank's estimate for every tag the shop uses — 404 tags, including the
  holiday nine and the treatment tag sets that the 2026-09-15 report predates.
  Second capture of this surface; the first is 2026-09-15.
---

# Data pull — eRank Tag Report, 404 tags, captured 2026-09-20

**Provenance:** Katy's own eRank export, `Tag_Report_WatermarkandHue_1789916698_383434393232_7a30e42adedc060d8a3e.csv`, generated 2026-09-20 (the eRank page reads *Last update 2026-09-20 at 11:01 EST*), found un-landed in `~/Downloads` on 2026-09-21 and landed here as `2026-09-20-erank-tag-report.csv` — dated by capture, per the convention. Read by `read_tag_report_csv()`; the ingest keeps the 9/15 readings under each tag's `history` with `superseded_by = 2026-09-20`.

**A DOM read of the same table was taken on 2026-09-21 and discarded.** It agreed with the export on every tag and every printed number, but the table renders `Unknown` competition as `0` (78 tags) and hides the *Google Searches* column. The export is the honest one: it says `Unknown` where eRank does not know, and it carries Google Searches for all 404 tags. Where the two disagree, the export wins, and that is why it is the file.

## What surface this is

eRank scoring the shop's *own* choices — every tag on every active listing at the time of the export. It answers "what does eRank think of what we chose?", not "what should we choose?" (that is the Keyword Tool). Its numbers are eRank's monthly estimates for the USA marketplace.

## Distilled findings

**1. 404 tags, up from 287 on 9/15.** The 117 new tags are the holiday nine (live 9/16) and the treatment rewrites (day 0 = 9/15, which the first report caught only partly). Every tag the Big Join showed as "unscored" on 2026-09-21 now has a row; "unscored" no longer means "not yet pulled".

**2. Of 404 tags, eRank prints a real search volume for 60; 138 are censored `< 20`; 206 are `Unknown`.** KD is scored for 195 tags and is 100 for 183 of them; the twelve below 100 are the same generic-gift set as before — `digital products` 35, `digital product` 70, `self care gift` 75, `custom snow globe` 76, `embroidery designs` 77, `nutcracker` 77, `snow globe` 81, `christmas village` 90, `personalized penguin` 90, `gardening shirt` 95, `photo ornament` 95, `stocking stuffer` 97.

**3. The holiday nine's tags are, on eRank's reading, mostly invisible.** Their scored tags are the generic ones — `christmas ornament` 9,166, `nutcracker` 2,890, `christmas wall art` 2,298, `christmas village` 1,224, `snow globe` 966, `christmas embroidery` 618, `retro christmas` 502, `snowman decor` 411, `poinsettia` 333, `christmas gift set` 330, `christmas bundle` 298 — and every motif-specific tag (`candy cane hoop art`, `nutcracker hoop art`, `snowy house globe`, `penguin hoop art`, `christmas tree globe`) reads `Unknown` with 0 competition. Same shape as the treatment arm: the specific phrases are the ones eRank cannot see.

**4. The treatment arm is confirmed near-zero on this instrument.** Leaf Fan: all 13 tags `Unknown`. Geometric Wheel: 12 `Unknown`, one `< 20`. Branch Wreath and Leaf and Berry: `< 20` or `Unknown` throughout. Diamond Wreath: `< 20`/`Unknown` throughout, `geometric wreath` itself `< 20` against 6,616 competition. Geometric Rosette is the exception, on `bedroom wall art` 1,953 and `boho wall decor` 1,583 — both KD 100.

**5. `calm stitching` still has no volume and 1,808 competition, and holds page 1 position 1** (see the [Spotted note](2026-09-21-erank-spotted-on-etsy.md)). eRank's demand instrument and eRank's rank monitor disagree about the same phrase.

## Standing read

Closes the [Big Join read](../ETSY_BIG_JOIN_READ_2026-09-21.md)'s biggest caveat (§E: "the Tag Report predates the holiday nine") and §G row 4. The read's §B holiday rows should be re-read as *scored and mostly `Unknown`* rather than *unscored*; the conclusion does not move, the evidence does. For the 10/15 readout: a treatment win is a win on tags this report calls `Unknown`; a treatment loss is this report being right.

## Where this plugs into the map

Intelligence tier 3 (external tools) → evidence → the Big Join's eRank band (`Reported by` gains `T` on 117 rows) and the release §1 readout.
