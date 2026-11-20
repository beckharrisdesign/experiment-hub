-- Needs attention: one open exception per document, at rest until resolved.
-- openspec/changes/pdf-metadata-viewer-cloud — task 8.8; design.md D4, D8.
--
-- A failed commit, a conflict, or a vanished file becomes an instance on the
-- dashboard instead of a message that disappears when the page is left (D4).
-- It lives on the document row because there is only ever one per document:
-- "one conflict per document, never a stack" (D8). A further failure replaces
-- it; a successful commit, a discard, or a resolved conflict clears it.
--
-- Written by the application (lib/pdf-attention.ts), always with a WHERE on the
-- document id, so the API role's safeupdate has nothing to refuse (028).

alter table pdf_documents add column if not exists attention_kind text
  check (attention_kind in ('conflict', 'commit_failed', 'file_missing'));
alter table pdf_documents add column if not exists attention_message text;
alter table pdf_documents add column if not exists attention_at timestamptz;

create index if not exists pdf_documents_attention on pdf_documents(attention_kind)
  where attention_kind is not null;
