-- Rollback of 0005_telegram_assistant.sql.
--
-- Note: 'telegram' cannot be removed from the sale_channel enum — Postgres has no
-- DROP VALUE, and rebuilding the type would rewrite the sales table. The value is
-- left in place; it is inert once nothing writes it. Any orders already taken by
-- the bot are real sales and are deliberately NOT deleted here.

begin;

drop index if exists telegram_messages_dedupe_idx;
drop table if exists telegram_chats;

commit;
