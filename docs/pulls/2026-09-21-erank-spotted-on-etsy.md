---
source: erank
surface: spotted-on-etsy
captured: 2026-09-21
tier: external
scope: listing
measures: [rank]
subjects: [patterns, grandma-hobbies]
half_life: 7d
answers: >-
  Where W&H listings appeared in Etsy search on 2026-09-20, per eRank's
  monitor — page and position per term — with the previous check's rank and a
  15-month search-trend series eRank prints inline. Second capture; the first
  is the 2026-09-17 export.
---

# Data pull — eRank Spotted on Etsy, checks of 2026-09-20, read 2026-09-21

**Provenance:** the Spotted on Etsy monitor table at `members.erank.com/spotted-on-etsy`, filter *Yesterday*, read from the authenticated Chrome session on 2026-09-21 ~18:05 UTC. Seven rows, all "Spotted By: eRank Monitor", checks timestamped 2026-09-20 16:51–20:05 EST. Two files:

| File | Holds | Read by ingest |
|---|---|---|
| `2026-09-21-erank-spotted-on-etsy.csv` | the same five columns as the 9/17 export (listing, term, page, position, spotted by) | yes — `read_spotted_on_etsy_csv()`; joins into the Big Join's Ranked band |
| `2026-09-21-erank-spotted-on-etsy-monitor.json` | the two columns the export drops: the previous check's rank (`19 Sep 2026 #n`) and the *Search Trend* series eRank renders as text, parsed to `(month, value)` and kept raw | no — companion |

The table is the monitor, not an export, so `Page` is `P1`/`P2` in the UI and stored as `1`/`2` to match the export shape. The 9/17 export listed 12 rows; the monitor shows what was spotted *yesterday*, which is why five of them are absent here — `snow globe` and `snow globes` on the Snowman and Penguin globes, and `flower hoop` on the Poinsettia. Not spotted on 9/20; not "lost".

## What surface this is

The one instrument that measures the shop's *outcome in search* rather than an estimate or a choice: on a given day, for a given term, did a W&H listing appear, and where. It disagrees with eRank's own demand instruments (a term with no measurable volume can rank #1), which is exactly why both are kept.

## Distilled findings

**1. `calm stitching` held page 1 position 1 on 2026-09-20** on the geometric hoop listing (4466076995, protected — its title still carries the phrase), and still at **page 2 position 2** on hand drawn leaves (4417250834, control) and **page 2 position 43** on the firecracker (4466795015, control) — all three unchanged from the 9/17 export, all three "for calm stitching" titles. The monitor's *Rank* column for the 19 Sep check reads `#1`, `#50`, `#91`; it is not the same number as position and is kept in the companion file without interpretation.

**2. The other four placements moved by noise-sized amounts since 9/17:** `wooden wick candle` page 1 #17 → #20; `small gift for her` page 2 #8 → #13 (the 9/17 export's two files disagreed with each other at page 1 #47 and page 2 #8); `geometric wreath` page 2 #20/#21 → #21; `candles for her` page 2 #24 → #25. Recorded because the readout compares against this file.

**3. The inline trend series is eRank keyword history, for these terms.** Each row carries fifteen monthly values, Jun 2025 → Aug 2026, as plain text. For these seven terms it is almost all `0` with occasional `10`s — consistent with the Tag Report calling them `Unknown` / `< 20`. It is the same series the Keyword Tool draws as a chart (see the [history probe](2026-09-21-erank-keyword-history-probe.md)); here it costs no quota, but only for terms the monitor already tracks.

## Standing read

Takes §G row 7 off the [Big Join read](../ETSY_BIG_JOIN_READ_2026-09-21.md) for day 6, and answers the release doc's confound question so far: dropping `calm stitching` from six treatment titles has not (yet) cost the phrase its #1, because the #1 is on a protected listing. Re-read the monitor on 9/29 and 10/15; if the treatment arm ever appears here for its new title terms, that is the earliest signal the readout will get.

## Where this plugs into the map

Intelligence tier 3 (external tools) → evidence → the Big Join's Ranked band and the release §1 Spotted re-run.
