-- Record of a migration already applied to Experiment Hub 2.0
-- (ulqdjuiffpazzixnwwso) as version 20260715215913, `etsy_sync_runtime_tables`.
-- It went in through the Supabase connector during the etsy-notion-sync build
-- and was never committed, so the repo could not rebuild these tables.
-- The SQL below is copied verbatim from supabase_migrations.schema_migrations.
-- Do not re-run it against that project: the creates are not idempotent.
-- Numbered 017 because it was recorded after 016; it predates 007 and has no
-- dependency on any other migration here.

-- etsy-notion-sync runtime tables (openspec change: etsy-notion-sync-build)
-- All four tables are service-role only: RLS enabled with NO policies, so
-- anon/authenticated clients are fully blocked; the Actions runner and hub
-- server routes use the service-role key.

create table public.etsy_listing_snapshots (
  id bigint generated always as identity primary key,
  captured_at timestamptz not null,
  etsy_api_version text not null,
  endpoint text not null,
  listing_id bigint not null,
  sku text,
  raw_response jsonb not null,
  parsed jsonb not null,
  previous_record_id bigint references public.etsy_listing_snapshots(id)
);
create index idx_etsy_snapshots_listing_time
  on public.etsy_listing_snapshots (listing_id, captured_at);
create index idx_etsy_snapshots_endpoint_listing
  on public.etsy_listing_snapshots (endpoint, listing_id, id desc);

create table public.etsy_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null,
  finished_at timestamptz,
  status text not null default 'running',
  trigger_source text not null default 'scheduled',
  summary jsonb
);
create index idx_etsy_runs_started on public.etsy_runs (started_at desc);

create table public.etsy_schema_keys (
  endpoint text not null,
  key text not null,
  first_seen_at timestamptz not null,
  sample_value text,
  primary key (endpoint, key)
);

create table public.etsy_tokens (
  id text primary key default 'default',
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Append-only enforcement at the database level (spec: etsy-sync-runtime,
-- "Read-only and append-only guarantees hold server-side"). Snapshots and
-- schema keys are immutable once written; runs may be updated (status
-- transitions running -> ok/error/paused_quota) but never deleted.
create or replace function public.etsy_forbid_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'etsy sync tables are append-only: % on % is not allowed', tg_op, tg_table_name;
end $$;

create trigger etsy_snapshots_append_only
  before update or delete on public.etsy_listing_snapshots
  for each row execute function public.etsy_forbid_mutation();
create trigger etsy_schema_keys_append_only
  before update or delete on public.etsy_schema_keys
  for each row execute function public.etsy_forbid_mutation();
create trigger etsy_runs_no_delete
  before delete on public.etsy_runs
  for each row execute function public.etsy_forbid_mutation();

-- Latest snapshot per listing per endpoint, for the Notion sync step.
create view public.etsy_latest_listing_snapshots
  with (security_invoker = on) as
  select distinct on (endpoint, listing_id) *
  from public.etsy_listing_snapshots
  order by endpoint, listing_id, id desc;

alter table public.etsy_listing_snapshots enable row level security;
alter table public.etsy_runs enable row level security;
alter table public.etsy_schema_keys enable row level security;
alter table public.etsy_tokens enable row level security;

revoke all on public.etsy_listing_snapshots from anon, authenticated;
revoke all on public.etsy_runs from anon, authenticated;
revoke all on public.etsy_schema_keys from anon, authenticated;
revoke all on public.etsy_tokens from anon, authenticated;
revoke all on public.etsy_latest_listing_snapshots from anon, authenticated;
