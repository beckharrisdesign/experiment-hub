create table if not exists notes (
  id            uuid        default gen_random_uuid() primary key,
  experiment_id text        references experiments(id) on delete cascade,
  title         text,
  content       text        not null,
  note_type     text        default 'observation' not null,
  source_file   text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);
