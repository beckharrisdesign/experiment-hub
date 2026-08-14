# PDF Metadata Viewer - PRD

## Overview

A local tool for turning a directory of scanned household documents into a
searchable archive. It shows each PDF alongside its embedded metadata, lets you
edit title, subject, and keywords, and uses AI to suggest values drawn from a
controlled taxonomy. Named entities — family members, vendors, providers,
schools — resolve against a Notion database so tags stay consistent across
years of filing.

---

## Problem Statement

Scanning is the easy part. What makes a household archive useful is what
happens after: consistent naming, consistent tagging, and metadata that
actually lives inside the file.

- Scanner output is undifferentiated — `Scan_20250227_0001.pdf` tells you nothing.
- Tagging by hand is slow enough that it doesn't survive contact with a real backlog.
- Free-text tags drift. The same clinic gets abbreviated one year, spelled out the next, and cased differently the year after — and none of those spellings find each other.
- Multi-page scans bundle several unrelated documents into one file.
- Folder hierarchies force one filing choice; a medical bill for one child is filed under medical *or* that child, never both.
- Metadata stored outside the file is lost the moment the file moves.

Existing tools miss the middle. Consumer scanner apps stop at OCR. Document
managers like Paperless-ngx and DEVONthink hold metadata in their own database,
so leaving the tool means leaving the organization behind.

---

## Target User

**Primary**: A household archivist digitizing years of family paperwork —
medical, financial, school, vehicle — who wants documents findable by both
subject and person, and who will process in periodic batches rather than
continuously.

**Not for**: Teams, shared archives, or anyone needing multi-user access,
permissions, or an audit trail. This is a single-operator tool on local files.

---

## Goals & Objectives

1. **Make embedded metadata the only source of truth.** Everything the tool
   writes travels with the file. Delete the tool and the archive still works.
2. **Keep tags consistent without relying on memory.** A controlled vocabulary
   plus a shared entity registry, so the same person or vendor always resolves
   to the same slug.
3. **Cut per-document time enough that batches finish.** AI proposes, the
   human approves; the workflow has to beat manual entry or it won't get used.

---

## Core Features

### MVP scope

- **Document queue with preview**: Point at a directory, page through it. Multi-page preview with thumbnails, keyboard navigation, circular queue.
- **Metadata editing**: Title, subject, author, and a tag-chip keyword editor. Keywords are written as comma-delimited values into the PDF's own metadata.
- **AI suggestions**: The page images plus current metadata go to a vision model, which returns a proposed filename, title, subject, and keywords constrained to the taxonomy. Each field is accepted or rejected individually.
- **Two-source taxonomy**: Generic tags (document type, category, retention, status) live in the repo. People, organizations, and locations come from the Notion Entities database, keyed on a stable slug.
- **PDF splitter**: Insert break markers between page thumbnails to split a bundled scan. Metadata carries to every output; originals and outputs are tagged so the split is traceable.
- **File list**: Sortable, filterable table of the whole directory with metadata columns and a per-file update count, for spotting gaps and duplicates by eye.
- **Activity log**: Append-only record of every metadata change, rename, and split, with field-level diffs.

**Out of scope for MVP**: OCR, image formats other than PDF, batch operations across multiple files, automated duplicate detection, XMP packet syncing, cloud storage, multi-user anything.

See [roadmap.md](roadmap.md) for what's deferred and why.

---

## Success Metrics

**Outcomes (plain language — what "good" means):**

- A document processed once is findable later by person, vendor, type, or year — without opening it.
- Tagging a batch is fast enough that a backlog gets cleared instead of abandoned.
- Metadata survives moving the file, opening it elsewhere, and uninstalling this tool.

**Failing tests (each stays false until the outcome is true):**

- Fails until: keywords written by the app read back identically from a third-party PDF reader, not just from this app. *(Currently failing — see Known issues.)*
- Fails until: a full-corpus run produces zero keywords outside the taxonomy.
- Fails until: median time from opening a document to saving approved metadata is under 30 seconds.
- Fails until: every person and organization tag in the corpus resolves to a slug present in the Notion Entities database.

**MVP phase**

- AI suggestion acceptance rate (fields accepted without edit): > 70%
- Median time per document: < 30 seconds
- Taxonomy violations per 100 documents: 0
- Documents requiring a second pass: < 10%

**Known issues gating the above**

- `pdf-lib` does not reliably read back keywords it wrote. Keywords appear to
  persist correctly, but re-reading returns a corrupted form. This is the
  single biggest threat to the premise that embedded metadata is trustworthy,
  and it needs verification against external readers before anything else
  matters.
- Naming conventions are not consistently applied by the model — em dash
  spacing, casing, and date formatting drift. No post-processing validation
  exists yet.

---

## Note on validation

This is a personal tool, not a commercial experiment. There is no landing page
or demand-validation phase — the user is the builder, and the go/no-go signal
is simply whether the archive gets used to find things.
