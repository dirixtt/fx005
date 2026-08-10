-- Server-side operations for the Telegram assistant.
--
-- Separate from 0005 on purpose: Postgres will not let a transaction use an enum
-- value that the same transaction added, so `create_telegram_order` cannot be
-- defined alongside `alter type sale_channel add value 'telegram'`.
--
-- Rollback: see 0006_telegram_rpc.down.sql

begin;

-- Creates an order from a Telegram conversation.
--
-- Deliberately a mirror of checkout_order rather than a call into it: the bot has
-- one variant and no cart, takes a district instead of a street address, and must
-- record which chat the order came from. Sharing the function would mean bending
-- both callers around each other.
--
-- Stock is decremented here, exactly as the storefront does at checkout. A
-- reseller who tells one customer "42 is yours" and then sells the same 42 over
-- the counter has a much worse problem than an order that later gets cancelled —
-- and cancel_online_order already puts the stock back.
create or replace function create_telegram_order(
  p_variant_id uuid,
  p_quantity int,
  p_customer_name text,
  p_customer_phone text,
  p_address text default null,
  p_chat_id bigint default null
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_sale_id uuid;
  v_customer_id uuid;
  v_variant product_variants%rowtype;
  v_product products%rowtype;
  v_line_total numeric(12,2);
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;
  if p_customer_name is null or length(trim(p_customer_name)) = 0 then
    raise exception 'Customer name is required';
  end if;
  if p_customer_phone is null or length(trim(p_customer_phone)) = 0 then
    raise exception 'Customer phone is required';
  end if;

  -- FOR UPDATE, so two customers asking for the last item in the same second
  -- cannot both be told yes.
  select * into v_variant from product_variants where id = p_variant_id for update;
  if not found then
    raise exception 'Variant % not available', p_variant_id;
  end if;

  select * into v_product from products where id = v_variant.product_id and is_active;
  if not found then
    raise exception 'Product not available for variant %', p_variant_id;
  end if;

  if v_variant.stock_quantity < p_quantity then
    raise exception 'Insufficient stock for %', v_product.name;
  end if;

  -- Phone is the identity a reseller actually has. Matching on it keeps a repeat
  -- buyer as one customer instead of a new row per order.
  select id into v_customer_id from customers where phone = p_customer_phone limit 1;
  if v_customer_id is null then
    insert into customers (full_name, phone)
    values (p_customer_name, p_customer_phone)
    returning id into v_customer_id;
  end if;

  v_line_total := v_variant.sale_price * p_quantity;

  insert into sales (channel, status, customer_id, subtotal, total,
                     customer_name, customer_phone, shipping_address)
  values ('telegram', 'pending', v_customer_id, v_line_total, v_line_total,
          p_customer_name, p_customer_phone, p_address)
  returning id into v_sale_id;

  -- Snapshot the name, size, colour and both prices, the same way every other
  -- channel does: renaming a product next month must not rewrite last month's
  -- orders or last month's profit.
  insert into sale_items (sale_id, product_id, variant_id, product_name,
                          variant_size, variant_color,
                          unit_price, unit_cost, quantity, line_total)
  values (v_sale_id, v_product.id, v_variant.id, v_product.name,
          v_variant.size, v_variant.color,
          v_variant.sale_price, v_variant.cost_price, p_quantity, v_line_total);

  update product_variants
     set stock_quantity = stock_quantity - p_quantity, updated_at = now()
   where id = v_variant.id;

  if p_chat_id is not null then
    update telegram_chats
       set state = 'idle', draft = null, updated_at = now()
     where chat_id = p_chat_id;
  end if;

  return v_sale_id;
end;
$function$;

-- Conversations whose newest message is from the customer and has been sitting
-- there for p_minutes.
--
-- "Newest message" is the whole test, and it is why the bot writes its own
-- replies into telegram_messages: a question the bot already answered has an
-- outbound message on top of it and correctly drops out of this list.
create or replace function unanswered_chats(p_minutes int default 15)
returns table (
  chat_id bigint,
  business_connection_id text,
  last_text text,
  waiting_minutes int
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  with latest as (
    select distinct on (m.chat_id)
           m.chat_id, m.business_connection_id, m.direction, m.text, m.created_at
      from telegram_messages m
     order by m.chat_id, m.created_at desc
  )
  select l.chat_id,
         l.business_connection_id,
         l.text,
         (extract(epoch from (now() - l.created_at)) / 60)::int
    from latest l
    left join telegram_chats c on c.chat_id = l.chat_id
   where l.direction = 'in'
     and l.created_at < now() - make_interval(mins => p_minutes)
     -- One nudge per unanswered question. A reminder already sent *after* the
     -- message arrived means the seller has been told; nagging every five
     -- minutes is how a useful alert becomes one that gets muted.
     and (c.last_reminded_at is null or c.last_reminded_at < l.created_at)
   order by l.created_at;
$function$;

-- Both are reached only through the service-role client, which bypasses grants
-- anyway. Revoking the public roles means that if either function is ever exposed
-- through PostgREST by accident, the anon key still cannot call it.
revoke all on function create_telegram_order(uuid, int, text, text, text, bigint) from anon, authenticated;
revoke all on function unanswered_chats(int) from anon, authenticated;

commit;
