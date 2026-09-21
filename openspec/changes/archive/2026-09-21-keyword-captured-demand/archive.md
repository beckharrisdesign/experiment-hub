# Archive — keyword-captured-demand

**Archived:** 2026-09-21 · **Created:** 2026-09-20 · **Tasks:** 42/42
**Outcome:** SHIPPED

The Big Join: real Etsy search terms (with the visits they drove and the
listing they reached) and the keywords Etsy matched ads to, joined onto the
keyword row exactly as captured — never normalised, never divided across
listings, never summed with each other. Filters became additive, sort gained
tie-break keys, and the whole visible table exports to CSV. Merged in #508;
reads the archive landed in #507.

**Evidence:** `read_listing_stats_json()` and `read_ads_keywords_json()` in
`scripts/ingest-pulls.py`; `shop_search` and `ads` sub-objects on the corpus
row (`lib/keyword-corpus.ts` `toShopSearch`/`toAds`); `exportCsv`, compound
`filters` and `sorts` in `components/KeywordTable.tsx`; the misspelled
`paper embriodery template` row on the live page. Round 02.11 on MVDS closed
the Figma gate (task 4.4, satisfied via the restructure round).

**Left open:** a re-pull cadence was deliberately out of scope and is now
tabled — Katy, 2026-09-21: the pull is manual; not time-sensitive on the
eRank side, more so on the Etsy side. Two later reversals are recorded in the
promoted specs, not here: the keyword-freeze toggle is gone (always sticky)
and the Ads band was renamed to attribute the match to Etsy.
