-- Save what a document's file says, the first time it is read.
-- openspec/changes/pdf-metadata-viewer-cloud — design.md D8.
--
-- Reading a PDF's embedded title, subject, author, keywords and page count
-- means downloading the whole file. Until a document's first edit there is no
-- baseline to show instead, so every visit to a large unedited scan downloaded
-- it again. This keeps the last read under file_snapshot.read, tagged with the
-- Drive revision it came from:
--
--   { "revision": "...", "title": ..., "subject": ..., "author": ...,
--     "keywords": [...], "pageCount": n }
--
-- The detail page uses it only while Drive still reports that revision, so a
-- file changed in Drive is read again. It is a cache, not a baseline: it is
-- never compared at commit, and the pending trigger (024) reads only
-- file_snapshot.embedded, so writing it changes no document's pending state.
--
-- One merge, not a read-modify-write, so it can't drop a baseline that a
-- staged edit or a commit wrote at the same moment. Every other write to
-- file_snapshot merges too (023, 025, 027, 028), so a saved read survives them.
-- The UPDATE names its row, so the API role's safeupdate has nothing to refuse
-- (028).

create or replace function pdf_record_file_read(doc uuid, revision text, embedded jsonb)
returns void
language sql
as $$
  update pdf_documents
     set file_snapshot = coalesce(file_snapshot, '{}'::jsonb)
                         || jsonb_build_object('read', embedded || jsonb_build_object('revision', revision))
   where id = doc
     and deleted_at is null;
$$;

revoke all on function pdf_record_file_read(uuid, text, jsonb) from public, anon, authenticated;
