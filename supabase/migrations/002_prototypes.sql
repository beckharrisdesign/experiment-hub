create table if not exists prototypes (
  id             text primary key,
  title          text not null,
  description    text,
  link_path      text,
  experiment_id  text references experiments(id),
  status         text,
  created_date   date,
  last_modified  date,
  tags           text[] default '{}',
  port           integer,
  updated_at     timestamptz default now()
);
