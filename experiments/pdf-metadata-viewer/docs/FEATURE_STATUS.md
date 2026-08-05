# Feature Status

Verified against the code on 2026-08-05, during the migration into the hub.

The previous version of this file was written before the AI and taxonomy work
landed and described both as "not started." Every claim below was checked
against the source.

---

## Core workflow — complete

| Capability | State | Notes |
|---|---|---|
| Point at a directory of PDFs | ✅ | `PDFS_DIR`, relative or absolute; Google Drive mounts detected with specific error messaging |
| Load and preview documents | ✅ | Multi-page with thumbnails, rendered in-browser via pdf.js |
| Navigate the queue | ✅ | Arrow keys and buttons, circular |
| Edit metadata | ✅ | Title, subject, author, keywords |
| AI-suggested metadata | ✅ | Vision model, taxonomy-constrained, per-field accept |
| Save and advance | ✅ | |

## Metadata editing — complete, with one gap

- ✅ Title, subject, author editable
- ✅ Tag-chip keyword editor, comma-delimited storage
- ✅ File renaming
- ⚠️ **Creator and producer**: the API accepts writes for both, but the UI marks them `editable: false` ([app.js:910-911](../prototype/public/app.js)). Backend support exists; the frontend doesn't expose it.
- ❌ Custom fields not editable

## AI-assisted organization — complete

- ✅ Page images plus current metadata sent to `gpt-4o-mini`
- ✅ Suggests filename, title, subject, keywords
- ✅ Suggestions constrained to the taxonomy by prompt
- ✅ Per-field accept, displayed inline against current values
- ✅ Prompt template externalized to `prototype/config/ai-prompt-template.md`, hot-reloaded by nodemon
- ❌ **No post-response validation.** Tag conformance is prompt-only — nothing checks the model's output against the taxonomy before it reaches the user. This is the main reason taxonomy violations still occur.
- ❌ AI-suggested split points
- ❌ Auto-query on file open — currently a button click ([app.js:1171](../prototype/public/app.js))

## Tag taxonomy — complete, now Notion-backed

- ✅ Generic vocabulary in `prototype/config/tag-vocabulary.md` — 25 document types, 22 categories, 12 action, 8 status, 10 special flags
- ✅ Entities resolved at runtime from the Notion Entities database, keyed on `Slug`
- ✅ Field allowlist prevents contact and account data reaching the model, asserted by `prototype/testing/test-entity-projection.js`
- ✅ Offline snapshot fallback and 10-minute cache
- ❌ Validation of tags *against* the taxonomy (see above)

## PDF splitter — complete

- ✅ Split button appears only for multi-page PDFs
- ✅ Thumbnail grid with click-to-insert break markers
- ✅ Sequential auto-numbering (`name-001.pdf`)
- ✅ Metadata preserved to every output: title, subject, keywords, author, creator, producer
- ✅ Outputs tagged `from-split`; the original tagged `already-split` **and `needs-deleting`**
- ❌ User-configurable naming pattern
- ❌ Per-output metadata customization before execution

## File list — complete

- ✅ Paginated, `metadata=false` fast path for initial load
- ✅ Client-side sort and filter
- ✅ Metadata columns plus per-file update count from the activity log
- ✅ Per-row kebab menu: view, rename, delete

## Activity log — complete

- ✅ Every metadata update, rename, and split recorded with field-level diffs
- ✅ Capped at 1000 entries
- ✅ Collapsible UI with auto-refresh

## Infrastructure — added during migration

- ✅ Path traversal validation on every route, including body-sourced filenames
- ✅ Server starts without `OPENAI_API_KEY` (AI suggestions genuinely optional)
- ✅ Five unused dependencies removed
- ✅ Eval corpus, entity snapshot, activity log, and PDFs all gitignored

---

## Not built

| Feature | Priority | Note |
|---|---|---|
| Taxonomy validation of AI output | High | The highest-value remaining item — closes the loop the prompt can't |
| Keyword read-back fix | High | See [roadmap.md](roadmap.md); blocks trusting embedded metadata |
| Image file support | High | Many scans aren't PDFs and can't be processed at all |
| Processing tracking | Medium | File list update counts provide the foundation |
| Duplicate detection | Medium | File list enables it by eye; nothing automated |
| OCR | Medium | Blocks scans without embedded text |
| XMP packet syncing | Medium | |
| Batch operations | Medium | |
| Reporting and analytics | Low | |
| Cloud read/write | Low | Drive mount detection already exists |
| Automation | Low | |

Full detail in [roadmap.md](roadmap.md).
