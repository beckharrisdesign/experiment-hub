---
source: erank
surface: keyword-history
captured: 2026-09-21
tier: external
scope: market
measures: [demand]
subjects: [all]
half_life: 90d
answers: >-
  Fifteen months of eRank monthly search volume, May 2025 – Jul 2026, for the
  124 keywords the Big Join read asked history for — every tag with a printed
  volume, the censored tags on experiment listings, the captured phrases and
  the candidates. The first time an eRank number on the Big Join has a shape.
---

# Data pull — eRank keyword history, 124 keywords, captured 2026-09-21

**Provenance:** Katy ran the seven batches in the Bulk Keyword Tool (see the [bulk-keywords note](2026-09-21-erank-bulk-keywords.md)); their exports carry averages only. The monthly series exists only in the trend chart the tool draws per run, so the same 124 keywords were re-run from a Chrome session on 2026-09-21 18:32–18:38 UTC, regrouped by size so each chart's axis fits its lines (axis maxima 200k, 20k, 4k, 1.5k, 200, 1.5k, 1.2k), and each chart was read from its SVG path geometry against the axis labels. Re-running keywords already looked up that day cost one search per run, not per keyword: the counter went 11 → 16 for seven runs. File: `2026-09-21-erank-keyword-history.csv` — one row per keyword per month, with the chart's axis maximum and the run on every row.

**How exact the readings are.** eRank's printed "Avg Searches" is the mean of the last twelve months of this series (Aug 2025 – Jul 2026). Recomputing that mean from the chart readings reproduces eRank's printed average to the unit for all 66 volume keywords (`personalized gift` 41,355, `digital products` 31,237, `christmas ornament` 9,166 … `whimsical forest art` 22). The readings are chart-derived, but they are not approximate in any way that matters.

**Not read by the ingest yet.** No reader exists for a monthly series; the read's §G describes the change (a `history[]` on the eRank sub-object). Until then this file is for reading and for the readout, not for the table.

## What surface this is

The time dimension of eRank's demand estimate. Every other eRank number on the Big Join is one September reading; this says what that reading is a sample of.

## Distilled findings

**1. Almost nothing the shop tags is steady demand.** Of the 66 keywords with a printed volume, 8 hold a shape a stitcher would recognise as year-round: `digital products` (peak/mean 1.6), `digital product` (1.7), `punch needle kit` (1.4), `embroidery designs` (2.2), `embroidery pattern` (2.7), `bedroom wall art` (3.1), `needle minder` (3.6), `stick and stitch` (3.6). The other 58 are one spike and a floor: peak-to-mean ratios of 4 to 12, and for anything under ~500 average, ten or more of the fifteen months read `≤ 20`. eRank's average is the spike divided by twelve.

**2. The spike is August–November 2025, and it is the same spike for almost everything.** 44 of the 58 spiking keywords peak in Aug, Sep, Oct or Nov 2025 — gift terms in August (`housewarming gift` 52.7k, `best friend gift` 21.8k, `personalized home` 67.7k), holiday terms in October–November (`christmas ornament` 42.9k Oct, `advent calendar` 40.8k Oct, `stocking stuffer` 48.9k Nov, `nutcracker` 12.8k Nov, `snow globe` 5.7k Nov, `ultrasound ornament` 2.7k Nov). `personalized gift` is the exception: 170k in May 2025, Mother's Day, then a quarter of that.

**3. The holiday nine are tagged for a window that opens in October and closes by January.** `christmas embroidery` peaked in Sep–Oct 2025 (2,480 / 2,410) and reads ≤ 10 every month from January to July 2026; `christmas embroidery designs` peaked at 9,080 in Aug 2025 and is ≤ 20 for nine months. `christmas village`, `christmas wall art`, `gingerbread ornament`, `poinsettia`, `candy cane`, `nutcracker gift` have the same shape. On this instrument the holiday batch went live (Sep 16) three to four weeks before its demand peaks and has roughly ten weeks of window.

**4. The censored and long-tail keywords are flat, not seasonal.** 52 of the 57 `< 20` / `Unknown` keywords read ≤ 20 in every one of the fifteen months. The five that blip once: `pdf pattern` (1,210 in Jun 2025), `vintage floral` (1,110 May 2025), `beginner embroidery` (160 Oct 2025), `star embroidery` (110 Jun 2025), `bohemian pattern` (60 Mar 2026). Every treatment-arm tag in the set, all twelve captured phrases and `calm stitching` are flat at zero. `< 20` is permanent, not a September trough — the question §G row 5 asked is answered.

**5. Two candidates are steadier than their averages suggest; one is a pure spike.** `stick and stitch` reads 1.1k–4.2k in eleven of fifteen months; `needle minder` 1.0k–3.2k in thirteen. `advent calendar` is 40.8k in October, 27.3k in August, and 60–2,500 the rest of the year — a product for a six-week window. `ultrasound ornament` is a November term (2,710) with a March echo (420).

## Standing read

Changes what kind of number the Observed bucket holds. For the [Big Join read](../ETSY_BIG_JOIN_READ_2026-09-21.md): §C's candidates should be read with their windows (`advent calendar` and `ultrasound ornament` are Q4; `stick and stitch` and `needle minder` are year-round); §B's generic-tag volumes are mostly August–November spikes; and §E's biggest caveat is now a measurement. For the 10/15 readout: the treatment arm's tags are flat on eRank across fifteen months, so a treatment win is a win eRank could never have predicted at any time of year. Re-take this pull no more than quarterly — the shapes will not change, only the last month.

**Next code change, when wanted:** a reader for this file and a `history[]` on the Big Join's eRank sub-object, with a peak-month or spark column on the table. Small; it is the change §G named.

## Where this plugs into the map

Intelligence tier 3 (external tools) → evidence → the Big Join's eRank band (once the reader exists) and the release §1 readout now.
