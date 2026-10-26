-- Record of a migration already applied to Experiment Hub 2.0
-- (ulqdjuiffpazzixnwwso) as version 20261009154446, `create_pin_images`.
-- It went in through the Supabase connector and was never committed.
-- The SQL below is copied verbatim from supabase_migrations.schema_migrations;
-- it is idempotent, so re-running it is harmless.
-- The pin-image edge function and the 14-day cleanup the comment mentions are
-- not in this repo.

create table if not exists public.pin_images (
  id uuid primary key default gen_random_uuid(),
  mime text not null default 'image/jpeg' check (mime in ('image/jpeg','image/png')),
  b64 text not null check (length(b64) < 1400000),
  created_at timestamptz not null default now()
);
comment on table public.pin_images is 'Temporary image hosting for the W&H Pin Builder artifact. Served publicly by the pin-image edge function; rows older than 14 days are deleted.';
alter table public.pin_images enable row level security;
-- no policies: only the service role (edge function) and SQL access can read/write
create index if not exists pin_images_created_at_idx on public.pin_images (created_at);
