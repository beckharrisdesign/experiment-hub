-- Split lineage and workflow state for pdf-metadata-viewer.
-- openspec/changes/pdf-metadata-viewer-cloud — design.md D10, D11.
--
-- Lands ahead of the splitter interface on purpose. The screen needs design
-- first, but the data model is expensive to defer: adding these once documents
-- exist is a migration against real rows rather than an empty table.

-- ── Split lineage ──────────────────────────────────────────────────────────
alter table pdf_documents
  add column if not exists split_from_document_id uuid
    references pdf_documents(id),
  add column if not exists split_index integer,
  add column if not exists superseded_at timestamptz;

comment on column pdf_documents.split_from_document_id is
  'Document this one was produced from by splitting. Null for originals. '
  'Replaces the from-split keyword — derivable, not stored twice.';
comment on column pdf_documents.split_index is
  'Position within the split that produced this document, so ordering survives.';
comment on column pdf_documents.superseded_at is
  'When an original was replaced by its split outputs. Replaces already-split.';

create index if not exists pdf_documents_split_from
  on pdf_documents(split_from_document_id)
  where split_from_document_id is not null;

-- An output must know its position, and an original must not claim one.
alter table pdf_documents
  drop constraint if exists pdf_documents_split_index_with_parent;
alter table pdf_documents
  add constraint pdf_documents_split_index_with_parent
  check (num_nonnulls(split_from_document_id, split_index) <> 1);

-- ── Workflow state ─────────────────────────────────────────────────────────
-- These were keywords in v1 only because the PDF keyword field was the sole
-- place to put anything. They are decisions about a document rather than
-- descriptions of it, and they were polluting a controlled vocabulary the AI
-- picks from — a model choosing `needs-deleting` from page imagery was noise.
alter table pdf_documents
  add column if not exists marked_for_deletion boolean not null default false,
  add column if not exists split_not_needed    boolean not null default false;

comment on column pdf_documents.marked_for_deletion is
  'Replaces the needs-deleting keyword.';
comment on column pdf_documents.split_not_needed is
  'Replaces the no-split-needed keyword: legitimately multi-page, leave alone.';
