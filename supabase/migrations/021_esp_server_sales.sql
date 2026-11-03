-- Estate Sale Planner — sales and their photos saved on the server
-- (openspec/changes/esp-server-sales, design D2).
--
-- Safari deletes all of a site's browser storage after 7 days of use without a
-- visit, so a sale kept only on the phone can vanish. These tables make the
-- server the copy of record; the phone becomes a cache.
--
-- A STOPGAP: a sale belongs to a device (device_hash = sha256 of a server-set
-- cookie, never the cookie itself) until sign-in (review queue #50) fills
-- owner_id. Claiming is then an update, not a data move.
--
-- esp_sales: one row per sale, the whole Session JSON, newest version wins.
-- esp_sale_photos: where each 1600 px original lives in the esp-photos bucket.
--
-- RLS on, no client policies: service-role only, like 016, 019 and 020.

create table if not exists public.esp_sales (
  id           text primary key,                  -- the esp_… session id
  device_hash  text not null,                     -- sha256(esp-device cookie), hex
  owner_id     uuid,                              -- filled by sign-in (#50); null until then
  version      bigint not null,                   -- device clock in ms, always rising
  session      jsonb not null,                    -- the Session as the device holds it
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists esp_sales_device_updated_idx
  on public.esp_sales (device_hash, updated_at desc);

create table if not exists public.esp_sale_photos (
  sale_id     text not null references public.esp_sales (id) on delete cascade,
  key         text not null,                      -- the device photo-store key
  path        text not null,                      -- object path in the esp-photos bucket
  bytes       integer not null,
  created_at  timestamptz not null default now(),
  primary key (sale_id, key)
);

alter table public.esp_sales enable row level security;
alter table public.esp_sale_photos enable row level security;
revoke all on public.esp_sales from public, anon, authenticated;
revoke all on public.esp_sale_photos from public, anon, authenticated;

comment on table public.esp_sales is
  'Estate Sale Planner sales, the whole Session JSON per row, tied to a device hash until sign-in. RLS on, no client policies: service-role only.';
comment on table public.esp_sale_photos is
  'Estate Sale Planner original photos: where each lives in the private esp-photos bucket. RLS on, no client policies: service-role only.';

-- Save a sale in one statement: insert, or replace only an OLDER version held by
-- the SAME device. Returns true when it wrote. False means either a newer copy is
-- already stored, or the id belongs to another device — the route answers both
-- without saying which.
create or replace function public.esp_save_sale(
  p_id text, p_device_hash text, p_version bigint, p_session jsonb
) returns boolean
language sql
security invoker
set search_path = public
as $$
  with saved as (
    insert into public.esp_sales as s (id, device_hash, version, session)
    values (p_id, p_device_hash, p_version, p_session)
    on conflict (id) do update
      set version = excluded.version, session = excluded.session, updated_at = now()
      where s.version < excluded.version and s.device_hash = excluded.device_hash
    returning 1
  )
  select exists (select 1 from saved);
$$;

revoke all on function public.esp_save_sale(text, text, bigint, jsonb) from public, anon, authenticated;

-- The private bucket the originals live in. Never public: the app reads photos
-- through short-lived signed URLs, handed out only to the owning device.
insert into storage.buckets (id, name, public)
values ('esp-photos', 'esp-photos', false)
on conflict (id) do nothing;
