# Roadmap

Deferred work, carried over from the original PRD when it was rewritten to hub
format. The PRD covers MVP scope and success criteria; this file holds the
backlog so the thinking isn't lost.

Priorities reflect the original assessment and have not been re-litigated.

---

## Known issues

### Keyword read-back (critical)

`pdf-lib`'s `getKeywords()` returns keywords as space-separated characters
rather than the string that was written. Keywords do appear to be saved
correctly — the failure is on read.

This undermines the core premise that embedded metadata is trustworthy. Until
it's resolved, the activity log is more reliable than re-reading a file.

- Verify keywords persist when the PDF is moved or opened in other applications
- Test with external PDF viewers to confirm the keywords are genuinely embedded
- A reconstruction algorithm exists; evaluate whether to keep it or replace the library

### Image files not supported

Many scanned documents are saved as JPG or PNG rather than PDF and cannot be
processed at all. Options: auto-convert to PDF on ingest, or support images
directly in the viewer.

### Naming conventions applied inconsistently

AI-generated filenames drift from the expected format — em dash spacing, wrong
casing, missing or malformed dates, vendor names not matching taxonomy slugs.
Needs clearer prompt examples plus post-processing validation or auto-correction.

### Taxonomy not enforced

The model does not consistently use exact tag slugs. Tags are constrained by
prompt only; nothing validates the response. Needs post-processing validation
against the taxonomy with auto-correction for near-misses.

---

## Phase 0 — Critical fixes

- Resolve the keyword read-back bug
- Image file support (convert on ingest, or handle directly)
- Auto-query AI suggestions on file open, so the default path is review-and-refine rather than click-then-wait

## Phase 1 — Essential metadata features

- **Additional editable fields**: creator, producer, and custom fields (currently read-only)
- **XMP packet syncing**: sync between the XMP packet and the legacy info dictionary, with Dublin Core and PDF namespace support, so metadata is readable by modern tooling
- **Splitter naming patterns**: let the user configure the output naming pattern before splitting, and customize metadata per output file
- **Processing tracking**: increment a processing counter in metadata, optionally stamp the subject or add a processing tag, so a file carries its own history
- **Duplicate detection**: file hash and metadata comparison first; content similarity later

## Phase 2 — AI and content

- **AI split-point suggestions**: detect document boundaries in bundled scans
- **Teachable field locations**: let the user mark where a field lives on a recurring document type ("on this vendor's receipts the date is top-right"), store the document-type-to-region mapping, and use it to direct model attention
- **OCR text extraction**: extract text for better model context, and to make scans without embedded text usable at all
- **Prompt optimization**: A/B framework, per-suggestion-type prompts, and a feedback loop from accept/reject decisions

## Phase 3 — UX

- **Preview zoom**: verify dates and amounts before accepting suggestions
- **Rule system**: user-defined rules per document type or vendor (e.g. tax documents always get `tax-form`, `financial`, `keep-7yr`), applied to both filename format and required tags
- **Surface workflow tags in the UI**: `no-split-needed`, `possible-duplicate`, `needs-deleting` exist in the taxonomy but aren't exposed

## Phase 4 — Batch processing

- Bulk tag add/remove, bulk title and subject updates, pattern-based renaming across a selection
- Activity log export, filtering by date and type, and undo

## Phase 5 — Reporting

- Document counts, tag usage, metadata completeness
- Tag frequency over time, processing efficiency, CSV/JSON export

## Phase 6 — Cloud

- Read-only access to cloud directories (Google Drive, Dropbox, iCloud), then bidirectional sync
- Note: Google Drive mount detection and error handling already exist, since the current PDF directory often lives there

## Phase 7 — Automation

- Agent-driven batch processing with configurable auto-tagging rules, a human review queue, and scheduling
