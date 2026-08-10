-- Rollback of 0009_order_status.sql.

begin;

drop function if exists recent_orders_by_phone(text, int);

alter table telegram_chats drop constraint telegram_chats_state_check;
alter table telegram_chats add constraint telegram_chats_state_check
  check (state in ('idle', 'awaiting_contact'));

alter table telegram_chats drop column if exists customer_phone;

commit;
