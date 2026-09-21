# Archive — keyword-explorer

**Archived:** 2026-09-21 · **Created:** 2026-09-17 · **Tasks:** 31/32
**Outcome:** SHIPPED

Every keyword CSV under `docs/pulls/` is ingested into one generated corpus
and rendered as one sortable, filterable table at `/keyword-explorer`, with
re-pulls forming a series rather than overwriting. Merged in #500; the archive
it reads grew in #501 and #503.

**Evidence:** `scripts/ingest-pulls.py` (`read_keyword_csv`, `build_corpus`)
writes `data/keyword-corpus.json`; `components/KeywordTable.tsx` renders it
at `app/keyword-explorer/page.tsx`; `tests/keyword-corpus.test.ts` and
`tests/components/KeywordTable.test.tsx` pass on `main`. Task 1.2 (a later
drop lands with no hand-editing) was proven by #501 and #503 rather than by
a synthetic capture. Katy walked the page on 2026-09-21. Live at
`labs.beckharrisdesign.com/keyword-explorer`.

**Left open:** 3.11 — at 480px the hub's fixed `Sidebar` pushes every route's
content off-screen, so the table's mobile behaviour cannot be verified until
the shell is responsive. Hub-wide, not this change's. Two of the original
surface rules were later withdrawn on purpose (keyword column no longer
absorbs width; current/superseded is no longer shown on the table) — recorded
in `openspec/specs/keyword-explorer/spec.md` rather than left as silent drift.
