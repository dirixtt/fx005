-- "Где мой заказ?" — the most common follow-up question after Steps 4-6 shipped,
-- and one the bot could not answer at all: nothing connected a Telegram chat to
-- an order placed under that customer's phone number.
--
-- The phone is learned once — either from a completed Telegram order, or from the
-- customer volunteering it here — and remembered on the chat. Every status
-- question after that is a lookup, not a new question.
--
-- Rollback: see 0009_order_status.down.sql

begin;

-- Remembered once known. Learning it here (not only at checkout) means a
-- customer who never ordered through the bot can still ask about a POS or
-- storefront order, as long as they tell us the number they used.
alter table telegram_chats add column customer_phone text;

alter table telegram_chats drop constraint telegram_chats_state_check;
alter table telegram_chats add constraint telegram_chats_state_check
  check (state in ('idle', 'awaiting_contact', 'awaiting_phone_for_status'));

-- The most recent orders for a phone number, across every channel — a customer
-- who ordered at the till does not know or care that the bot's memory starts at
-- Telegram. Capped at 3 and 180 days: this answers "where is my order", not "show
-- my history", and a customer's own recent memory is the right time window.
create or replace function recent_orders_by_phone(p_phone text, p_limit int default 3)
returns table (
  id uuid,
  channel sale_channel,
  status sale_status,
  total numeric,
  created_at timestamptz,
  items_summary text
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select s.id, s.channel, s.status, s.total, s.created_at,
         string_agg(
           i.product_name || coalesce(' ' || i.variant_size, '') || ' × ' || i.quantity,
           ', ' order by i.id
         ) as items_summary
    from sales s
    join sale_items i on i.sale_id = s.id
   where s.customer_phone = p_phone
     and s.created_at > now() - interval '180 days'
   group by s.id
   order by s.created_at desc
   limit p_limit;
$function$;

revoke all on function recent_orders_by_phone(text, int) from anon, authenticated;

commit;
