-- Rollback of 0008_telegram_read_policies.sql.
--
-- Returns the Telegram tables to "RLS on, no policies": the webhook keeps working
-- (service role bypasses RLS) and the conversations screen goes blank.

begin;

drop policy if exists "owner reads telegram messages" on telegram_messages;
drop policy if exists "owner reads telegram chats" on telegram_chats;
drop policy if exists "owner reads telegram connections" on telegram_connections;

commit;
