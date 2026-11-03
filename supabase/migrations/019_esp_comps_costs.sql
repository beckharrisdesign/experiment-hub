-- Estate Sale Planner — sold-price lookups and what every call costs
-- (openspec/changes/estate-sale-planner-sold-comps, design D6, D8, D9).
--
-- esp_comps: every sold-listings lookup, saved under its normalized query so a
--   repeat item inside the freshness window (90 days) costs nothing. Over time
--   this is the price database we can't buy today.
-- esp_costs: one row per model call or lookup (walkthrough, re-read, query
--   writing, comps pass, provider lookup), so a room's cost is a GROUP BY,
--   not a guess. Cache hits are rows too, at zero cost.
--
-- RLS on, no client policies: service-role only, like esp_events (016).
-- Writes come from server routes only.

create table if not exists public.esp_comps (
  id            uuid primary key default gen_random_uuid(),
  provider      text not null,                    -- compsapi
  query         text not null,                    -- as written by the query step
  query_norm    text not null,                    -- the cache key (normalizeQuery)
  fetched_at    timestamptz not null default now(),
  results       jsonb not null,                   -- SoldListing[]: title, priceCents, soldAt, url, image
  result_count  integer not null default 0,
  unique (provider, query_norm)
);

create table if not exists public.esp_costs (
  id             uuid primary key default gen_random_uuid(),
  experiment_id  text not null default 'estate-sale-planner',
  session_id     text,                            -- browser session (esp_…)
  sale_id        text,                            -- the sale the call was for
  kind           text not null
                   check (kind in ('walkthrough','reread','query','comps','lookup')),
  provider       text,                            -- openai | anthropic | compsapi | fixture
  model          text,
  input_tokens   integer,
  output_tokens  integer,
  cents          numeric(10,4) not null default 0,
  cache_hit      boolean not null default false,
  ok             boolean not null default true,
  error          text,                            -- not-configured | quota | error: …
  created_at     timestamptz not null default now()
);

create index if not exists esp_costs_experiment_created_idx
  on public.esp_costs (experiment_id, created_at);

alter table public.esp_comps enable row level security;
alter table public.esp_costs enable row level security;
revoke all on public.esp_comps from public, anon, authenticated;
revoke all on public.esp_costs from public, anon, authenticated;

comment on table public.esp_comps is
  'Estate Sale Planner sold-listings lookups by (provider, normalized query). RLS on, no client policies: service-role only.';
comment on table public.esp_costs is
  'Estate Sale Planner per-call cost ledger (model calls and lookups). RLS on, no client policies: service-role only.';
