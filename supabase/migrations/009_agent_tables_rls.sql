-- Security fix: enable RLS on four agent-runtime tables that were created
-- outside the migration flow and shipped with Row Level Security disabled.
--
-- Advisory (critical): public.checkpoints, public.phase_transitions,
-- public.drift_alerts and public.advisor_history were fully exposed to the
-- `anon` and `authenticated` roles — anyone holding the publishable key could
-- read or modify every row. All four were empty when this was found, so there
-- is no data exposure to remediate, only the open door.
--
-- Access audit before locking these down: none of the four tables is
-- referenced anywhere in lib/, app/api/ or scripts/ — no `.from("checkpoints")`
-- or equivalent exists in any .ts/.tsx/.js/.sql file in the repo. The only
-- mentions are prose in skills/ and docs/ (AGENT_ARCHITECTURE.md), describing
-- the intended agent-runtime schema. There is therefore no publishable-key or
-- client-side read path to preserve, and no policies are needed.
--
-- This applies the same lockdown the rest of the project already uses
-- (see 006_linked_repos.sql and 007_elk_orders.sql): RLS on with no policies
-- means anon/authenticated are denied by default, while the service-role
-- admin client (getAdminClient() in lib/supabase.ts) bypasses RLS. If a
-- future agent runtime needs client-key access to these tables, add explicit
-- policies with a `to` clause — never a bare `using (true)`, which grants
-- PUBLIC full read/write.

alter table public.checkpoints        enable row level security;
alter table public.phase_transitions  enable row level security;
alter table public.drift_alerts       enable row level security;
alter table public.advisor_history    enable row level security;

-- Explicitly deny all client roles (no policies = deny under RLS; stated for
-- clarity/audit, matching 007_elk_orders.sql).
revoke all on public.checkpoints       from anon, authenticated;
revoke all on public.phase_transitions from anon, authenticated;
revoke all on public.drift_alerts      from anon, authenticated;
revoke all on public.advisor_history   from anon, authenticated;

-- Drop any permissive policy that may have been applied ad hoc in the SQL
-- editor, for the same reason 006_linked_repos.sql does.
drop policy if exists "Service role full access" on public.checkpoints;
drop policy if exists "Service role full access" on public.phase_transitions;
drop policy if exists "Service role full access" on public.drift_alerts;
drop policy if exists "Service role full access" on public.advisor_history;

comment on table public.checkpoints is
  'Agent runtime checkpoints. RLS on, no client policies: service-role only. Created outside the migration flow; RLS retrofitted in 009.';
comment on table public.phase_transitions is
  'Agent runtime phase transitions. RLS on, no client policies: service-role only. Created outside the migration flow; RLS retrofitted in 009.';
comment on table public.drift_alerts is
  'Agent runtime drift alerts. RLS on, no client policies: service-role only. Created outside the migration flow; RLS retrofitted in 009.';
comment on table public.advisor_history is
  'Agent runtime advisor history. RLS on, no client policies: service-role only. Created outside the migration flow; RLS retrofitted in 009.';
