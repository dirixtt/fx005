-- Let the signed-in shop owner read their own Telegram data.
--
-- Until now these tables had RLS enabled and no policies at all, which is the
-- right default for tables only the webhook touches. The conversations screen
-- changes that: the owner needs to see what customers asked and what the bot
-- answered, and the honest way to express that is a policy — not handing the
-- service-role key to a page.
--
-- Read only, and only for `authenticated`. Nothing in the admin writes to these
-- tables; every write still goes through the webhook's service-role client.
--
-- Rollback: see 0008_telegram_read_policies.down.sql

begin;

create policy "owner reads telegram messages"
  on telegram_messages for select
  to authenticated
  using (true);

create policy "owner reads telegram chats"
  on telegram_chats for select
  to authenticated
  using (true);

create policy "owner reads telegram connections"
  on telegram_connections for select
  to authenticated
  using (true);

commit;
