---
source: etsy
surface: ads-stats
captured: 2026-09-17
tier: bookend
scope: shop
measures: [spend, visibility, conversion]
subjects: [all]
half_life: rolling
answers: >-
  The ad programme day by day for the whole year to date — Jan 1 – Sep 17,
  2026 — views, clicks, orders, revenue, spend, ROAS and ending budget per
  date. The series the 9/18 and 9/20 exports extend by a day or three.
---

# Data pull — Etsy Ads daily stats, Jan 1 – Sep 17, 2026, captured 2026-09-17

**Provenance:** Katy's export from Shop Manager → Advertising → Stats, captured 2026-09-17, found un-landed in `~/Downloads` on 2026-09-21 and landed as `2026-09-17-etsy-ads-stats-2026-01-01-2026-09-17.csv` (260 daily rows). Not read by the ingest — no daily-ads reader exists — so this is for reading and for the ledger. Re-captures on [9/18](2026-09-18-etsy-ads-stats.md) and [9/20](2026-09-20-etsy-ads-stats.md) are the same series a few days longer.

## What surface this is

Campaign-level, per day. Together with the per-listing keyword tables it is the whole of what Etsy shows about ads: this file is the *when* and the totals; those are the *which terms*.

## Distilled findings

**1. Year to Sep 17: 5,263 views, 73 clicks, 3 orders, $14.49 revenue on $6.85 spend.** Views on 63 of 260 days — the campaign has been live roughly a quarter of the year. Click rate 1.4%; ROAS 2.1 across the year, entirely from three orders.

**2. All three orders are the three sales the listing stats report,** on the days they happened: Jul 24 ($2.49, the leaf mandala), Aug 15 ($6, Geometric 4466080258), Sep 2 ($6, Geometric hoop 4466076995). On this surface every sale the shop made this year is an ad-attributed sale, which says more about attribution than about ads: the [listing-stats capture](2026-09-21-etsy-listing-stats.md) puts only 7 of the mandala's 35 visits on Etsy Ads.

**3. The per-listing ROAS on the ads panel (14.12 on 4466080258) is two $6 orders against $0.85;** at campaign level the year is $14.49 against $6.85. Both are true; neither is a trend.

## Standing read

The daily series is what the 10/15 readout should use for "did ad spend change during the window" — the release doc's §1 ad-panel re-capture gives terms, this gives spend and views by day, and the day-0 date (9/15) is a row in it. A reader would be a small change if the readout wants it on the table; for now the CSV is the record.

## Where this plugs into the map

Intelligence tier 1 (manual bookend) → evidence → the [shop health ledger](../ETSY_SHOP_HEALTH_LEDGER.md) and the release §1 readout.
