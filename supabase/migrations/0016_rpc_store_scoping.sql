-- Multi-tenant pivot, phase 1c: RPCs.
--
-- Two shapes, by caller: create_pos_sale/cancel_online_order run under an
-- authenticated admin session, so they read auth_store_id() internally and
-- never take a store id from the client — there is nothing for a compromised
-- client to lie about. checkout_order/create_telegram_order/get_order_status/
-- recent_orders_by_phone/unanswered_chats run without a session (anon
-- storefront checkout, service-role Telegram pipeline), so they take
-- p_store_id explicitly and re-validate every row against it — most visibly in
-- checkout_order, which re-checks that every cart line's variant actually
-- belongs to p_store_id before writing anything, so a tampered cart payload
-- naming another store's variant id fails loudly instead of cross-selling.
--
-- owner_exists() is deliberately left untouched here — the login-page gate
-- that calls it is only removed in Ф3, and dropping the function first would
-- break the still-live single-admin login in between.
--
-- Rollback: see 0016_rpc_store_scoping.down.sql

begin;

-- Postgres identifies a function by name *and* argument types — `create or
-- replace` against a changed parameter list creates a second overload instead
-- of replacing the original, silently leaving the old, unscoped version live
-- and callable. Every signature below that gains p_store_id must be dropped
-- explicitly first; create_pos_sale/cancel_online_order keep their original
-- signature (they read auth_store_id() internally instead), so they don't
-- need this.
drop function checkout_order(jsonb, text, text, text, text);
drop function create_telegram_order(uuid, integer, text, text, text, bigint);
drop function get_order_status(uuid);
drop function recent_orders_by_phone(text, integer);
drop function unanswered_chats(integer);

