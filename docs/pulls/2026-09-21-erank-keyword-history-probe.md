---
source: erank
surface: keyword-history
captured: 2026-09-21
tier: external
scope: market
measures: [demand]
subjects: [patterns, holiday]
half_life: 90d
answers: >-
  Whether eRank's per-keyword monthly search history can be taken at all, at
  what cost, and what three keywords' 15-month series look like. A method probe,
  not a data pull — three keywords, chart-read, not eRank-printed.
---

# Data pull — eRank keyword history, method probe, 2026-09-21

> **Superseded the same day** by the full pull: [`2026-09-21-erank-keyword-history.md`](2026-09-21-erank-keyword-history.md), 124 keywords, all seven runs, with the chart readings validated against eRank's printed averages. The `-probe.csv` was removed; the method notes below still hold.

**Provenance:** the Bulk Keyword Tool at `members.erank.com/bulk-keyword-tool`, run once with `digital products`, `embroidery designs`, `christmas embroidery` from the authenticated Chrome session on 2026-09-21 ~18:15 UTC. Its trend chart is an SVG; the three series were read from the path geometry against the axis labels and written to `2026-09-21-erank-keyword-history-probe.csv` (keyword, month, value, method). **These are chart readings, ±~300 at the chart's 0–60,000 scale, not numbers eRank printed.** The file says so on every row.

**Quota:** the probe cost 3 of the day's 100 searches on Katy's plan (the counter went 0 → 3; two Keyword Tool page loads earlier in the session had already shown as 1 and 5 and reset). One search per keyword, whichever tool. This note exists so nobody spends the quota by accident.

## What surface this is

The only place eRank shows a keyword's demand *over time* rather than as one monthly average — 15 months, Jun 2025 → Aug 2026 (the Bulk chart's axis runs May 25 → Jul 26; the Keyword Tool's Jun 25 → Aug 26). It is the instrument §G row 5 of the [Big Join read](../ETSY_BIG_JOIN_READ_2026-09-21.md) asked for: whether a `< 20` is permanent or seasonal, whether a 31k average is a plateau or a spike.

## What the probe found

**1. It can be taken, three ways, none of them free.**

| Route | Cost | Precision | Scale |
|---|---|---|---|
| Bulk Keyword Tool, up to 20 keywords a run, read the SVG | 1 search per keyword, 100/day | chart-read, ±~0.5% of axis max | 316 targeted tags = 16 runs, 4 days |
| Keyword Tool, one keyword | 1 search | chart only (canvas), would need tooltip hovers | worse |
| Spotted on Etsy monitor table | none | exact — eRank prints the series as text | only terms the monitor already tracks (7 today) |

The Bulk Tool's *Export* button was not pressed (a file download needs your say-so); if that export carries the monthly series as columns, it beats the SVG read on both precision and effort and is the thing to check first.

**2. The three series, chart-read (May 25 → Jul 26):**

- `digital products`: 33.8k, 37.8k, 42.9k, **9.8k**, 19.8k, 47.9k, 28.8k, 30.8k, **10.8k**, 30.8k, 30.8k, 41.9k, 36.8k, 35.8k, 50.9k. eRank's "31,237 average" hides a 5× swing and two troughs (Aug 25, Jan 26). It is not a plateau.
- `embroidery designs`: 8.7k, 5.5k, 4.7k, **15.7k**, 7.8k, 10.8k, 7.7k, 4.7k, 3.4k, 4.5k, 5.7k, 4.7k, 5.7k, 3.5k, 10.7k. Averages 7k; the Aug 25 spike is a third of the year's demand.
- `christmas embroidery`: 0.5k, 2.3k, 0.1k, 1.2k, **2.5k, 2.4k**, 1.2k, 0.1k, then 0–10 from Jan 26 through Jul 26. The "618 average" is a September–October term and nothing else; a holiday listing tagged with it in December is tagging a phrase nobody is typing.

**3. What this means for the read.** Every eRank number on the Big Join is one September reading of a series that moves by 3–5× within the year. The read's §C candidates and §B tag volumes should be taken as "September" rather than "demand". Whether that is worth 4 days of quota — or an export — is Katy's call; this probe is the evidence for the call, not the pull.

## Which tags to pull, and which not to

Computed 2026-09-21 from the 9/20 Tag Report and the Big Join's listing membership; paste-ready runs of 20 in `2026-09-21-erank-keyword-history-runs.txt`.

- **Skip the 206 tags eRank calls `Unknown`.** It has no series for them; a run returns a flat line and burns 20 searches. That is 59 of the treatment arm's 78 tags — their history question is answered already: eRank has never seen them.
- **Batch A — the 60 tags with a printed volume** (from `personalized gift` 41,355 down to `whimsical forest art` 22). These are the only numbers on the Big Join that a series can change; the three probed above swung 3–5× within the year.
- **Batch B — the 44 censored `< 20` tags on experiment listings**, treatment's 16 first (`botanical wreath`, `branch wreath`, `diamond pattern`, `geometric wreath`, `line art embroidery`, `mindful stitching`, …). The question is whether `< 20` is permanent or a September trough.
- **Batch C — the 12 captured phrases and 8 candidates** (`stick and stitch`, `advent calendar`, `ultrasound ornament`, `needle minder`, `calm stitching`, `christmas embroidery designs`, `gingerbread ornament`, `punch needle kit`). The test of §E's caveat.

124 keywords, 7 runs, 1¼ days of quota. Five of them (`calm stitching`, `geometric wreath`, `wooden wick candle`, `small gift for her`, `candles for her`) already have a free series in the [Spotted monitor file](2026-09-21-erank-spotted-on-etsy-monitor.json).

## Standing read

§G row 5 stays open, with its cost now known. Do not run the Bulk Tool over the 316 tags from an agent session; if it is done, do it in batches of 20 by hand or with explicit approval, land each run as `YYYY-MM-DD-erank-keyword-history-<batch>.csv`, and add the reader described in §G. Row 6 (Keyword Tool seeds for the candidates) is parked with it.

## Where this plugs into the map

Intelligence tier 3 (external tools) → evidence → a future `history[]` on the Big Join's eRank sub-object. Nothing consumes it yet.
