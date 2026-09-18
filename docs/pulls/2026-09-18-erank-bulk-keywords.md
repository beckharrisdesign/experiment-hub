---
source: erank
surface: bulk-keywords
captured: 2026-09-18
tier: external
scope: market
measures: [demand]
subjects: [embroidery, embroidery-patterns]
half_life: 90d
answers: >-
  Related-term demand across 99 embroidery-pattern-adjacent terms, from six
  eRank Bulk Keywords exports. Now part of the queryable corpus and its own
  table on /keyword-explorer, alongside (not merged into) the Keyword Tool
  rows.
---
# Data pull — eRank Bulk Keywords, 6 exports, captured 2026-09-18

**Provenance:** six eRank **Bulk Keywords** exports, landed alongside the same day's [Keyword Tool batch](2026-09-18-erank-keywords.md) as `docs/pulls/2026-09-18-erank-bulk-keywords.csv` and `…-2.csv` through `…-6.csv`. All six share one filename after `slug()` (`"Bulk Keywords"`, `"Bulk Keywords 5"`, etc. all collapse to the same stem — `slug()` strips exactly one trailing number, and the tool's own `_1`.._5` suffixes are re-download markers, not distinct names), so the numbers in the landed filenames are `ingest-pulls.py`'s own collision-avoidance order, not the export tool's `_N` suffixes — read the content, not the filename, to tell them apart.

**What surface this is:** related-term suggestions for a seed list, not a single-seed demand table like the Keyword Tool. The 99 deduplicated terms are overwhelmingly on-topic for hand embroidery: floral, botanical, geometric and mandala pattern variants; beginner/easy/simple framing; wall art and hoop art framing; gift and mindfulness framing. **This is close to exactly [the 2026-09-17 note's Batch A](2026-09-17-erank-keywords.md#4-the-next-export--batches-to-seed-in-priority-order)** — "does the category have demand" — arriving as related-term suggestions rather than the seeded pulls Batch A asked for, but covering much of the same ground (`hand embroidery pattern`, `modern embroidery pattern`, `beginner embroidery pattern`, `embroidery hoop art` all appear as terms here).

**Now in `data/keyword-corpus.json`, as its own section.** `ingest-pulls.py` gained `read_bulk_keywords_csv()` and `build_bulk_corpus()` — a second reader alongside `read_keyword_csv()`, since the schema (`Avg Searches`/`Avg Clicks`/`Avg CTR`/`Etsy Competition`/`Keyword Difficulty`) and value shapes genuinely differ and don't belong forced into the same row type. The corpus's `bulk_keywords.rows` array sits beside the existing `rows` array rather than merged into it — deduplicated across the six same-day exports by keyword text, with the same current/superseded-by-keyword logic as the Keyword Tool corpus, but no `found_via`/`coverage` (Bulk Keywords doesn't carry a per-seed query the way Keyword Tool does). `/keyword-explorer` renders it as a second, separate table below the main one via the new `BulkKeywordTable` component.

**The censored-value handling is the load-bearing decision here.** Unlike the Keyword Tool export, Bulk Keywords frequently reports `"< 20"` rather than a bare number or a blank — a real, small, nonzero value eRank capped instead of scoring exactly. That is a third state, distinct from both a real number and `"Unknown"` (not scored at all), and collapsing either into 0 would repeat exactly the fabricated-zero mistake `read_keyword_csv()`'s own comment warns against. Every censored field carries its own `*_censored` boolean (`avg_searches_censored`, `avg_clicks_censored`, `avg_ctr_censored`); the table renders it as `< N`, an unscored field as `—`, never as `0`.

## Distilled findings

1. **Only 6 of 99 terms carry a real (non-censored) search number, and every one of them reads `KD 100`** except `botanical mandala` (KD 87) — the highest-volume term, `embroidery kits` at 2,918 searches, is exactly as saturated by this measure as the lowest, `embroidery template` at 93. Consistent with [the same-day Keyword Tool note's §3 finding](2026-09-18-erank-keywords.md): low-difficulty rows keep turning out to be trademarks elsewhere in this archive, and here the opposite failure mode shows up instead — every scored row in the shop's own actual category reads maximally difficult. Neither export shows an easy opening in embroidery patterns.
2. **36 of 99 terms are censored (`< 20`) rather than unscored** — real signal, not silence, across exactly the on-topic long tail: `beginner embroidery pattern`, `geometric embroidery pattern`, `botanical embroidery pattern`, `mandala embroidery pattern`, `christmas embroidery pattern`, and more. A `< 20` cap alongside a five- or six-figure `Etsy Competition` count (e.g. `modern embroidery pattern`: `< 20` searches against 144,506 competition) is a thin-demand, crowded-supply shape — worth re-pulling with a live eRank session for exact numbers before reading any single one as an opportunity.
3. **57 of 99 terms carry no numeric signal at all** — the plain-suggestion half of this export. Kept in the corpus and the table regardless (per the "every row with a keyword is kept" rule in `read_bulk_keywords_csv()`), since the term itself, as one of eRank's related-keyword suggestions, is signal before any number attaches to it — this is the data the earlier version of this note called "too thin to use" and set aside.

## Standing read

Confirms rather than overturns the 2026-09-17 archive's read of hand embroidery: real terms exist, they cluster tightly around pattern/aesthetic framing (floral, botanical, geometric, mandala), and wherever eRank scores them at all, they score saturated. The open question from Batch A — hand vs. machine embroidery demand — is not resolved here; every term in this export reads as hand-embroidery-pattern-shaped, so it does not by itself distinguish the two. A live eRank Keyword Tool pull against these exact terms (not Bulk Keywords, which doesn't report exact numbers below 20) is still the next step if any of the censored rows are worth committing design time to.

## Where this plugs into the map

Intelligence tier 3 (external tools) → evidence → product and tagging strategy, same tier as the Keyword Tool captures and now the same pipeline: `data/keyword-corpus.json` → `/keyword-explorer`.
