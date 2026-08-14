# Eval corpus — local only

This directory holds the accumulated evaluation record for the AI metadata
suggestions: scored runs, keyword-persistence verification, and real-world
batch results going back to the first prompt iterations.

**It is gitignored and must stay that way.** Every report in here is built from
real household documents — tax forms, medical bills, 529 statements, school
records — and names real people, including minors. This is a public repository.

`.gitignore` excludes `eval/*` and re-includes only this README.

## What lives here

| File | What it records |
|---|---|
| `KEYWORD_VERIFICATION_RESULTS.md` | Per-file keyword read-back verification; the primary evidence for the `pdf-lib` keyword bug |
| `test-results.md` | Scored AI suggestion runs with per-field grades |
| `REAL_WORLD_TEST_2025.md` | Full-corpus batch run against the live document set |
| `TESTING_RESULTS.md` | Summary rollup across runs |
| `test-ai-manual.md`, `test-via-api.md` | Manual test procedures naming specific source documents |
| `ai-suggestions-rubric-temp.md` | Working scratch copy of the scoring rubric |

## Why it is kept

It is the only measurement of how well the suggestion prompt actually performs.
Regenerating it means re-running the whole corpus through the OpenAI Vision API,
and the historical entries are the baseline that makes prompt changes
comparable. Scrubbing it to synthetic names would destroy that comparability.

## Regenerating

The scripts that produce these reports are committed under
`../prototype/testing/`. They read from the directory named by `PDFS_DIR` and
write here. See `../prototype/testing/README.md`.

## Rules

- Never commit anything in this directory except this README.
- Never paste excerpts into issues, PRs, or commit messages.
- When quoting a result in a public doc, replace document names and entity
  names with the synthetic placeholders used in `../docs/ai-suggestions-rubric.md`.
