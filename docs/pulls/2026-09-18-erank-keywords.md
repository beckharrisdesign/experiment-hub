---
source: erank
surface: keywords
captured: 2026-09-18
tier: external
scope: market
measures: [demand]
subjects: [dark-academia, tapestry, wall-art, embroidery-kits, cutecore, christmas, grandma-hobbies, pastel-goth, paint-by-numbers, medieval-tapestry, book-nook, christmas-pattern]
half_life: 90d
answers: >-
  Marketwide demand for 12 seeds — 7 new, 5 re-pulls of existing seeds that
  supersede their 2026-09-17 rows at the individual-keyword level. Extends
  the corpus from 50 seeds / 410 rows to 61 seeds / 2,014 rows.
---
# Data pull — eRank Keyword Tool, 12 seeds, captured 2026-09-18

**Provenance:** eRank Keyword Tool exports, 2026-09-18, twelve seeds, landed via `scripts/ingest-pulls.py` as `2026-09-18-erank-keywords-<seed>.csv` in two passes over the same upload batch (the second pass caught eight files the first pass's directory scope missed).

- **New seeds (7):** `dark academia`, `tapestry`, `embroidery kits`, `grandma hobbies`, `pastel goth`, `medieval tapestry`, `book nook`.
- **Re-pulls of existing 2026-09-17 seeds (5):** `wall art`, `cutecore`, `christmas`, `paint by numbers`, `christmas pattern`. Several source filenames carry eRank's `_1` re-download suffix (e.g. `wall_art_1.csv`, `christmas_pattern_1.csv`); `ingest-pulls.py`'s `slug()` strips it at landing time.

**Every re-pull is newer and different in row count from its 2026-09-17 counterpart**, so `build_corpus()` marks the 2026-09-18 rows `current` and the matching 2026-09-17 rows `superseded_by` it, at the individual-keyword level — not per-query, per-keyword: a keyword only supersedes if the same keyword text reappears in the new capture. Both captures stay archived; 83 rows across the archive are now marked superseded, all pointing to 2026-09-18.

> **README badge caveat:** `build_manifest()` supersedes by `(source, surface)` **note**, not by seed — so the README's inventory table now shows the entire [2026-09-17 capture](2026-09-17-erank-keywords.md) (10 seeds, 50 files) as `⏹ superseded`, when in truth only 5 of its 10 seeds were re-pulled, and even those keep most of their original rows current (only the keywords that reappeared in the 2026-09-18 export are superseded). The other 5 seeds are entirely still current. Only `data/keyword-corpus.json`'s per-keyword `current`/`superseded_by` fields are accurate here. Pre-existing limitation of `build_manifest()`'s series logic, not introduced by this pull — worth fixing if repeat pulls of a single seed within a multi-seed note become routine.

**What surface this is:** same instrument as the [2026-09-17 capture](2026-09-17-erank-keywords.md) — eRank Keyword Tool, marketwide demand for terms outside the shop's current tag vocabulary. Read as reconnaissance, not a to-do list.

## Distilled findings

1. **`dark academia` (91 rows) is a tight, on-seed result** — every row in the top 5 is literally `dark academia <x>` (decor 2,236 · clothing 1,022 · art 993). The seed itself is highest volume at 4,731 searches, KD 81.
2. **Most of the rest returned broad related-term suggestions rather than narrow seed variants** — the same export-shape eRank showed in the [2026-09-17 capture's `procreate brushes` seed](2026-09-17-erank-keywords.md), where a thin result turned out to be an export artifact. `embroidery kits` (615 rows) topped out on `gift` (58,648), `wall art` (53,423) and `halloween` (45,078) — nothing embroidery-specific in the top 5. `tapestry` (324 rows) topped on `pokemon` (48,414) and `bts` (12,193) — fandom terms, not decor. `book nook` (22 rows) and `medieval tapestry` (6 rows) both surfaced `lord of the rings` (11,469) as a top term. Treat all of these as adjacent-market noise until filtered to on-topic rows.
3. **Another trademark cluster, same shape as [§1 of the 2026-09-17 note](2026-09-17-erank-keywords.md#1-the-guardrail):** `book nook` alone surfaced `elden ring` (12,189, KD 1), `project hail mary` (10,808, KD 1), `dungeon crawler carl` (9,634, KD 1) and `magic the gathering` (9,980, KD 24); `cutecore` added `mtg` (8,910, KD 35) and `hello kitty` (8,558, KD 33); `paint by numbers` added `minecraft` (13,347, KD 5, already flagged 2026-09-17). Low KD against high volume keeps reading as legal exposure, not open opportunity, across every capture so far — not a one-off in the first batch.
4. **`grandma hobbies` (1 row) barely returned anything** — only `yarn bowl` (3,214, KD 5) survived `read_keyword_csv()`'s drop rule. Either the seed is genuinely thin on eRank or most of its rows were unscorable long-tail (the same shape [the 2026-09-17 note's §0 caveat](2026-09-17-erank-keywords.md) flags for `procreate brushes`) — this export alone can't distinguish the two.

## Not in this note: the Bulk Keywords files

Six more files landed the same day from a different eRank export (**Bulk Keywords**, not **Keyword Tool**) — one in this batch, five more in a follow-up batch. Their schema doesn't match `read_keyword_csv()`, so `ingest-pulls.py` correctly lands them as their own surface (`docs/pulls/2026-09-18-erank-bulk-keywords*.csv`) rather than folding them into this note — and, as of the follow-up batch, they're read by their own `read_bulk_keywords_csv()`/`build_bulk_corpus()` and do appear in `data/keyword-corpus.json`, as a separate `bulk_keywords.rows` array and its own table on `/keyword-explorer`. See [its own note](2026-09-18-erank-bulk-keywords.md) for what's in them.

## Standing read

Extends the archive (61 seeds, 2,014 corpus rows) without changing any conclusion from the 2026-09-17 capture. `dark academia` is the one new, cleanly-scoped seed worth a look if the aesthetic fits a future line; everything else mostly confirms two properties of the export rather than new market signal: eRank's Keyword Tool returns broad related terms once a seed is common enough, and low-difficulty/high-volume rows keep turning out to be trademarks rather than openings.

## Where this plugs into the map

Intelligence tier 3 (external tools) → evidence → product and tagging strategy. Extends the [2026-09-17 eRank Keyword Tool capture](2026-09-17-erank-keywords.md) rather than opening a new surface.

## Addendum — seventeen more seeds from the same day, landed 2026-09-21

Found un-landed in `~/Downloads` and landed as `2026-09-18-erank-keywords-<seed>.csv`: `calm stitching` (413 rows), `candles for her` (414), `colorful embroidery` (522), `contemporary embroidery designs` (480), `embroidery pattern` (1,485), `flower hoop` (598), `geometric wreath` (571, as `-2`), `hand embroidery abstract` (386), `modern hand embroidery` (395), `modern mandala embroidery pdf` (328), `small gift for her` (581, as `-1`), `snow globe` (1,559), `snow globes` (789), `stick and stitch` (1,204), `stick and stitch halloween` (326), `stick and stitch terrarium` (22), `stickvorlagen` (69), `wooden wick candle` (400). Read by `read_keyword_csv()`; the corpus goes from 2,420 rows to 8,247, and the 9/18 capture from 12 seeds to 30.

Three things worth knowing before reading them:

- **The big lists are the generic market again.** Every seed above 300 rows tops out at `gift` 58,648, `wall art` 53,423, `home decor` 31,986, `christmas` 41,113 — the same head terms whatever the seed. The seed-specific signal is in the long tail of each file, not the top.
- **`stick and stitch` as a seed returns 1,204 related terms;** the term itself reads 1,166 on 9/21. `stickvorlagen` (69 rows) is the German market for the same product — a seed Katy tried and the only non-English one in the archive.
- **`snow globe` / `snow globes` (1,559 / 789 rows) were pulled the day the Personalized snow-globe listings went live;** their heads are `stickers` and `gift`, their tails are where the snow-globe terms are.
