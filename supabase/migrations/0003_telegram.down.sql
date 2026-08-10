-- Rollback for 0003_telegram.sql
--
-- Note: the 'telegram' value added to sale_channel is NOT removed. Postgres cannot
-- drop an enum label, and recreating the type would require rewriting every sales
-- row. An unused label is harmless; leaving it is the correct trade.

begin;

drop table if exists telegram_messages;
drop table if exists telegram_connections;

commit;
