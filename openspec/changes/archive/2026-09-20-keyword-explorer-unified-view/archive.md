# Archive — keyword-explorer-unified-view

**Archived:** 2026-09-20 · **Created:** 2026-09-18 · **Tasks:** 17/20 (§1 outcome checkboxes and 2.1 weren't ticked but are covered by evidence below)
**Outcome:** SHIPPED

Merged via PR #505 (squash commit `6fc2b82` on `main`). One row per distinct keyword across Keyword Tool, Bulk Keywords, Tag Report, Ranked and Targeting; `BulkKeywordTable` retired into the merged table; `current`/`supersededBy` resolved as newest-wins with earlier captures kept under `history` (design.md decision 5, task 3.17).

**Evidence:** `components/KeywordTable.tsx` (source-band header, 20-column merge), `scripts/ingest-pulls.py`'s `read_tag_report_csv()` + single keyword-keyed `build_corpus()`, `data/keyword-corpus.json` at 2293 rows. `tests/keyword-corpus.test.ts` + `tests/components/KeywordTable.test.tsx` — 78 tests passing on `main`, covering the merge, blank-vs-zero, censored values, band headers, and blank-sorts-last across all source columns. Task 4.1's manual walkthrough (real `pnpm dev`, op-backed) independently confirmed `folk art embroidery`'s three-instrument row, `embroidery kits`'s blank Tag Report columns, and the `snow globe`/`snow globes` split.
**Left open:** tasks.md §1's own checkboxes and 2.1 were never ticked in the file, even though the scenarios they name are exercised by the test suite and task 4.1 — a bookkeeping gap, not a functional one.
