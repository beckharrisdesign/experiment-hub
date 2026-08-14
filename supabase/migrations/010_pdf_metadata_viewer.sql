-- pdf-metadata-viewer, hosted single-tenant instance.
-- openspec/changes/pdf-metadata-viewer-cloud — see design.md D1, D2, D8.
--
-- The database is the working store; the PDF in Drive stays the durable
-- artifact and is written only on explicit commit. Bytes are never copied here,
-- only referenced.

-- A CHECK constraint cannot contain a subquery, so the per-element test lives
-- in an immutable function the constraint can call.
create or replace function pdf_keywords_are_clean(kw text[])
returns boolean language sql immutable as $$
  select coalesce(bool_and(k ~ '^[^\s]+$'), true) from unnest(kw) k;
$$;

-- ── Documents ───────────────────────────────────────────────────────────────
-- One row per Drive file, holding the CURRENT (staged) values the user edits.
create table if not exists pdf_documents (
  id                     uuid        default gen_random_uuid() primary key,

  -- The reference. Bytes stay in Drive.
  drive_file_id          text        not null unique,

  -- Captured together at read time and compared at commit, so the snapshot and
  -- the revision it describes can never disagree (design.md D8).
  drive_head_revision_id text,
  file_snapshot          jsonb,

  filename               text,
  title                  text,
  subject                text,
  author                 text,

  -- Ordered list, not a delimited string. A keyword may not contain
  -- whitespace: pdf-lib joins on a space when writing to the file, so a
  -- keyword with a space merges into its neighbour and cannot be recovered by
  -- any reader (design.md D0).
  keywords               text[]      not null default '{}',
  constraint pdf_documents_keywords_no_whitespace
    check (pdf_keywords_are_clean(keywords)),

  page_count             integer,

  -- Last successful write into the PDF. Null means never committed.
  committed_at           timestamptz,

  -- Cache, maintained only by trigger — see below.
  has_pending_edits      boolean     not null default false,

  -- Soft delete, so history outlives the file.
  deleted_at             timestamptz,

  created_at             timestamptz default now(),
  updated_at             timestamptz default now()
);

-- ── History ────────────────────────────────────────────────────────────────
-- Append-only, one row per field change. Uncapped: v1 truncated to 1000
-- entries only because it was rewriting a single JSON file.
create table if not exists pdf_document_history (
  id          bigserial   primary key,
  document_id uuid        not null references pdf_documents(id),
  field       text        not null
              check (field in ('title','subject','author','keywords','filename')),
  old_value   jsonb,
  new_value   jsonb,
  change_type text        not null
              check (change_type in ('stage','commit','rename','split','delete')),
  changed_at  timestamptz not null default now()
);

-- Wanted by both the per-document history view and the repair statement below.
create index if not exists pdf_document_history_document_changed
  on pdf_document_history(document_id, changed_at);

-- ── Drive grant ────────────────────────────────────────────────────────────
-- Single tenant: exactly one row, enforced rather than assumed.
create table if not exists pdf_drive_grant (
  id                   boolean     primary key default true
                       constraint pdf_drive_grant_singleton check (id),
  google_account_email text,
  google_sub           text,
  access_token         text,
  refresh_token        text,
  expires_at           timestamptz,
  scope                text,
  updated_at           timestamptz default now()
);

-- ── has_pending_edits ──────────────────────────────────────────────────────
-- History is the record. This column is a cache so the document list does not
-- run a correlated subquery per row over a corpus in the thousands, and so the
-- state is subscribable. The application never writes it — triggers do, which
-- is what stops it becoming a second source of truth (design.md D2).
create or replace function pdf_documents_recompute_pending(doc uuid)
returns void language sql as $$
  update pdf_documents d
     set has_pending_edits = exists (
           select 1 from pdf_document_history h
            where h.document_id = d.id
              and h.change_type = 'stage'
              and h.changed_at > coalesce(d.committed_at, '-infinity'::timestamptz)
         )
   where d.id = doc;
$$;

create or replace function pdf_history_set_pending()
returns trigger language plpgsql as $$
begin
  if new.change_type = 'stage' then
    update pdf_documents set has_pending_edits = true where id = new.document_id;
  end if;
  return new;
end;
$$;

drop trigger if exists pdf_history_set_pending on pdf_document_history;
create trigger pdf_history_set_pending
  after insert on pdf_document_history
  for each row execute function pdf_history_set_pending();

create or replace function pdf_documents_committed_at_changed()
returns trigger language plpgsql as $$
begin
  perform pdf_documents_recompute_pending(new.id);
  return new;
end;
$$;

drop trigger if exists pdf_documents_committed_at_changed on pdf_documents;
create trigger pdf_documents_committed_at_changed
  after update of committed_at on pdf_documents
  for each row execute function pdf_documents_committed_at_changed();

-- The tie-breaker if cache and record ever disagree. Shipped as a callable
-- function rather than living only in a design document.
create or replace function pdf_documents_rebuild_pending()
returns integer language sql as $$
  with updated as (
    update pdf_documents d
       set has_pending_edits = exists (
             select 1 from pdf_document_history h
              where h.document_id = d.id
                and h.change_type = 'stage'
                and h.changed_at > coalesce(d.committed_at, '-infinity'::timestamptz)
           )
     returning 1
  )
  select count(*)::integer from updated;
$$;

-- ── RLS ────────────────────────────────────────────────────────────────────
-- On with no policies: anon/publishable keys are denied by default and the
-- service-role client used by the API routes bypasses RLS. Do not add a
-- permissive `using (true)` policy without a `to` clause — that grants PUBLIC
-- full read/write. pdf_drive_grant holds refresh tokens, so this is a hard
-- requirement here rather than hygiene.
alter table pdf_documents        enable row level security;
alter table pdf_document_history enable row level security;
alter table pdf_drive_grant      enable row level security;

drop policy if exists "Service role full access" on pdf_documents;
drop policy if exists "Service role full access" on pdf_document_history;
drop policy if exists "Service role full access" on pdf_drive_grant;
