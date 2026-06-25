create table if not exists experiment_pull_requests (
  id            uuid    default gen_random_uuid() primary key,
  experiment_id text    references experiments(id) on delete cascade,
  repo          text    not null,
  pr_number     integer not null,
  title         text,
  state         text,
  url           text,
  branch        text,
  author        text,
  labels        text[]  default '{}',
  opened_at     timestamptz,
  merged_at     timestamptz,
  synced_at     timestamptz default now(),
  unique (repo, pr_number)
);

create index if not exists experiment_pull_requests_experiment_id
  on experiment_pull_requests(experiment_id);

create index if not exists notes_experiment_id
  on notes(experiment_id);
