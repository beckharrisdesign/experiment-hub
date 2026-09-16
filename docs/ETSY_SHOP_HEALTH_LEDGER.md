# W&H shop health ledger

*Observations, not targets. One row per monthly review, appended — never rewritten. No line here has a goal attached to it, and none should acquire one: the shop exists so making and stitching these patterns stays fun, relaxing, and IRL.*

**Why no targets.** At 2–3 sales a month, month-over-month deltas are noise. Watching the money honestly matters; steering by it at this volume would contradict the point. This file records what happened. The primary measure of the ecosystem is completeness, which lives in the [map](ETSY_ECOSYSTEM_MAP_2026-09.md)'s live-state table and in the first column below.

## Ledger

| Month | Completeness (mean Tier-B, active listings) | Engagement (favorites ÷ views) | Net revenue | MoM change | Provenance |
|---|---|---|---|---|---|
| 2026-09 | **50.5%** (27 active) | **7.04%** (24 ÷ 341) | **+$4.10** (thru 16th) | +$6.03 vs August (−$1.93) | Completeness + engagement: `etsy_listing_snapshots` latest per listing, captured 2026-09-16 (Supabase `ulqdjuiffpazzixnwwso`). Revenue: [statements pull](pulls/2026-09-16-etsy-statements.md) |

### September notes

First net-positive month in the shop's life (lifetime remains −$4.91). Completeness is held down by three systematic gaps rather than scattered misses:

| Tier-B criterion | Met | Note |
|---|---|---|
| 13 tags | 27/27 | |
| Tag length ≤20 | 27/27 | |
| Title 40–140 chars | 27/27 | |
| Description ≥160 chars | 27/27 | |
| Alt text on every image | **0/27** | No active listing has alt text — the single biggest completeness lever |
| Two styles | **0/27** | Styles are set on the holiday drafts but on no live listing |
| 20 photos | **0/27** | The 12-role galleries exist in Drive and Notion; they aren't on Etsy yet |
| Video | 1/27 | |

The three zeros are the same work: the holiday-batch upload path (galleries + alt at upload) and a styles pass over live listings. Closing all three would roughly double the number.

### First design-system audit — 2026-09-16

The chapters' first run, against the same snapshot. **Live listings (27 active)**, content principles:

| Principle | Result |
|---|---|
| 3 — no "digital" in title | **10 of 27 violate** |
| 4 — no standalone format tags | **6 of 27 violate** |
| 10 — two styles | **27 of 27 violate** |
| 6 — 13 tags used | 27/27 met |
| 7 — one skill level in title | 27/27 met |
| 9 — description ≥160 chars | 27/27 met |

The tag-positioning experiment's treatment copy fixes principles 3 and 4 on its listings when it runs; protected and control listings stay untouched until the experiment closes.

**Holiday batch (9 drafts, pre-activation)**, audited from `holiday_drafts_2026.json`: 8 of 9 pass every checkable principle; all nine carry 13 tags, two styles, one skill level, and descriptions well over the floor. **Zero tags are shared across the nine listings** (117 unique tags, no overlap) — principle 5 fully met, which is the redundancy lesson from the experiment applied before launch rather than after. The bundle was the one flag, and the audit was right to raise it: its title can't carry the singular formula, so principle 1 gained a documented bundle variant instead of the bundle being marked non-compliant.

## How a row gets added

Part of the monthly ecosystem review (see the map's review ritual). Per row:

1. **Completeness** — mean Tier-B percentage across active listings, computed from the latest snapshot per listing. Criteria and thresholds: `lib/etsy-scorecard.ts` (digital listings score 8 criteria; physical-only criteria are excluded from the denominator, not counted as failures).
2. **Engagement** — total favorites ÷ total views across active listings, from the same snapshot. This is the instrumentable stand-in for "click rate on listings": true impression→click rate exists only for the paid slice via manual ads panels, and organic impressions have no API. Views themselves belong to the tag experiment's own metric and stay owned there.
3. **Net revenue** — Katy's Shop Manager statement pull, distilled into a note under `docs/pulls/`. No API path (`transactions_r` isn't granted); the manual pull is the pipeline and that's fine.
4. **MoM change** — arithmetic difference from the previous row. Recorded, not judged.
5. **Provenance** — every figure names where it came from. A number without provenance doesn't go in the table.

**ROAS** joins the ledger only when attributed orders exist. Lifetime ads spend is $6.61 with zero attributed orders, so it isn't mature enough to record.
