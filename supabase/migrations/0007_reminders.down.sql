-- Rollback of 0007_reminders.sql.
--
-- The extensions are left installed: other things may have come to depend on them
-- by the time this runs, and an unused extension costs nothing. Vault secrets are
-- left alone too — they are environment configuration, not schema.

begin;

do $$
begin
  perform cron.unschedule('telegram-unanswered');
exception when others then
  null;
end;
$$;

drop function if exists public.notify_unanswered();

commit;
