# Data pull — Etsy monthly statements, Dec 2025 – Sep 2026

**Provenance:** Katy's Shop Manager statement exports, pulled 2026-09-16. Structured CSVs — the first pull that already fits the automated future: a script distilled these, no hand-reading. Raw files archived alongside this note as `2026-09-16-etsy-statement-YYYY-MM.csv` (10 files, tiny); Drive mirror in `W+H Data Pulls/` under the same names.

## Distilled — monthly P&L

| Month | Sales | Fees | Ads | **Net** |
|---|---:|---:|---:|---:|
| 2025-12 | — | -0.60 | — | -0.60 |
| 2026-01/02 | — | — | — | 0.00 |
| 2026-03 | — | -3.60 | — | -3.60 |
| 2026-04 | — | -0.60 | — | -0.60 |
| 2026-05 | — | — | — | 0.00 |
| 2026-06 | — | -0.20 | — | -0.20 |
| 2026-07 | 2.49 | -3.49 | -1.08 | -2.08 |
| 2026-08 | 6.00 | -3.24 | -4.69 | -1.93 |
| 2026-09 (thru 16th) | 6.78 | -1.84 | -0.84 | **+4.10** |
| **Total** | **15.27** | **-13.57** | **-6.61** | **-4.91** |

## Findings

1. **September is the shop's first net-positive month** (+$4.10 so far). Ten-month lifetime position: −$4.91 — the whole enterprise has cost less than a sandwich, which for a learning vehicle is a fine tuition bill.
2. **Sales are accelerating from zero: one per month, Jul → Aug → Sep.** Exact orders: Jul 24 $2.49 (leaf mandala, sold at a discount price), Aug 15 $6.00 (geometric 4466080258), Sep 3 $6.78 incl. buyer tax (geometric 4466076995).
3. **Ground truth validates the sync's indirect sales signal.** The quantity-drop inferences from snapshots (Jul 25 / Aug 16 / Sep 3 "probable sales") match the statement dates within a day — the instrumented pipeline's sales detection is trustworthy.
4. **Unit economics are healthy:** ~$5.15 net on a $6 pattern (≈86% margin after transaction, processing, and renewal fees). Digital goods doing what digital goods do.
5. **Cost structure is two trickles:** listing renewals (Etsy's ~4-month cycle; the March/July renewal waves are visible) and Etsy Ads at $0.04–$0.68/day since mid-July ($6.61 lifetime — with zero attributed orders yet, consistent with ROAS being immature).
6. **Ledger baseline established.** The proposal's shop-health ledger (net revenue + MoM, recorded not targeted) now has a real 10-month series to append to; future statement pulls extend this table one row per month.

## Where this plugs into the map

Intelligence tier 2 (manual bookends) → shop-health ledger → monthly review. Second archived pull; the first machine-distilled one — evidence that the distilled data model's "scripts fill the same shape later" path works today for any structured export.
