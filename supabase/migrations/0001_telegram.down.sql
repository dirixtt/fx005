-- Rollback for 0001_telegram.sql
--
-- Additive migration, so this is a clean reversal: nothing outside these two
-- tables was touched and no existing data depends on them.

begin;

drop table if exists telegram_messages;
drop table if exists telegram_connections;

commit;
