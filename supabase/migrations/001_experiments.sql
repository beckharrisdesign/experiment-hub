create table if not exists experiments (
  id                  text        primary key,
  name                text        not null,
  statement           text        not null,
  type                text,
  directory           text        not null,
  documentation_id    text,
  prototype_id        text,
  status              text        not null,
  created_date        date,
  last_modified       date,
  tags                text[]      default '{}',
  scores              jsonb,
  score_rationale     jsonb,
  validation          jsonb,
  openspec_change_id  text,
  openspec_schema     text,
  updated_at          timestamptz default now()
);
