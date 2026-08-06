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
delimited string, and a committed keyword list MUST read back identically from a
third-party PDF reader.

`pdf-lib` does not reliably read back keywords it wrote. The database holding the
authoritative list means a bad read no longer destroys data, but a bad *write*
still corrupts the archive, so the file-level round trip must be proven before
this capability is trusted.

#### Scenario: Keywords survive a commit

- **WHEN** a keyword list is committed to a PDF and that PDF is reopened in an
  external reader
- **THEN** the keyword list read back is identical, in content and order

#### Scenario: Keyword list with separator-like characters

- **WHEN** a keyword contains a comma or semicolon
- **THEN** it is preserved as a single keyword rather than split
