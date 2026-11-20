-- Record a commit that has already been written to Drive.
-- openspec/changes/pdf-metadata-viewer-cloud — task 8.2; design.md D4 step 4, D2.
--
-- Called after the upload succeeds, with what the new file actually says
-- (`embedded`, read back from the bytes just uploaded) and the revision Drive
-- assigned. In one transaction it:
--
--   - writes one `commit` history row per field the file changed, old value
--     being the previous baseline and new value what the file now says;
--   - moves the baseline (file_snapshot.embedded) and drive_head_revision_id to
--     the new version, and sets committed_at.
--
-- Pending is not written here: the row trigger from migration 024 recomputes it
-- against the new baseline. If the user staged another edit while the upload was
-- running, that edit differs from what was written and correctly stays pending.
--
-- `expected_revision` is the revision the commit started from. If the row no
-- longer names it, something else moved the baseline mid-commit, and nothing is
-- recorded (SQLSTATE 40001) rather than recording over it.

create or replace function pdf_record_commit(
  doc uuid,
  expected_revision text,
  new_revision text,
  embedded jsonb
)
returns jsonb
language plpgsql
as $$
declare
  d pdf_documents%rowtype;
  old_emb jsonb;
  f text;
  old_v jsonb;
  new_v jsonb;
  changed integer := 0;
begin
  select * into d from pdf_documents
   where id = doc and deleted_at is null
   for update;
  if not found then
    raise exception 'pdf document % not found', doc using errcode = 'P0002';
  end if;
  if d.drive_head_revision_id is distinct from expected_revision then
    raise exception 'pdf document % moved to revision % during commit', doc, d.drive_head_revision_id
      using errcode = '40001';
  end if;

  old_emb := coalesce(d.file_snapshot->'embedded', '{}'::jsonb);
  foreach f in array array['title', 'subject', 'author', 'keywords'] loop
    old_v := coalesce(old_emb->f, case when f = 'keywords' then '[]'::jsonb else 'null'::jsonb end);
    new_v := coalesce(embedded->f, case when f = 'keywords' then '[]'::jsonb else 'null'::jsonb end);
    if new_v is distinct from old_v then
      insert into pdf_document_history (document_id, field, old_value, new_value, change_type)
      values (doc, f, old_v, new_v, 'commit');
      changed := changed + 1;
    end if;
  end loop;

  update pdf_documents set
    file_snapshot          = coalesce(file_snapshot, '{}'::jsonb)
                             || jsonb_build_object('embedded', embedded),
    drive_head_revision_id = new_revision,
    page_count             = coalesce((embedded->>'pageCount')::integer, page_count),
    committed_at           = now(),
    updated_at             = now()
   where id = doc;

  return jsonb_build_object('changed', changed);
end;
$$;

revoke all on function pdf_record_commit(uuid, text, text, jsonb) from public, anon, authenticated;
