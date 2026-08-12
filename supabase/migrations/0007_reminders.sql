-- Step 6 — schedule the unanswered-conversation reminder.
--
-- Scheduled from Postgres rather than vercel.json for one blunt reason: the
-- Vercel Hobby plan allows a single cron run per day. A reminder that a customer
-- has been waiting is worth nothing if it arrives the next morning. pg_cron runs
-- inside the database the project already pays nothing for, at whatever interval
-- is actually useful.
--
-- The URL and the shared secret are read from Supabase Vault, not written here.
-- A secret committed to a migration is a secret in git forever, and `cron.job` is
-- readable by anyone who can open the SQL editor.
--
-- ONE-TIME SETUP, run once per environment (never committed):
--
--   select vault.create_secret('https://your-shop.vercel.app', 'site_url');
--   select vault.create_secret('<the same value as CRON_SECRET>', 'cron_secret');
--
-- Until those exist the job runs, finds nothing configured, warns, and does
-- nothing — which is the correct behaviour for a fresh clone.
--
-- Rollback: see 0007_reminders.down.sql

begin;

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.notify_unanswered()
returns void
language plpgsql
security definer
set search_path to 'public', 'extensions'
as $function$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'site_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'cron_secret';

  if v_url is null or v_secret is null then
    raise warning 'notify_unanswered: vault secrets site_url and cron_secret are not set';
    return;
  end if;

  -- Fire and forget. pg_net queues the request and returns immediately, so a slow
  -- or down deployment cannot block the cron worker; the route itself is
  -- idempotent enough that a dropped call just means the next run picks it up.
  perform net.http_get(
    url := v_url || '/api/cron/unanswered',
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 20000
  );
end;
$function$;

revoke all on function public.notify_unanswered() from anon, authenticated;

-- Unschedule first so re-running this migration replaces the job rather than
-- failing or, worse, leaving two of them sending duplicate alerts.
do $$
begin
  perform cron.unschedule('telegram-unanswered');
exception when others then
  null;
end;
$$;

-- Every five minutes. The route only alerts about conversations that have been
-- waiting past its own threshold (15 minutes by default) and stamps each one, so
-- a frequent poll costs a cheap query, not a repeated notification.
select cron.schedule('telegram-unanswered', '*/5 * * * *', $$select public.notify_unanswered()$$);

commit;
