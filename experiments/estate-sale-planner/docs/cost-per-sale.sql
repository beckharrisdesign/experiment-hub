-- Estate Sale Planner — what each sale cost (sold-comps tasks 3.26).
-- Reads esp_costs (supabase/migrations/019_esp_comps_costs.sql). Paste into the
-- Supabase SQL editor for Experiment Hub 2.0. Cents are estimates: tokens × the
-- MODEL_PRICES table in lib/estate-sale-planner/config.ts, and the provider's
-- per-request price for lookups.

-- Per sale: total, and the split by kind. Rows with no sale_id (a first
-- walkthrough, before the sale had an id on the server) are grouped as "(none)".
select
  coalesce(sale_id, '(none)')                                        as sale,
  min(created_at)                                                    as first_call,
  round(sum(cents), 2)                                               as cents_total,
  round(sum(cents) filter (where kind = 'walkthrough'), 2)           as walkthrough,
  round(sum(cents) filter (where kind = 'reread'), 2)                as rereads,
  round(sum(cents) filter (where kind in ('query', 'comps')), 2)     as lookup_model_calls,
  round(sum(cents) filter (where kind = 'lookup'), 2)                as lookups,
  count(*) filter (where kind = 'lookup' and not cache_hit and ok)   as paid_lookups,
  count(*) filter (where kind = 'lookup' and cache_hit)              as cache_hits,
  count(*) filter (where not ok)                                     as failed_or_skipped
from public.esp_costs
where experiment_id = 'estate-sale-planner'
  and created_at > now() - interval '30 days'
group by 1
order by first_call desc;

-- Why lookups didn't run, last 30 days (not-configured, quota, error: …).
select error, count(*)
from public.esp_costs
where experiment_id = 'estate-sale-planner'
  and kind = 'lookup' and not ok
  and created_at > now() - interval '30 days'
group by 1
order by 2 desc;
