-- Rollback of 0006_telegram_rpc.sql.
--
-- Orders already created by create_telegram_order are left alone: they are real
-- sales with real stock movements behind them.

begin;

drop function if exists create_telegram_order(uuid, int, text, text, text, bigint);
drop function if exists unanswered_chats(int);

commit;
