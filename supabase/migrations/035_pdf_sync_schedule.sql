-- Start the folder sync from the database, every ten minutes.
-- openspec/changes/pdf-metadata-viewer-cloud — task 7k, design.md D12.
--
-- GitHub's schedule was set for every hour and ran twice in its first day, so
-- the clock moves here. pg_cron only starts the sync: the work is still done by
-- the hub's own function (POST /api/pdf-drive/sync), and only counts come back.
--
-- The key is the route's derived one (lib/pdf-auth.ts), never the service-role
-- key it is derived from. It is kept in Vault, encrypted, and is put there by
-- the route itself on each run (pdf_sync_set_key), so nothing has to be copied
-- by hand and a rotated root replaces it. Until it is there, the schedule does
-- nothing.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function pdf_sync_set_key(key text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  kept record;
begin
  if key is null or key !~ '^[0-9a-f]{64}$' then
    raise exception 'not a sync key' using errcode = '22023';
  end if;
  select id, decrypted_secret into kept
    from vault.decrypted_secrets where name = 'pdf_sync_key';
  if not found then
    perform vault.create_secret(key, 'pdf_sync_key', 'Starts the PDF Organizer folder sync; nothing else');
    return true;
  end if;
  if kept.decrypted_secret = key then
    return false;
  end if;
  perform vault.update_secret(kept.id, key);
  return true;
end;
$$;

revoke all on function pdf_sync_set_key(text) from public, anon, authenticated;
grant execute on function pdf_sync_set_key(text) to service_role;

create or replace function pdf_sync_call()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  key text;
begin
  select decrypted_secret into key
    from vault.decrypted_secrets where name = 'pdf_sync_key';
  if key is null then
    return;
  end if;
  perform net.http_post(
    url := 'https://labs.beckharrisdesign.com/api/pdf-drive/sync',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-pdf-sync-key', key),
    timeout_milliseconds := 70000
  );
end;
$$;

-- The schedule runs as this function's owner; nobody else starts it from here.
revoke all on function pdf_sync_call() from public, anon, authenticated, service_role;

-- A call works for under a minute, so two from here never overlap. One that
-- meets a run started by hand is harmless: both write the same things.
select cron.schedule('pdf-folder-sync', '*/10 * * * *', 'select public.pdf_sync_call()');

-- pg_cron keeps a row for every run and never removes one.
select cron.schedule(
  'cron-history-trim',
  '41 8 * * *',
  $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$
);
