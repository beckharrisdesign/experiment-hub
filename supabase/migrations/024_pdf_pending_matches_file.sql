-- Pending means "differs from what the file said", not "edited since commit".
-- openspec/changes/pdf-metadata-viewer-cloud — design.md D2 (amended 2026-11-20).
--
-- Migration 010 defined has_pending_edits as "a stage history row exists after
-- committed_at". An edit undone by hand (a field typed back to the file's own
-- value, a keyword removed again) still left a stage row, so the dashboard kept
-- calling the document pending while the detail page showed nothing to write,
-- and a commit would have rewritten the file with no change.
--
-- The flag is now computed from the row itself: true when the staged title,
-- subject, author or keyword set differs from file_snapshot.embedded, the
-- baseline captured on first edit (migration 023). A row with no baseline has
-- never been edited and is never pending. Keywords compare as a set, matching
-- the detail page's added/removed count.
--
-- History stays the full record of every change; it no longer decides pending.
-- The flag is still written only by the database, now by one BEFORE trigger on
-- the row instead of two triggers reaching across tables.

create or replace function pdf_documents_compute_pending()
returns trigger
language plpgsql
as $$
declare
  emb jsonb := new.file_snapshot->'embedded';
begin
  new.has_pending_edits := emb is not null and (
       new.title   is distinct from nullif(emb->>'title', '')
    or new.subject is distinct from nullif(emb->>'subject', '')
    or new.author  is distinct from nullif(emb->>'author', '')
    or array(select k from unnest(new.keywords) k order by k)
       is distinct from
       array(select k from jsonb_array_elements_text(coalesce(emb->'keywords', '[]'::jsonb)) k order by k)
  );
  return new;
end;
$$;

drop trigger if exists pdf_documents_compute_pending on pdf_documents;
create trigger pdf_documents_compute_pending
  before insert or update on pdf_documents
  for each row execute function pdf_documents_compute_pending();

-- The history-driven triggers from 010 would now fight the row trigger.
drop trigger if exists pdf_history_set_pending on pdf_document_history;
drop trigger if exists pdf_documents_committed_at_changed on pdf_documents;
drop function if exists pdf_history_set_pending();
drop function if exists pdf_documents_committed_at_changed();
drop function if exists pdf_documents_recompute_pending(uuid);

-- The maintenance task (task 3.4) keeps its name and contract: recompute every
-- row and return how many were touched. A no-op update is enough, because the
-- BEFORE trigger recomputes the flag on every write.
create or replace function pdf_documents_rebuild_pending()
returns integer
language sql
as $$
  with updated as (
    update pdf_documents set has_pending_edits = has_pending_edits
    returning 1
  )
  select count(*)::integer from updated;
$$;

-- Bring existing rows under the new rule.
select pdf_documents_rebuild_pending();
