-- Estate Sale Planner — sold-price checks kicked off from the item screen
-- (openspec/changes/estate-sale-planner-sold-comps, design D23).
--
-- Lookups no longer run on their own. Each check is a click, limited to one per
-- item per device per 24 hours, and everything that went into it is kept here so
-- reopening the item shows it again with no provider or model call.
--
-- esp_comps_checks: one row per completed check ("ok" or "too-few"). A lookup that
--   couldn't run saves nothing and doesn't use up the day; its reason is on the
--   cost row. `detail` is the CompsCheck as the screen shows it: what the check was
--   given, the search, models, counts, the reason, the result, and every source.
--
-- A STOPGAP like esp_sales (021): a check belongs to a device (device_hash =
-- sha256 of the esp-device cookie) until sign-in (review queue #50). No foreign key
-- to esp_sales: a sale can be checked before its first save reaches the server.
--
-- RLS on, no client policies: service-role only, like 016, 019, 020 and 021.

create table if not exists public.esp_comps_checks (
  id           uuid primary key default gen_random_uuid(),
  device_hash  text not null,                   -- sha256(esp-device cookie), hex
  sale_id      text not null,                   -- the esp_… session id
  item_id      text not null,                   -- the item within that sale
  checked_at   timestamptz not null,
  status       text not null check (status in ('ok', 'too-few')),
  detail       jsonb not null
);

create index if not exists esp_comps_checks_item_idx
  on public.esp_comps_checks (device_hash, sale_id, item_id, checked_at desc);

alter table public.esp_comps_checks enable row level security;

comment on table public.esp_comps_checks is
  'Estate Sale Planner completed sold-price checks: one per item per device per 24 hours, with everything shown on the item screen. RLS on, no client policies: service-role only.';
