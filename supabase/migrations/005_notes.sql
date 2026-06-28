create table if not exists notes (
  id            uuid        default gen_random_uuid() primary key,
  experiment_id text        not null references experiments(id) on delete cascade,
  title         text,
  content       text        not null,
  note_type     text        default 'observation' not null
                            check (note_type in ('observation','decision','learning','question','idea')),
  source_file   text,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists notes_experiment_id
  on notes(experiment_id);
