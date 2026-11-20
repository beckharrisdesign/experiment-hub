-- Remember which Drive folder the archive is showing, and import into it safely.
-- openspec/changes/pdf-metadata-viewer-cloud — design.md D9a, D8.
--
-- Until now the folder chosen in the Picker was used once, for the import, and
-- forgotten: nothing could show it or change it. It is now stored on the Drive
-- connection (one folder at a time), and each document records the folder it
-- was imported from, so the dashboard can show that folder's documents only.
-- Documents from a folder no longer chosen keep their rows and history.
--
-- The import also moves into one function, because the client-side upsert it
-- replaces overwrote file_snapshot and drive_head_revision_id on every
-- re-import. On a document being edited that erased the baseline captured on
-- first edit (migration 023), which silently dropped its pending state and
-- re-pinned it to a revision its edits were never compared against: the silent
-- re-baselining design.md D8 forbids. A re-import now merges Drive's listing
-- keys into the snapshot, keeps `embedded`, and moves the revision only on a
-- document with no baseline.

alter table pdf_drive_grant add column if not exists folder_id   text;
alter table pdf_drive_grant add column if not exists folder_name text;
alter table pdf_documents   add column if not exists drive_folder_id text;

create index if not exists pdf_documents_drive_folder on pdf_documents(drive_folder_id);

-- `files` is [{ id, name, headRevisionId, snapshot }], as listPdfsInFolder returns.
create or replace function pdf_import_folder(folder_id text, folder_name text, files jsonb)
returns jsonb
language plpgsql
as $$
declare
  inserted integer;
  total integer;
begin
  update pdf_drive_grant
     set folder_id = pdf_import_folder.folder_id,
         folder_name = pdf_import_folder.folder_name,
         updated_at = now();
  if not found then
    raise exception 'Drive is not connected' using errcode = 'P0002';
  end if;

  with incoming as (
    select f->>'id' as drive_file_id,
           f->>'name' as filename,
           f->>'headRevisionId' as revision,
           coalesce(f->'snapshot', '{}'::jsonb) - 'embedded' as listing
      from jsonb_array_elements(files) f
  ),
  upserted as (
    insert into pdf_documents as d
           (drive_file_id, filename, drive_folder_id, drive_head_revision_id, file_snapshot, updated_at)
    select drive_file_id, filename, pdf_import_folder.folder_id, revision, listing, now()
      from incoming
    on conflict (drive_file_id) do update set
      filename               = excluded.filename,
      drive_folder_id        = excluded.drive_folder_id,
      file_snapshot          = coalesce(d.file_snapshot, '{}'::jsonb) || excluded.file_snapshot,
      drive_head_revision_id = case when d.file_snapshot ? 'embedded'
                                    then d.drive_head_revision_id
                                    else excluded.drive_head_revision_id end,
      updated_at             = now()
    returning (xmax = 0) as is_insert
  )
  select count(*) filter (where is_insert), count(*) into inserted, total from upserted;

  return jsonb_build_object('inserted', inserted, 'total', total);
end;
$$;

revoke all on function pdf_import_folder(text, text, jsonb) from public, anon, authenticated;
