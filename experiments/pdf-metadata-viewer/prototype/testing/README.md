# Testing Directory

This directory contains all test scripts and related testing documentation for the PDF metadata viewer.

## The one automated test

`test-entity-projection.js` is the only script here that runs unattended, asserts,
and exits non-zero on failure. It needs no API key, no network, and no extra
packages. Run it after any change to `lib/entities-notion.js`:

```bash
node testing/test-entity-projection.js
```

Everything else below is an eval harness: it calls a live model and prints
results for a human to read.

## Extra packages required

These scripts render PDFs outside the browser or drive a real browser, so they
need packages that are **deliberately not in `package.json`** — carrying them
would pull Chromium into every install for scripts that run occasionally:

| Script | Needs |
|---|---|
| `test-ai-direct.js` | `canvas`, `pdfjs-dist` |
| `test-ai-suggestions-batch.js` | `canvas`, `pdfjs-dist` |
| `test-ai-via-server.js` | `puppeteer` (plus a running server) |
| `test-ai-batch-browser.js` | `puppeteer` (plus a running server) |

Install them ad hoc when you need them, without touching the lockfile:

```bash
npm install --no-save canvas pdfjs-dist puppeteer
```

The two browser scripts talk to `http://localhost:${PORT:-3004}` — the same
default `server.js` uses. Start the server first.

## Test Scripts

### AI Suggestion Testing
- `test-ai-direct.js` - Direct OpenAI API testing with canvas rendering (5 PDFs, 3 attempts each)
- `test-ai-suggestions-batch.js` - Batch testing with rubric scoring (5 PDFs, includes scoring)
- `test-ai-suggestions.js` - Single PDF testing template (incomplete/non-functional)
- `test-ai-via-server.js` - Test via server API using browser for images
- `test-ai-batch-browser.js` - Full browser automation end-to-end testing

### Scoring Scripts
- `score-suggestions.js` - Score individual AI suggestions using the rubric
- `score-all-results.js` - Score all test results from test-results.md

### Verification Scripts
- `verify-keywords.js` - Verify that keywords are being saved correctly to PDF files
- `verify-keywords-stats.js` - Enhanced keyword verification with statistics across all PDFs

## Documentation

- `TEST_SCRIPTS_ANALYSIS.md` - Analysis of test script redundancy
- `TESTING_RESULTS.md` - Testing results and notes
- `REAL_WORLD_TEST_2025.md` - Real-world testing documentation
- `test-ai-manual.md` - Manual testing instructions
- `test-via-api.md` - API testing documentation
- `test-results.md` - Generated test results

## Usage

All scripts should be run from the project root directory:

```bash
# From project root
node testing/test-ai-suggestions-batch.js
node testing/score-suggestions.js "filename" "suggested-filename" "title" "subject" "keywords"
node testing/verify-keywords.js "filename.pdf"
node testing/verify-keywords-stats.js
```

## Note

See `TEST_SCRIPTS_ANALYSIS.md` for recommendations on consolidating redundant test scripts.
