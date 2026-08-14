# PDF Metadata Viewer

A local tool for viewing, editing, and organizing the embedded metadata of
scanned household documents — tagging each file against a controlled taxonomy so
a directory of PDFs becomes searchable by who and what it concerns.

Migrated into the hub from a standalone repository. Source history was not
carried over; see [Privacy](#privacy) for why.

## Status

Working MVP. Core workflow, PDF splitting, activity logging, file list, and
AI-assisted suggestions are all functional. [docs/FEATURE_STATUS.md](docs/FEATURE_STATUS.md)
was rebuilt against the source during the migration and is current as of
2026-08-05.

## Local only

This prototype is not deployed and should not be. It reads a directory of real
personal documents and queries a private Notion database. It runs on port 3004.

## Setup

```bash
cd prototype
npm install
npm run dev
```

Open http://localhost:3004.

**Notion is configured at the hub root, not here.** Set `NOTION_TOKEN` and
`NOTION_ENTITIES_DATA_SOURCE_ID` once in the hub's `.env.local` and this
prototype picks them up, sharing auth with the hub app through
`@experiment-hub/notion-auth`. Create a `prototype/.env` only to override
something locally — a different PDF directory, a test database, another port.

Auth resolves exactly as it does for the hub app: `NOTION_TOKEN` if set,
otherwise the Replit connector. The connector's token can't be used outside
Replit, so local runs need a token.

> `.env.local` is gitignored and therefore absent from git worktrees. Working in
> one means copying it in or exporting the variables in your shell.

The app starts without any of this — only `PDFS_DIR` matters for boot. Notion is
needed for AI suggestions; `OPENAI_API_KEY` is optional on top of that.

## How the taxonomy works

Tags come from two sources that are deliberately kept apart:

| Source | Holds | Where |
|---|---|---|
| **Repository** | Generic vocabulary — document types, categories, status/action, retention, time period, special flags | [prototype/config/tag-vocabulary.md](prototype/config/tag-vocabulary.md) |
| **Notion** | Named entities — people, vendors, providers, schools, employers — and location tags | Entities database, `Slug` is the join key |

`prototype/lib/taxonomy-loader.js` merges the two into the shape the AI prompt
consumes. `prototype/lib/entities-notion.js` owns the Notion side: a 10-minute
in-memory cache, an on-disk snapshot for offline use, and an explicit field
allowlist.

**The allowlist is a security boundary, not a convenience.** Projected entities
are interpolated into the OpenAI Vision prompt, so anything read from Notion
leaves the machine. The Entities database also carries `Account Number`,
`Address`, `Phone`, and `Email`; those are never fetched. `prototype/testing/test-entity-projection.js`
asserts this and should be run after any change to that module:

```bash
node testing/test-entity-projection.js
```

## Privacy

The hub is a public repository and this experiment handles real household
documents. Three things follow:

1. **History was not migrated.** The original repository contains unredacted
   personal data in commits predating its own redaction pass. Only a squashed
   snapshot of the current state was brought over.
2. **The eval corpus is gitignored.** It lives in [eval/](eval/) and never gets
   committed — see [eval/README.md](eval/README.md).
3. **Examples use placeholders.** Prompt templates and the scoring rubric use
   synthetic names and vendors. Real entity names exist only in Notion and in
   the local snapshot.

Also gitignored: `prototype/.entities-snapshot.json`, `prototype/activity-log.json`,
and `prototype/pdfs/`.

## Layout

```
docs/                 PRD, scoring rubric, feature status
eval/                 Accumulated eval corpus (gitignored, local only)
prototype/
  server.js           Express API
  config/             Runtime-loaded: tag vocabulary, AI prompt template
  lib/                Taxonomy loader, Notion entity reader
  public/             Vanilla JS frontend (pdf.js via CDN)
  scripts/            Collection screening utility
  testing/            Standalone eval and verification scripts
```

## Known issues

- **Keywords read-back**: `pdf-lib` does not reliably read back keywords it
  wrote. The activity log is more trustworthy than re-reading the file.
- **PDFs only**: image files are not processed.
- **No OCR**: scans without embedded text yield no extractable content.

## Outstanding

- **The live Notion round-trip is unverified.** Projection, shaping, caching,
  and both failure paths are covered by `testing/test-entity-projection.js`,
  but no `NOTION_TOKEN` was available where this was migrated — an actual query
  and its pagination have never run.
- **AI output is not validated against the taxonomy.** Tag conformance is
  prompt-only; nothing checks the model's response before it reaches you. This
  is the largest remaining gap — see [docs/FEATURE_STATUS.md](docs/FEATURE_STATUS.md).

Migration into the hub is otherwise complete: docs rewritten against the
source, and the experiment registered in `data/experiments.json`,
`data/prototypes.json`, and `data/documentation.json`.
