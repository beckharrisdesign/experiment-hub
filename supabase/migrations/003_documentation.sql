create table if not exists documentation (
  id             text primary key,
  title          text not null,
  content        text,
  experiment_id  text references experiments(id),
  created_date   date,
  last_modified  date,
  tags           text[] default '{}',
  updated_at     timestamptz default now()
);
