-- Executive-function assessment suite — session log.
--
-- One table with a `module` discriminator rather than three. The brief asks for
-- per-module logs that trend independently, which a discriminator gives you
-- (every read is filtered by module anyway); three tables would only add two
-- more migrations to keep in step for no gain in separation.
--
-- Module-specific metrics live in `detail` as JSONB. They differ in shape per
-- module and are read whole, never queried field-by-field, so columns would be
-- mostly-null width. `headline` is lifted out because it is the one value the
-- trend charts sort and plot, and that should not need a JSON traversal.

create table if not exists exec_function_sessions (
  id            uuid primary key default gen_random_uuid(),
  module        text        not null check (module in ('corsi', 'n-back', 'self-report')),
  -- Corsi's forward/backward. Null for modules with a single series.
  variant       text,
  -- The instant the session finished.
  recorded_at   timestamptz not null,
  -- The local calendar day it counts toward, in the schedule's timezone.
  -- Stored rather than derived: the timezone is configuration and can change,
  -- and a past session must stay filed under the day it was actually taken.
  day_key       date        not null,
  duration_ms   integer     not null check (duration_ms >= 0),
  headline      numeric     not null,
  detail        jsonb       not null,
  created_at    timestamptz not null default now()
);

-- Every read is "this module's history, in time order".
create index if not exists exec_function_sessions_module_time_idx
  on exec_function_sessions (module, recorded_at desc);

-- The streak and "has today been done" checks scan by day.
create index if not exists exec_function_sessions_day_idx
  on exec_function_sessions (day_key desc);

-- Single-user tool with no Supabase auth: nothing may reach this table with the
-- publishable key. All access goes through the hub's API routes, which check
-- EFA_ACCESS_KEY and then use the service-role key (which bypasses RLS).
alter table exec_function_sessions enable row level security;
