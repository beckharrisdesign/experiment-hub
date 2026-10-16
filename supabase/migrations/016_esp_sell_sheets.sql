-- Estate Sale Planner — the two tables the validation plan reads from.
--
-- esp_events: every counted exit tap (and checkout start) as a row, so the
--   Propose threshold ("≥ 5 haul-away taps in 14 days") is a query, not a grep
--   of Vercel function logs that expire long before 14 days are up.
-- esp_sheets: the paid Sell Sheet. One per browser session: the Sell list with
--   photos, saved at an unguessable link that survives closing the tab. Stripe
--   webhook is the payment source of truth (same posture as elk_orders, 007).
--
-- RLS on, no client policies: service-role only, like every other experiment
-- table here (006, 007, 009). Writes come from server routes only.

create table if not exists public.esp_events (
  id             uuid primary key default gen_random_uuid(),
  experiment_id  text not null default 'estate-sale-planner',
  session_id     text not null,
  event          text not null,                 -- esp_exit_tap | esp_sheet_checkout
  count          integer,                       -- toss items on an exit tap
  fallback       boolean,                       -- "they don't cover my area"
  via            text,                          -- tel | web
  referral       text,
  metadata       jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists esp_events_experiment_event_idx
  on public.esp_events (experiment_id, event, created_at);

create table if not exists public.esp_sheets (
  id                    uuid primary key default gen_random_uuid(),   -- the shareable link
  experiment_id         text not null default 'estate-sale-planner',
  session_id            text not null unique,                         -- browser session (esp_…); one sheet per session
  status                text not null default 'created'
                          check (status in ('created','checkout_started','paid','refunded')),
  items                 jsonb not null,                               -- Sell list at checkout: name, room, band, reason, confidence, image
  item_count            integer not null default 0,
  walkthrough_at        timestamptz,
  -- Stripe linkage (metadata-based, no user account)
  stripe_session_id     text unique,
  stripe_payment_intent text,
  stripe_event_id       text unique,                                  -- last processed event (idempotency)
  amount_total          integer,
  currency              text default 'usd',
  livemode              boolean default false,
  customer_email        text,
  -- lifecycle
  created_at            timestamptz not null default now(),
  paid_at               timestamptz,
  updated_at            timestamptz not null default now()
);

create index if not exists esp_sheets_paid_idx
  on public.esp_sheets (experiment_id, paid_at)
  where status = 'paid';

alter table public.esp_events enable row level security;
alter table public.esp_sheets enable row level security;
revoke all on public.esp_events from public, anon, authenticated;
revoke all on public.esp_sheets from public, anon, authenticated;

comment on table public.esp_events is
  'Estate Sale Planner counted events (exit taps, checkout starts). RLS on, no client policies: service-role only.';
comment on table public.esp_sheets is
  'Estate Sale Planner paid Sell Sheets. RLS on, no client policies: service-role only. Stripe webhook is payment source of truth.';
