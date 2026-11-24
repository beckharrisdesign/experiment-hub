-- Values worked out from a document's own text, waiting to be accepted or dismissed.
-- openspec/changes/pdf-metadata-viewer-cloud — task 7i; design.md D16.
--
-- A table of their own, not columns on pdf_documents: what counts, commits and
-- discards edits reads that row, and must not be able to see these. Accepting one
-- is an ordinary edit. dismissed_at keeps a dismissal for that version of the
-- file, so the hourly sync doesn't make it again.
--
-- Row level security with no policies, like the text they come from (033).

create table if not exists pdf_prefills (
  document_id    uuid        not null references pdf_documents (id) on delete cascade,
  drive_revision text        not null,
  title          text,
  keywords       text[]      not null default '{}',
  -- Where each value came from: "title", and each keyword by name.
  why            jsonb       not null default '{}'::jsonb,
  made_at        timestamptz not null default now(),
  dismissed_at   timestamptz,
  primary key (document_id, drive_revision)
);

alter table pdf_prefills enable row level security;
revoke all on table pdf_prefills from public, anon, authenticated;
