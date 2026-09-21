---
source: etsy
surface: ads-listing-keywords
captured: 2026-09-21
tier: bookend
scope: listing
measures: [visibility, spend]
subjects: [patterns, holiday, grandma-hobbies]
half_life: 30d
answers: >-
  Which search terms Etsy matched each advertised listing's ad to over the last
  30 days, with views, clicks and spend per term — day 6 of the tag experiment.
  Second capture of this surface; the first is 2026-09-20.
---

# Data pull — Etsy Ads per-listing keywords, captured 2026-09-21

**Provenance:** the ten Shop Manager → Advertising → listing pages (`/your/shops/me/advertising/listings/<id>`) for the same ten listings as the 9/20 capture, opened one at a time in the authenticated Chrome session on 2026-09-21 17:34–17:38 UTC with a 6–8 second wait each, and read from the rendered page. Headline metrics from the page text; `keyword_rows` verbatim from each table row's `textContent`. **Etsy exposes no API for ads stats.** Raw file: `2026-09-21-etsy-ads-listing-keywords.json`, same shape as 9/20, read by `read_ads_keywords_json()`.

**Two windows on one page, as before:** headline views/clicks/spend/revenue are *this year*; the keyword table is *the last 30 days*. Never divide one into the other.

**One field is deliberately null.** The this-year `orders` count could not be read reliably from page text (the sidebar's *Orders* link matched first), so it is recorded as unread rather than guessed. `lifetime_ad_orders` comes from its own labelled line and is fine.

## What surface this is

The only place Etsy shows *which terms an ad fired for*. Etsy chooses the terms; the shop chooses the listings — the Big Join's band label says so. This is the shop's ad spend meeting Etsy's matching, not the shop's keyword intent.

## Distilled findings

**1. 15 keyword rows across 10 listings, 145 views, 4 clicks, 0 orders in the 30-day window** — one fewer row than 9/20 (the mandala dropped from 9 targeted keywords to 8). Same three terms carry every click: `embroidery patterns` (38 views, 1 click), `hand embroidery designs` (13, 1), `mandala embroidery design` (5, 2 — 40%).

**2. Listing 4465357735 (Beginner Botanical, control) is now readable:** 185 ad views this year, 1 click, one matched term `hand embroidery designs` (5 views). On 9/20 it rendered empty and was recorded as unverified; that gap is closed.

**3. Nothing in the 30-day window is a treatment title term yet.** The window still reaches back to Aug 22, so it is two-thirds pre-experiment. The treatment arm's only matched term is `slow stitch patterns` on the Geometric Wheel (7 views, 0 clicks), unchanged. The capture that will actually show what Etsy matches the new titles to is the 9/29 one, when the window is entirely post–day 0.

**4. `digital products` still draws views and no clicks:** 22 views, 0 clicks on Beginner floral (tag #3). The release doc's "toggle it off" item stands; it is not an experiment listing.

**5. Year-to-date ad revenue is $14.49 on $6.23 spend** across the ten listings (mandala $2.49 / $1.59; Geometric 4466080258 $12 / $0.85 with 2 lifetime ad orders, ROAS 14.12). The Sep 2 $6 order on 4466080258 is visible in its table as an "Orders that came from this ad" row and is kept verbatim.

## Standing read

Takes §G row 3 off the [Big Join read](../ETSY_BIG_JOIN_READ_2026-09-21.md) for day 6; row 3's real payoff is the 2026-09-29 and 2026-10-15 captures, when the window is post–day 0. Same ten pages, same pace, same file shape. The 9/20 → 9/21 pair also shows how little the 30-day table moves day to day: re-capturing more often than weekly buys nothing.

## Where this plugs into the map

Intelligence tier 1 (manual bookend) → evidence → the Big Join's Etsy Ads band and the release §1 ad-panel re-capture.
