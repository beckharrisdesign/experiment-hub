-- Security fix: enable RLS on four agent-runtime tables that were created
-- outside the migration flow and shipped with Row Level Security disabled.
--
-- Advisory (critical): public.checkpoints, public.phase_transitions,
-- public.drift_alerts and public.advisor_history were fully exposed to the
-- `anon` and `authenticated` roles — both hold full DML (SELECT/INSERT/
-- UPDATE/DELETE/TRUNCATE), so anyone holding the publishable key could read
-- or modify every row. All four were empty when this was found, so there is
-- no data exposure to remediate, only the open door.
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
--
-- Guarded per table because these tables exist only on the live project, not
-- in migration history: a fresh database (supabase db reset, local dev, a
-- preview branch) replays 001..009 without them, and an unguarded ALTER TABLE
-- aborts the whole migration. Missing tables are skipped with a notice.
--
-- The revoke includes PUBLIC as well as anon/authenticated, since privileges
-- granted to the PUBLIC pseudo-role are inherited by every role and would
-- otherwise survive this migration. service_role and postgres keep their
-- grants — service_role is the intended access path and bypasses RLS.
--
-- Any pre-existing policy is dropped rather than a single hard-coded name:
-- these tables were created by hand, so the policy set cannot be assumed. A
-- leftover permissive policy would silently re-open access the moment RLS is
-- enabled, which is the one failure mode this migration must not have. There
-- are no policies on the live project today, so this is a no-op there.

do $$
declare
  target_tables text[] := array[
    'checkpoints', 'phase_transitions', 'drift_alerts', 'advisor_history'
  ];
  target_labels text[] := array[
    'checkpoints', 'phase transitions', 'drift alerts', 'advisor history'
  ];
  i             int;
  target_table  text;
  existing      text;
begin
  for i in 1 .. array_length(target_tables, 1) loop
    target_table := target_tables[i];

    if to_regclass(format('public.%I', target_table)) is null then
      raise notice 'skipping public.%: not present in this database', target_table;
      continue;
    end if;

    for existing in
      select policyname
      from pg_policies
      where schemaname = 'public'
        and tablename = target_table
    loop
      execute format('drop policy %I on public.%I', existing, target_table);
      raise notice 'dropped pre-existing policy % on public.%', existing, target_table;
    end loop;

    execute format('alter table public.%I enable row level security', target_table);

    execute format(
      'revoke all on public.%I from public, anon, authenticated', target_table
    );

    execute format(
      'comment on table public.%I is %L',
      target_table,
      format(
        'Agent runtime %s. RLS on, no client policies: service-role only. '
        'Created outside the migration flow; RLS retrofitted in 009.',
        target_labels[i]
      )
    );
  end loop;
end
$$;
