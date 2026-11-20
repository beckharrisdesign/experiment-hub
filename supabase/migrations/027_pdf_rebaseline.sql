-- Resolve a conflict: move the baseline to Drive's current version, and stage
-- the values the user settled on, in one transaction.
-- openspec/changes/pdf-metadata-viewer-cloud — task 8.4; design.md D8.
--
-- This is the explicit re-baselining D8 requires and never does silently: it
-- runs only from the Compare page, after the user chose an outcome. It stays
-- separate from pdf_stage_edits (023), which refuses to touch the baseline while
-- edits are pending; that refusal is what makes this the only way through.
--
-- `expected_revision` is the revision the conflict was found against (the one
-- the staged edits were made from). If the row no longer names it, something
-- else resolved or committed meanwhile, and nothing changes (40001).
--
-- `baseline` is { revision, embedded } as read from Drive just now; `values` is
-- { title, subject, author, keywords }, all four. Each staged value that
-- changes gets a `stage` history row, so the resolution is in the record.
-- Pending is recomputed by the row trigger (024) against the new baseline.

create or replace function pdf_rebaseline(
  doc uuid,
  expected_revision text,
  baseline jsonb,
  vals jsonb
)
returns jsonb
language plpgsql
as $$
declare
  d pdf_documents%rowtype;
  emb jsonb := baseline->'embedded';
  f text;
  old_v jsonb;
  new_v jsonb;
  changed integer := 0;
begin
  if emb is null then
    raise exception 'baseline.embedded is required' using errcode = '22023';
  end if;

  select * into d from pdf_documents
   where id = doc and deleted_at is null
   for update;
  if not found then
    raise exception 'pdf document % not found', doc using errcode = 'P0002';
  end if;
  if d.drive_head_revision_id is distinct from expected_revision then
    raise exception 'pdf document % is at revision %, not %', doc, d.drive_head_revision_id, expected_revision
      using errcode = '40001';
  end if;

  foreach f in array array['title', 'subject', 'author', 'keywords'] loop
    old_v := coalesce(
      case f
        when 'title'   then to_jsonb(d.title)
        when 'subject' then to_jsonb(d.subject)
        when 'author'  then to_jsonb(d.author)
        else                to_jsonb(d.keywords)
      end,
      'null'::jsonb);
    new_v := coalesce(vals->f, case when f = 'keywords' then '[]'::jsonb else 'null'::jsonb end);
    if new_v is distinct from old_v then
      insert into pdf_document_history (document_id, field, old_value, new_value, change_type)
      values (doc, f, old_v, new_v, 'stage');
      changed := changed + 1;
    end if;
  end loop;

  update pdf_documents set
    file_snapshot          = coalesce(file_snapshot, '{}'::jsonb) || jsonb_build_object('embedded', emb),
    drive_head_revision_id = baseline->>'revision',
    page_count             = coalesce((emb->>'pageCount')::integer, page_count),
    title                  = vals->>'title',
    subject                = vals->>'subject',
    author                 = vals->>'author',
    keywords               = coalesce(array(select jsonb_array_elements_text(coalesce(vals->'keywords', '[]'::jsonb))), '{}'),
    updated_at             = now()
   where id = doc;

  return jsonb_build_object('changed', changed);
end;
$$;

revoke all on function pdf_rebaseline(uuid, text, jsonb, jsonb) from public, anon, authenticated;
