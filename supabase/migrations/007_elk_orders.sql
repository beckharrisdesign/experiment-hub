-- Etsy Listing Kit — one-time paid orders (experiment: etsy-listing-kit)
-- One row per checkout attempt. Stripe webhook is the source of truth for payment.
-- Idempotency: unique constraints on stripe_session_id and stripe_event_id.

create table if not exists public.elk_orders (
  id                uuid primary key default gen_random_uuid(),
  experiment_id     text not null default 'etsy-listing-kit',
  status            text not null default 'created'
                      check (status in ('created','checkout_started','paid','processing',
                                        'fulfilled','failed','refunded','partially_refunded')),
  -- Stripe linkage (metadata-based, no user account)
  stripe_session_id text unique,
  stripe_event_id   text unique,               -- last processed event (idempotency)
  amount_total      integer,                    -- minor units (cents)
  currency          text default 'usd',
  livemode          boolean default false,      -- distinguishes test vs live payments
  refunded_total    integer not null default 0, -- minor units refunded
  customer_email    text,
  -- fulfillment
  input_ref         text,                       -- private storage path of uploaded design
  output_ref        text,                       -- private storage path of generated zip
  fulfilled_at      timestamptz,
  -- attribution (persisted through Checkout)
  utm_source        text,
  utm_medium        text,
  utm_campaign      text,
  utm_content       text,
  utm_term          text,
  click_id          text,                       -- gclid / fbclid
  landing_path      text,
  -- lifecycle
  created_at        timestamptz not null default now(),
  paid_at           timestamptz,
  updated_at        timestamptz not null default now()
);

create index if not exists elk_orders_experiment_paid_idx
  on public.elk_orders (experiment_id, paid_at)
  where status in ('paid','processing','fulfilled','partially_refunded');

create index if not exists elk_orders_session_idx on public.elk_orders (stripe_session_id);

-- Row Level Security: locked down. No anon/authenticated access.
-- Writes happen only via the service-role key (webhook + server routes), which bypasses RLS.
alter table public.elk_orders enable row level security;

-- Explicitly deny all client roles (no policies = deny under RLS; stated for clarity/audit).
revoke all on public.elk_orders from anon, authenticated;

comment on table public.elk_orders is
  'Etsy Listing Kit one-time orders. RLS on, no client policies: service-role only. Stripe webhook is payment source of truth.';
