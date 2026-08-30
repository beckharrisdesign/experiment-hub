-- elk-listing-evaluation (design decision 5): persist evaluations so the
-- funnel read (evaluation-starts → kit conversions) doesn't depend on GA4
-- alone. Listing id + scores + timestamp only — no buyer or account data.
create table if not exists public.elk_evaluations (
  id uuid primary key default gen_random_uuid(),
  listing_id bigint not null,
  required_pass boolean not null,
  recommended_in_use integer not null,
  state text not null check (state in ('gaps', 'full')),
  recommendation_keys text[] not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists elk_evaluations_listing_idx
  on public.elk_evaluations (listing_id, created_at desc);

-- Server-only table (service-role writes from the evaluate route); RLS on
-- with no policies means anon/authenticated cannot read or write.
alter table public.elk_evaluations enable row level security;
