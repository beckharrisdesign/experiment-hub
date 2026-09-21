---
source: erank
surface: bulk-keywords
captured: 2026-09-21
tier: external
scope: market
measures: [demand, difficulty]
subjects: [patterns, holiday, grandma-hobbies]
half_life: 90d
answers: >-
  eRank's current estimate for the 124 keywords the Big Join read asked history
  for — every tag with a printed volume, the censored tags on experiment
  listings, the 12 captured phrases and 8 candidates. Seven Bulk Keyword Tool
  exports, run by Katy in one sitting.
---

# Data pull — eRank Bulk Keywords, 7 runs, 124 keywords, captured 2026-09-21

**Provenance:** Katy ran the seven paste-ready batches from [`2026-09-21-erank-keyword-history-runs.txt`](2026-09-21-erank-keyword-history-runs.txt) through eRank's Bulk Keyword Tool on 2026-09-21 13:23–13:27 local and exported each (`eRank - Bulk Keywords (12)…(18).csv` in `~/Downloads`). Landed by `scripts/ingest-pulls.py` from a folder holding only those seven, as `2026-09-21-erank-bulk-keywords-12.csv` … `-18.csv`; read by `read_bulk_keywords_csv()`, the same reader as the 9/18 batch. The 9/21 readings supersede the 9/18 ones for the keywords both cover and keep them under `history`.

**What the export does not carry:** the monthly series. The Bulk tool draws a 15-month trend chart per run, but its CSV has the same six columns as always (searches, clicks, CTR, competition, KD). The series were taken separately by re-running the same batches in a Chrome session and reading each chart — see the [history note](2026-09-21-erank-keyword-history.md). Re-runs of keywords already looked up today cost one search per run, not per keyword: the counter moved 11 → 15 across four re-runs.

## What surface this is

Same instrument as the 9/18 bulk pulls: eRank's marketwide estimate for a keyword you hand it, rather than one it surfaced. Here it is pointed at the shop's own vocabulary and the read's long tail, so it answers "does eRank see this at all?" for phrases the Tag Report and Keyword Tool never scored.

## Distilled findings

**1. eRank does not see the long tail buyers typed.** Of the 12 captured phrases, 7 come back `Unknown` on every column — no volume, no competition, nothing (`geometric hand embroidery patterns`, `embroidered kippah women`, `hand embroidery pdf geometric`, `modern minimalist embroidery pattern`, `paper embriodery template`, `botanical embroidery design hand embroidery`, `medieval embroidery patterns`). Four are `< 20` (`mandala embroidery pattern`, `snowman pattern`, `hand embroidery pattern pdf`, plus `botanical embroidery design hand embroidery`'s competition-less `< 20`). `mandala embroidery design` and `mandala embroidery pattern download` have competition (2,059 / 2,363) and unknown volume. Three of those seven `Unknown` phrases sold something this year. §E of the read is confirmed on the instrument's own terms.

**2. `calm stitching` is `Unknown` volume, 1,808 competition, no KD** — the same reading as the Tag Report, on the phrase that holds page 1 position 1.

**3. The candidates hold up:** `advent calendar` 8,347 / 33,071 / KD 30; `needle minder` 3,246 / 29,016 / 48; `gingerbread ornament` 2,168 / 43,397 / 65; `christmas embroidery designs` 1,541 / 41,020 / 71; `punch needle kit` 1,262 / 8,595 / 42; `stick and stitch` 1,166 / 9,591 / 46; `ultrasound ornament` 505 / 2,075 / 31. Identical to the Keyword Tool readings, which is expected — same estimate, different door.

**4. All 44 censored tags are still `< 20` when asked directly**, and 38 of them have `Unknown` clicks and CTR. The Bulk tool adds nothing the Tag Report did not say for these; only their series can.

## Standing read

Closes §G row 6 for the candidates and the captured phrases (they are now on the Big Join with eRank readings, or with an honest `Unknown`). The long-tail caveat in the read's §E is no longer a caveat; it is a measured property of eRank. Nothing here changes a decision on its own; the series in the history note are what change the *kind* of number the Observed bucket holds.

## Where this plugs into the map

Intelligence tier 3 (external tools) → evidence → the Big Join's eRank band (Bulk sub-object, `Reported by` gains `B` on 124 rows).