create or replace function checkout_order(
  p_store_id uuid,
  p_items jsonb,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text default null,
  p_shipping_address text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid; v_customer_id uuid; v_item jsonb;
  v_variant product_variants%rowtype; v_product products%rowtype; v_qty int;
  v_subtotal numeric(12,2) := 0; v_line_total numeric(12,2);
begin
  if p_store_id is null then raise exception 'Store is required'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Cart is empty'; end if;
  if p_customer_name is null or length(trim(p_customer_name)) = 0 then raise exception 'Customer name is required'; end if;
  if p_customer_phone is null or length(trim(p_customer_phone)) = 0 then raise exception 'Customer phone is required'; end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::int;
    select * into v_variant from product_variants
      where id = (v_item->>'variant_id')::uuid and store_id = p_store_id for update;
    if not found then raise exception 'Variant % not available', v_item->>'variant_id'; end if;
    select * into v_product from products
      where id = v_variant.product_id and store_id = p_store_id and is_active and show_on_storefront;
    if not found then raise exception 'Product not available for variant %', v_variant.id; end if;
    if v_qty <= 0 then raise exception 'Invalid quantity for %', v_product.name; end if;
    if v_variant.stock_quantity < v_qty then raise exception 'Insufficient stock for %', v_product.name; end if;
  end loop;

  select id into v_customer_id from customers where phone = p_customer_phone and store_id = p_store_id limit 1;
  if v_customer_id is null then
    insert into customers (store_id, full_name, phone, email)
    values (p_store_id, p_customer_name, p_customer_phone, p_customer_email)
    returning id into v_customer_id;
  end if;

  insert into sales (store_id, channel, status, customer_id, subtotal, total,
                     customer_name, customer_phone, customer_email, shipping_address)
  values (p_store_id, 'online', 'pending', v_customer_id, 0, 0,
          p_customer_name, p_customer_phone, p_customer_email, p_shipping_address)
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::int;
    select * into v_variant from product_variants where id = (v_item->>'variant_id')::uuid;
    select * into v_product from products where id = v_variant.product_id;
    v_line_total := v_variant.sale_price * v_qty;
    v_subtotal := v_subtotal + v_line_total;
    insert into sale_items (sale_id, product_id, variant_id, product_name, variant_size, variant_color,
                            unit_price, unit_cost, quantity, line_total)
    values (v_sale_id, v_product.id, v_variant.id, v_product.name, v_variant.size, v_variant.color,
            v_variant.sale_price, v_variant.cost_price, v_qty, v_line_total);
    update product_variants set stock_quantity = stock_quantity - v_qty, updated_at = now() where id = v_variant.id;
  end loop;

  update sales set subtotal = v_subtotal, total = v_subtotal where id = v_sale_id;
  return v_sale_id;
end;
$$;

create or replace function create_pos_sale(
  p_items jsonb,
  p_payment_method payment_method,
  p_customer_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid := auth_store_id();
  v_sale_id uuid; v_item jsonb; v_variant product_variants%rowtype; v_product products%rowtype;
  v_qty int; v_subtotal numeric(12,2) := 0; v_line_total numeric(12,2);
begin
  if v_store_id is null then raise exception 'No store for the current user'; end if;
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Cart is empty'; end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::int;
    select * into v_variant from product_variants
      where id = (v_item->>'variant_id')::uuid and store_id = v_store_id for update;
    if not found then raise exception 'Variant % not found', v_item->>'variant_id'; end if;
    if v_qty <= 0 then raise exception 'Invalid quantity'; end if;
    if v_variant.stock_quantity < v_qty then raise exception 'Insufficient stock for variant %', v_variant.id; end if;
  end loop;

  insert into sales (store_id, channel, status, customer_id, subtotal, total, payment_method)
  values (v_store_id, 'pos', 'completed', p_customer_id, 0, 0, p_payment_method) returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'quantity')::int;
    select * into v_variant from product_variants where id = (v_item->>'variant_id')::uuid;
    select * into v_product from products where id = v_variant.product_id;
    v_line_total := v_variant.sale_price * v_qty;
    v_subtotal := v_subtotal + v_line_total;
    insert into sale_items (sale_id, product_id, variant_id, product_name, variant_size, variant_color,
                            unit_price, unit_cost, quantity, line_total)
    values (v_sale_id, v_product.id, v_variant.id, v_product.name, v_variant.size, v_variant.color,
            v_variant.sale_price, v_variant.cost_price, v_qty, v_line_total);
    update product_variants set stock_quantity = stock_quantity - v_qty, updated_at = now() where id = v_variant.id;
  end loop;

  update sales set subtotal = v_subtotal, total = v_subtotal where id = v_sale_id;
  return v_sale_id;
end;
$$;

create or replace function cancel_online_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid := auth_store_id();
  v_updated int;
begin
  if v_store_id is null then raise exception 'No store for the current user'; end if;

  update sales set status = 'cancelled'
    where id = p_order_id and store_id = v_store_id and channel = 'online' and status = 'pending';
  get diagnostics v_updated = row_count;
  if v_updated = 0 then raise exception 'Order not found or already processed'; end if;

  update product_variants v set stock_quantity = v.stock_quantity + i.quantity, updated_at = now()
    from sale_items i where i.sale_id = p_order_id and i.variant_id = v.id;
end;
$$;

create or replace function create_telegram_order(
  p_store_id uuid,
  p_variant_id uuid,
  p_quantity integer,
  p_customer_name text,
  p_customer_phone text,
  p_address text default null,
  p_chat_id bigint default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_customer_id uuid;
  v_variant product_variants%rowtype;
  v_product products%rowtype;
  v_line_total numeric(12,2);
begin
  if p_store_id is null then raise exception 'Store is required'; end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;
  if p_customer_name is null or length(trim(p_customer_name)) = 0 then
    raise exception 'Customer name is required';
  end if;
  if p_customer_phone is null or length(trim(p_customer_phone)) = 0 then
    raise exception 'Customer phone is required';
  end if;

  select * into v_variant from product_variants where id = p_variant_id and store_id = p_store_id for update;
  if not found then
    raise exception 'Variant % not available', p_variant_id;
  end if;

  select * into v_product from products where id = v_variant.product_id and store_id = p_store_id and is_active;
  if not found then
    raise exception 'Product not available for variant %', p_variant_id;
  end if;

  if v_variant.stock_quantity < p_quantity then
    raise exception 'Insufficient stock for %', v_product.name;
  end if;

  select id into v_customer_id from customers where phone = p_customer_phone and store_id = p_store_id limit 1;
  if v_customer_id is null then
    insert into customers (store_id, full_name, phone)
    values (p_store_id, p_customer_name, p_customer_phone)
    returning id into v_customer_id;
  end if;

  v_line_total := v_variant.sale_price * p_quantity;

  insert into sales (store_id, channel, status, customer_id, subtotal, total,
                     customer_name, customer_phone, shipping_address)
  values (p_store_id, 'telegram', 'pending', v_customer_id, v_line_total, v_line_total,
          p_customer_name, p_customer_phone, p_address)
  returning id into v_sale_id;

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
     where chat_id = p_chat_id and store_id = p_store_id;
  end if;

  return v_sale_id;
end;
$$;

create or replace function get_order_status(p_store_id uuid, p_order_id uuid)
returns table(id uuid, status sale_status, total numeric, customer_name text, created_at timestamptz, items jsonb)
language sql
security definer
set search_path = public
as $$
  select
    s.id,
    s.status,
    s.total,
    s.customer_name,
    s.created_at,
    coalesce(
      (select jsonb_agg(jsonb_build_object(
        'product_name', si.product_name,
        'quantity', si.quantity,
        'unit_price', si.unit_price,
        'line_total', si.line_total
      )) from sale_items si where si.sale_id = s.id),
      '[]'::jsonb
    ) as items
  from sales s
  where s.id = p_order_id and s.store_id = p_store_id and s.channel = 'online';
$$;

create or replace function recent_orders_by_phone(p_store_id uuid, p_phone text, p_limit integer default 3)
returns table(id uuid, channel sale_channel, status sale_status, total numeric, created_at timestamptz, items_summary text)
language sql
stable security definer
set search_path = public
as $$
  select s.id, s.channel, s.status, s.total, s.created_at,
         string_agg(
           i.product_name || coalesce(' ' || i.variant_size, '') || ' × ' || i.quantity,
           ', ' order by i.id
         ) as items_summary
    from sales s
    join sale_items i on i.sale_id = s.id
   where s.store_id = p_store_id
     and s.customer_phone = p_phone
     and s.created_at > now() - interval '180 days'
   group by s.id
   order by s.created_at desc
   limit p_limit;
$$;

create or replace function unanswered_chats(p_store_id uuid, p_minutes integer default 15)
returns table(chat_id bigint, business_connection_id text, last_text text, waiting_minutes integer)
language sql
stable security definer
set search_path = public
as $$
  with latest as (
    select distinct on (m.chat_id)
           m.chat_id, m.business_connection_id, m.direction, m.text, m.created_at
      from telegram_messages m
     where m.store_id = p_store_id
       and coalesce(m.raw ->> 'source', '') <> 'assistant_ack'
     order by m.chat_id, m.created_at desc
  )
  select l.chat_id,
         l.business_connection_id,
         l.text,
         (extract(epoch from (now() - l.created_at)) / 60)::int
    from latest l
    left join telegram_chats c on c.chat_id = l.chat_id and c.business_connection_id = l.business_connection_id
   where l.direction = 'in'
     and l.created_at < now() - make_interval(mins => p_minutes)
     and (c.last_reminded_at is null or c.last_reminded_at < l.created_at)
   order by l.created_at;
$$;

commit;
