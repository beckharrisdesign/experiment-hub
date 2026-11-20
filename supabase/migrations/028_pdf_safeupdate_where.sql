-- Give every UPDATE in the PDF functions a WHERE clause.
-- openspec/changes/pdf-metadata-viewer-cloud — fixes migrations 024 and 026.
--
-- The API's `authenticator` role preloads `safeupdate`, which rejects any
-- UPDATE without a WHERE clause, including one inside a function called
-- through PostgREST. Two functions updated without one:
--
--   - pdf_import_folder (026) updates the single-row pdf_drive_grant. Every
--     folder choice failed with "Could not store document references", and
--     nothing was written, because the error rolled the whole call back.
--   - pdf_documents_rebuild_pending (024) updates every row. Its apply-time run
--     passed because migrations do not go through `authenticator`; called from
--     the app it would have failed the same way.
--
-- Both are otherwise unchanged. Testing these functions from the SQL console
-- missed it because that session does not load safeupdate; tests/lib/
-- migrations-safeupdate.test.ts now checks every migration's UPDATEs instead.

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
         updated_at = now()
   where id;  -- the singleton row (`id boolean primary key check (id)`)
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

create or replace function pdf_documents_rebuild_pending()
returns integer
language sql
as $$
  with updated as (
    update pdf_documents set has_pending_edits = has_pending_edits
     where id is not null  -- every row; the WHERE is for safeupdate
    returning 1
  )
  select count(*)::integer from updated;
$$;
