-- Stage field edits on one PDF document, in one transaction.
-- openspec/changes/pdf-metadata-viewer-cloud — tasks 8.0 and 8.1; design.md D2, D8.
--
-- Three writes have to land together or not at all: the baseline (what the file
-- said when editing started), the staged values, and the history rows that make
-- them pending. Done as separate client calls, a failure between them leaves a
-- staged value with no history row — invisible to has_pending_edits, so it would
-- never be committed and never be flagged.
--
-- `edits` carries only the fields being changed: { title?, subject?, author?,
-- keywords? }, with JSON null meaning "clear this field".
--
-- `baseline` is { revision, embedded: { title, subject, author, keywords,
-- pageCount } }, read from Drive by the caller. It is required when nothing is
-- pending and ignored when something is: while edits are pending the baseline
-- is never re-captured, because doing so silently would hide a change made in
-- Drive (design.md D8, "Inspection never re-baselines").

create or replace function pdf_stage_edits(doc uuid, edits jsonb, baseline jsonb default null)
returns jsonb
language plpgsql
as $$
declare
  d pdf_documents%rowtype;
  emb jsonb;
  f text;
  old_v jsonb;
  new_v jsonb;
  changed integer := 0;
  baselined boolean := false;
begin
  select * into d from pdf_documents
   where id = doc and deleted_at is null
   for update;
  if not found then
    raise exception 'pdf document % not found', doc using errcode = 'P0002';
  end if;

  if not d.has_pending_edits then
    if baseline is null or baseline->'embedded' is null then
      raise exception 'baseline required: nothing is pending on %', doc
        using errcode = '22023';
    end if;
    emb := baseline->'embedded';
    update pdf_documents set
      file_snapshot          = coalesce(file_snapshot, '{}'::jsonb)
                               || jsonb_build_object('embedded', emb),
      drive_head_revision_id = baseline->>'revision',
      title                  = emb->>'title',
      subject                = emb->>'subject',
      author                 = emb->>'author',
      keywords               = coalesce(
                                 array(select jsonb_array_elements_text(emb->'keywords')),
                                 '{}'),
      page_count             = (emb->>'pageCount')::integer,
      updated_at             = now()
     where id = doc
    returning * into d;
    baselined := true;
  end if;

  foreach f in array array['title', 'subject', 'author', 'keywords'] loop
    if edits ? f then
      new_v := edits->f;
      old_v := coalesce(
        case f
          when 'title'   then to_jsonb(d.title)
          when 'subject' then to_jsonb(d.subject)
          when 'author'  then to_jsonb(d.author)
          else                to_jsonb(d.keywords)
        end,
        'null'::jsonb);
      if new_v is distinct from old_v then
        insert into pdf_document_history (document_id, field, old_value, new_value, change_type)
        values (doc, f, old_v, new_v, 'stage');
        changed := changed + 1;
      end if;
    end if;
  end loop;

  if changed > 0 then
    update pdf_documents set
      title      = case when edits ? 'title'   then edits->>'title'   else title   end,
      subject    = case when edits ? 'subject' then edits->>'subject' else subject end,
      author     = case when edits ? 'author'  then edits->>'author'  else author  end,
      keywords   = case when edits ? 'keywords'
                        then coalesce(array(select jsonb_array_elements_text(edits->'keywords')), '{}')
                        else keywords end,
      updated_at = now()
     where id = doc;
  end if;

  return jsonb_build_object('changed', changed, 'baselined', baselined);
end;
$$;

-- Service role only, like the tables it writes. RLS already refuses every other
-- role at the table, but there is no reason to expose the entry point.
revoke all on function pdf_stage_edits(uuid, jsonb, jsonb) from public, anon, authenticated;
