-- Record a split whose output files are already in Drive.
-- openspec/changes/pdf-metadata-viewer-cloud — tasks 7b.2, 7b.3; design.md D10, D11.
--
-- Called after every part has been uploaded as a new Drive file. In one
-- transaction it:
--
--   - inserts a document row per part, in the original's folder, linked back by
--     split_from_document_id and ordered by split_index. Each part's baseline
--     (file_snapshot.embedded) is what its uploaded bytes say, and its fields
--     match it, so the pending trigger (024) leaves it clean;
--   - writes one `split` history row per part (field `filename`, the original's
--     name to the part's), so a part's history starts where it came from;
--   - marks the original superseded. Its row, file and history all stay (7b.3).
--
-- Nothing is recorded if the original was already split (SQLSTATE 55000) or if
-- its baseline moved since the split read it (40001). Every UPDATE names its
-- row, so the API role's safeupdate has nothing to refuse (028).
--
-- `outputs` is [{ driveFileId, filename, revision, index, embedded }], where
-- embedded is { title, subject, author, keywords, pageCount }.

create or replace function pdf_record_split(
  doc uuid,
  expected_revision text,
  outputs jsonb
)
returns jsonb
language plpgsql
as $$
declare
  d pdf_documents%rowtype;
  o jsonb;
  e jsonb;
  new_id uuid;
  ids uuid[] := '{}';
begin
  select * into d from pdf_documents
   where id = doc and deleted_at is null
   for update;
  if not found then
    raise exception 'pdf document % not found', doc using errcode = 'P0002';
  end if;
  if d.superseded_at is not null then
    raise exception 'pdf document % was already split', doc using errcode = '55000';
  end if;
  if d.drive_head_revision_id is distinct from expected_revision then
    raise exception 'pdf document % moved to revision % during split', doc, d.drive_head_revision_id
      using errcode = '40001';
  end if;
  if jsonb_typeof(outputs) <> 'array' or jsonb_array_length(outputs) < 2 then
    raise exception 'a split needs at least two parts' using errcode = '22023';
  end if;

  for o in select value from jsonb_array_elements(outputs) loop
    e := coalesce(o->'embedded', '{}'::jsonb);
    insert into pdf_documents (
      drive_file_id, filename, drive_folder_id, drive_head_revision_id, file_snapshot,
      title, subject, author, keywords, page_count,
      split_from_document_id, split_index, committed_at, updated_at
    ) values (
      o->>'driveFileId',
      o->>'filename',
      d.drive_folder_id,
      o->>'revision',
      jsonb_build_object('embedded', e),
      e->>'title',
      e->>'subject',
      e->>'author',
      coalesce(array(select jsonb_array_elements_text(coalesce(e->'keywords', '[]'::jsonb))), '{}'),
      (e->>'pageCount')::integer,
      doc,
      (o->>'index')::integer,
      now(),
      now()
    )
    returning id into new_id;

    insert into pdf_document_history (document_id, field, old_value, new_value, change_type)
    values (new_id, 'filename', to_jsonb(d.filename), to_jsonb(o->>'filename'), 'split');

    ids := ids || new_id;
  end loop;

  update pdf_documents set
    superseded_at    = now(),
    split_not_needed = false,
    updated_at       = now()
   where id = doc;

  return jsonb_build_object('outputs', to_jsonb(ids));
end;
$$;

revoke all on function pdf_record_split(uuid, text, jsonb) from public, anon, authenticated;
