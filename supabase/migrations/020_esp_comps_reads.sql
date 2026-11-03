-- Estate Sale Planner — the same item gets the same answer
-- (openspec/changes/estate-sale-planner-sold-comps, design D22).
--
-- The first keyed lookups (2026-11-03) priced one Lodge skillet at $50–$100 and,
-- a minute later from another sale, "too few": the query step reworded the
-- search, which missed the saved result, and the comps pass kept 3 of 50 sales
-- one run and 0 the next.
--
-- esp_comps_reads: per item subject (normalized name | mark | lot size), the
--   search that was written and which saved sales were kept, against which
--   esp_comps fetch. A repeat lookup reuses all of it: no model call, no
--   provider call, the same band. The search is reused even after the sales
--   are refetched, so the 90-day store keeps hitting.
--
-- RLS on, no client policies: service-role only, like esp_comps (019).

create table if not exists public.esp_comps_reads (
  id                uuid primary key default gen_random_uuid(),
  provider          text not null,                   -- compsapi
  subject           text not null,                   -- subjectKey(): name|mark|lot, normalized
  query             text not null,                   -- as written by the query step
  query_norm        text not null,                   -- esp_comps key the read was made against
  comps_fetched_at  timestamptz not null,            -- esp_comps.fetched_at the matches index into
  matches           integer[] not null,              -- indexes into that esp_comps row's results
  reason            text not null,
  model             text,
  read_at           timestamptz not null default now(),
  unique (provider, subject)
);

alter table public.esp_comps_reads enable row level security;
revoke all on public.esp_comps_reads from public, anon, authenticated;

comment on table public.esp_comps_reads is
  'Estate Sale Planner: per item subject, the search written and the sold listings kept, so a repeat lookup gives the same answer. RLS on, no client policies: service-role only.';
