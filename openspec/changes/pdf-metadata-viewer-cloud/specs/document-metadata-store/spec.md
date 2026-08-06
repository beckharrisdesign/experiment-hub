# document-metadata-store

## ADDED Requirements

### Requirement: Metadata edits are staged, not written through

The system SHALL hold pending metadata edits in the database and MUST NOT write
to the underlying PDF on each field change. A document with pending edits SHALL
report that state so the interface can distinguish saved-to-database from
written-to-file.

This replaces the v1 behaviour where every field edit rewrote the whole PDF —
free on local disk, but one full download-modify-upload per keystroke against
remote storage.

#### Scenario: Editing a single field

- **WHEN** a user changes the title of a document
- **THEN** the new value is persisted to the database
- **AND** the PDF bytes in storage are unchanged
- **AND** the document is reported as having pending edits

#### Scenario: Editing several fields before committing

- **WHEN** a user changes title, subject, and keywords in one session
- **THEN** all three values are persisted
- **AND** exactly zero writes are made to the PDF

#### Scenario: Reopening a document with pending edits

- **WHEN** a user opens a document whose staged values differ from the file
- **THEN** the staged values are shown
- **AND** the difference from the file's own metadata is visible

### Requirement: Commit writes the batch to the file in one pass

The system SHALL provide an explicit commit that writes all pending edits for a
document to the PDF in a single read-modify-write. On success it SHALL clear the
pending state; on failure the pending edits MUST survive so no user work is lost.

#### Scenario: Committing pending edits

- **WHEN** a user commits a document with three pending field changes
- **THEN** the PDF is read, modified, and written exactly once
- **AND** the pending state is cleared
- **AND** the commit is recorded in history

#### Scenario: Commit fails at the storage layer

- **WHEN** the write to storage fails
- **THEN** the pending edits remain intact and still committable
- **AND** the failure is surfaced rather than reported as success

#### Scenario: Committing with nothing pending

- **WHEN** a user commits a document with no pending edits
- **THEN** no write is made to storage

### Requirement: Every metadata change is recorded with field-level history

The system SHALL record each metadata change as a history row carrying the
document, the field, the previous value, the new value, and a timestamp. History
SHALL be queryable per document and MUST NOT be capped by a fixed row count.

This supersedes the v1 `activity-log.json`, an append-only file truncated to the
most recent 1000 entries across all documents.

#### Scenario: Reading a document's history

- **WHEN** a user views the history for a document
- **THEN** every recorded change for that document is returned, newest first
- **AND** each entry shows field, previous value, new value, and timestamp

#### Scenario: History survives a rename

- **WHEN** a document is renamed
- **THEN** history recorded before the rename remains associated with it

#### Scenario: History outlives the file

- **WHEN** a document's underlying file is deleted
- **THEN** its history rows remain queryable

### Requirement: Reading a document's metadata does not require fetching its bytes

The system SHALL serve a document's current metadata, page count, and pending
state from the database without retrieving the PDF from storage. Listing
documents SHALL likewise require no per-document byte fetch.

In v1 the file list read and parsed every PDF to populate its columns, which is
untenable once the bytes live behind a network.

#### Scenario: Listing documents

- **WHEN** a user opens the document list
- **THEN** metadata columns are populated for every row
- **AND** no PDF bytes are fetched from storage

#### Scenario: Opening a document's metadata panel

- **WHEN** a user opens a document
- **THEN** its metadata renders from the database
- **AND** bytes are fetched only for rendering the page preview

### Requirement: Keyword values round-trip without corruption

The system SHALL store keywords as a discrete ordered list rather than a
delimited string, and a committed keyword list MUST read back identically when
the file's `Keywords` value is split on whitespace.

Verified 2026-08-06: `pdf-lib` joins the array with a single space and writes one
flat string into the Info dictionary, and writes no XMP packet. The array
boundaries are therefore not stored at all, so the write is what loses them, not
the read. Space-free keywords round-trip exactly; keywords containing whitespace
cannot, by any reader.

#### Scenario: Keywords survive a commit

- **WHEN** a keyword list of space-free slugs is committed to a PDF and the
  file's stored `Keywords` value is split on whitespace
- **THEN** the resulting list is identical to what was written, in content and
  order

#### Scenario: The database remains authoritative for order and grouping

- **WHEN** the file's keyword string is ambiguous or lossy
- **THEN** the database list is the source of truth
- **AND** the file is written from it, never parsed back into it

### Requirement: Keywords containing whitespace are rejected before commit

The system SHALL reject any keyword containing whitespace before it can be
staged or committed, and MUST surface the rejection with the offending value.

This is a real hazard rather than a theoretical one: entity slugs arrive from the
Notion `Slug` field, which is free text. A slug typed with a space would be
written into the file and silently merge with its neighbour, and nothing would
report it.

#### Scenario: A slug containing a space arrives from Notion

- **WHEN** an entity's `Slug` contains whitespace
- **THEN** it is not offered as a keyword
- **AND** the problem is reported rather than silently dropped

#### Scenario: A whitespace keyword is entered directly

- **WHEN** a user enters a keyword containing a space
- **THEN** it is refused before staging, naming the value
