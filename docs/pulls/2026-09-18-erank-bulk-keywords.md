---
source: erank
surface: bulk-keywords
captured: 2026-09-18
tier: external
scope: market
measures: [demand]
subjects: [embroidery]
half_life: 90d
answers: >-
  Related-term demand for an embroidery-adjacent seed set, from eRank's Bulk
  Keywords tool. Thin (14 rows, 9 with unquantified searches) and not part of
  the queryable corpus.
---
# Data pull — eRank Bulk Keywords, captured 2026-09-18

**Provenance:** one eRank **Bulk Keywords** export (`eRank - Bulk Keywords.csv`), landed alongside the same day's [Keyword Tool batch](2026-09-18-erank-keywords.md). Bulk Keywords is a different eRank instrument from the Keyword Tool: `ingest-pulls.py`'s `classify()` reads it correctly by filename and lands it as its own surface, `docs/pulls/2026-09-18-erank-bulk-keywords.csv`.

**What surface this is:** related-term suggestions, not a single-seed demand table. All 14 rows read as embroidery-adjacent (`embroidery kits`, `hand embroidery digital pattern`, `hoop art patterns`, `chakra embroidery kit`, `mindful mantra embroidery`, …), suggesting the seed was `embroidery kits` or similar, but the export doesn't record the seed the way the Keyword Tool does.

**Not in `data/keyword-corpus.json`.** Its columns (`Avg Searches`, `Avg Clicks`, `Avg CTR`, `Etsy Competition`, `Keyword Difficulty`) don't match the Keyword Tool schema `read_keyword_csv()` parses (`Average Searches`, `Competition`, `KD`, `Tag Occurrences`), and `keyword_csvs()` only scans `-erank-keywords-` filenames — this file's `-erank-bulk-keywords-` name is correctly excluded rather than silently misread. If Bulk Keywords exports become routine, `ingest-pulls.py` needs a second reader for this schema before they can join the corpus; until then, read this note by hand.

## What's usable

Only 5 of 14 rows carry a numeric `Avg Searches`; the rest read `"Unknown"`, and `Keyword Difficulty` is blank wherever `Avg Searches` is:

| Keyword | Avg Searches | Avg Clicks | Avg CTR | Etsy Competition | KD |
|---|---|---|---|---|---|
| `embroidery kits` | 2,918 | 3,195 | 109% | 1,071,034 | 100 |
| `abstract` | 368 | 399 | 108% | 1,969,232 | 100 |
| `modern art embroidery` | < 20 | Unknown | Unknown | 42,619 | 100 |
| `colorful embroidery` | < 20 | Unknown | Unknown | 37,062 | 100 |
| `hand embroidery digital pattern` | < 20 | Unknown | Unknown | 21,838 | 100 |

`embroidery kits` itself (the likely seed) shows KD 100 against every one of its own related terms — this instrument reads saturated wherever it reports a number at all, which is thin evidence either way; it isn't corroborated by a second row at a lower difficulty.

## Standing read

Too thin to act on alone. Worth a second Bulk Keywords pull with a cleaner seed, and worth deciding whether this instrument earns a permanent place in `ingest-pulls.py` (a `read_bulk_keywords_csv()` alongside `read_keyword_csv()`) before treating it as a recurring surface rather than a one-off.

## Where this plugs into the map

Intelligence tier 3 (external tools), same tier as the Keyword Tool captures, but not yet wired into the same evidence pipeline (`data/keyword-corpus.json` / `/keyword-explorer`).
