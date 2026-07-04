create table if not exists linked_repos (
  id            uuid        default gen_random_uuid() primary key,
  name          text        not null,
  repo_slug     text        not null,
  description   text,
  worktree_path text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- RLS on with no policies: anon/publishable keys are denied by default;
-- the admin (service-role) client bypasses RLS, which is the only access
-- path the API routes use. A permissive `using (true)` policy without a
-- `to` clause would grant PUBLIC full read/write — drop it where applied.
alter table linked_repos enable row level security;

drop policy if exists "Service role full access" on linked_repos;

-- Notes: allow linked-repo ownership alongside experiment ownership
alter table notes alter column experiment_id drop not null;

alter table notes
  add column linked_repo_id uuid references linked_repos(id) on delete cascade;

alter table notes
  add constraint notes_one_owner
  check (num_nonnulls(experiment_id, linked_repo_id) = 1);

-- Pull requests: allow linked-repo ownership alongside experiment ownership
alter table experiment_pull_requests
  add column linked_repo_id uuid references linked_repos(id) on delete cascade;

alter table experiment_pull_requests
  add constraint experiment_pull_requests_one_owner
  check (num_nonnulls(experiment_id, linked_repo_id) = 1);

-- Experiments: nullable FK to the linked repo they graduated into
alter table experiments
  add column linked_repo_id uuid references linked_repos(id) on delete set null;

create index if not exists notes_linked_repo_id on notes(linked_repo_id);
create index if not exists experiment_pull_requests_linked_repo_id
  on experiment_pull_requests(linked_repo_id);
create index if not exists experiments_linked_repo_id on experiments(linked_repo_id);
