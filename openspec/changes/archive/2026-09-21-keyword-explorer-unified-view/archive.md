# Archive — keyword-explorer-unified-view

**Archived:** 2026-09-21 · **Created:** 2026-09-18 · **Tasks:** 32/33
**Outcome:** SHIPPED

One row per distinct keyword across Keyword Tool, Bulk Keywords, Tag Report,
Ranked and Targeting, with an independently-nullable sub-object per source;
the separate `BulkKeywordTable` retired into the merged table; the Tag Report
read into the corpus for the first time. Merged in #505 (`6fc2b82`).

**Evidence:** `read_tag_report_csv()` and the keyword-keyed
`build_merged_corpus()` in `scripts/ingest-pulls.py`; `data/keyword-corpus.json`
at 2,310 rows; `components/KeywordTable.tsx` band headers. The §1 scenarios —
`folk art embroidery` as one three-instrument row, `embroidery kits` with
blank Tag Report columns, `snow globe` / `snow globes` kept apart, blanks
sorting last on every band — run in `tests/keyword-corpus.test.ts` and
`tests/components/KeywordTable.test.tsx` on `main`, and Katy walked them on
2026-09-21. `current`/`supersededBy` settled as newest-wins with earlier
captures under `history` (design decision 5, task 3.17).

**Left open:** nothing functional. 2.1 is N/A (no prototype shell; this is a
hub route). The delta specs are promoted to `openspec/specs/unified-keyword-row/`
and `openspec/specs/keyword-explorer/`.
