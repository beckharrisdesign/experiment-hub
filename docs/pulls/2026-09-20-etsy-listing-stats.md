---
source: etsy
surface: listing-stats
captured: 2026-09-20
tier: bookend
scope: listing
measures: [visibility, conversion]
subjects: [all]
half_life: rolling
answers: >-
  What each listing actually earned this year — visits, sales, revenue — and
  the search terms buyers really typed to reach it. The first source in this
  archive measuring captured demand rather than estimated market demand.
---

# Data pull — Etsy listing stats, Jan–Sep 2026

**Provenance:** scraped 2026-09-20 from Etsy Shop Manager's per-listing stats pages, one page per listing, via an authenticated browser session. **Etsy exposes no API for shop stats** — this surface is only reachable signed in, which is why it has never been in this archive before. The stats-page URLs live on the `Listing Stats` property of the Notion Listing Inventory DB (37 of 48 rows populated).

The date window is a URL parameter, not a UI control:

```
/your/shops/me/stats/listings/<id>?channel=etsy-retail&start_date=&end_date=&date_range=this_year
```

`date_range=custom` with `start_date` / `end_date` works and returns genuinely different numbers (verified: `this_year` 35 visits vs a 90-day window 29 visits on listing 4415035303, with a different traffic-source mix). Re-running this pull on a cadence is therefore how history accumulates — Etsy's own pages are rolling windows that keep no history, so an un-captured period is unrecoverable.

## Files

| File | What it holds |
| --- | --- |
| `2026-09-20-etsy-listing-stats-this-year.csv` | visits + title for all 37 listings with a stats link |
| `2026-09-20-etsy-listing-stats-search-terms.json` | raw search-term rows, sales and revenue for the 23 re-scraped listings |

## What it says

**151 visits shop-wide, Jan–Sep 2026.** 22 listings have any traffic; 14 read zero (all listed 2026-09-16, so zero is expected rather than alarming); 1 stats page renders empty and is recorded as unreadable rather than as a zero.

**3 sales, $14.49 total** — $2.49 (leaf mandala) and $6.00 × 2 (both geometric patterns).

**11 search terms across 6 listings.** The top 5 listings carry 64% of all traffic, and geometric designs hold 3 of the top 4.

## Read this before parsing

**The table schema is not stable between listings.** Most render 2 columns (`Search terms | Visits`); listing 4415035303 renders 4 (`Search terms | Etsy | Google, etc. | Total visits`). A parser assuming one shape silently matches nothing on the other — that exact bug cost 7 of the 11 terms on the first attempt and produced a confident, wrong "only 4 search terms exist" claim.

**Every row is stored verbatim.** Etsy renders each row twice — the visible cells, then an accessibility duplicate reading `<term>: <n>` — so the term text repeats within a row. That duplication is preserved rather than stripped, along with the header row.

**Nothing is corrected.** `paper embriodery template` is a buyer's misspelling on a listing that sold. Spell-correcting it would erase a real, low-competition term; normalising it into `paper embroidery template` would merge two things Etsy counts separately. Katy, 2026-09-20: *"its going to be messy - don't make assumptions or edits to the things you find."*

**13 zero-visit listings were not re-scraped** for search terms and are recorded as unverified, not as known-empty.
