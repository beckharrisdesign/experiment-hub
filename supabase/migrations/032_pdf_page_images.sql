-- Keep each document's drawn pages, privately, so opening one doesn't redraw it.
-- openspec/changes/pdf-metadata-viewer-cloud — task 7f; design.md D14.
--
-- The images live in a private bucket with no storage policies, so row level
-- security lets nobody but the service role read or write them; the hub serves
-- them through its own session-gated route and never signs a URL for one.
--
-- This table says which images belong to which version of a document. A page
-- set is the images of one version's pages (objects `<set_id>/<page>.jpg`). A
-- commit from the hub changes only a file's metadata, so the new revision keeps
-- the same set: two rows may share a set_id, and images are deleted only once
-- no row uses them.
--
-- page_count is null when pdf.js couldn't draw the file (drawn_at is then set,
-- so the sync doesn't try it every hour). drawn_at is null while pages are
-- still missing.

create table if not exists pdf_page_sets (
  document_id    uuid        not null references pdf_documents (id) on delete cascade,
  drive_revision text        not null,
  set_id         uuid        not null default gen_random_uuid(),
  page_count     integer     check (page_count > 0),
  drawn_at       timestamptz,
  created_at     timestamptz not null default now(),
  primary key (document_id, drive_revision)
);

create index if not exists pdf_page_sets_set_id on pdf_page_sets (set_id);

alter table pdf_page_sets enable row level security;
revoke all on table pdf_page_sets from public, anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pdf-pages', 'pdf-pages', false, 5242880, array['image/jpeg'])
on conflict (id) do nothing;
