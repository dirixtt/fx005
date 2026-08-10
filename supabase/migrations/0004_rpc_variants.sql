-- Rewrites the three transactional RPCs for variants and tenancy.
--
-- The row-locking shape of the originals is preserved deliberately: validate and
-- lock every line first, then write. That ordering is what stops two simultaneous
-- checkouts from both passing the stock check and overselling the last item.
--
-- What changes: lines address a variant rather than a product, stock and price are
-- read from product_variants, and every write is pinned to one store.
--
-- Rollback: see 0004_rpc_variants.down.sql

begin;

-- Signatures change (checkout_order gains p_store_id, items now carry variant_id),
-- so the old ones are dropped rather than left behind as overloads that would
-- silently keep serving the pre-variant shape.
drop function if exists checkout_order(jsonb, text, text, text, text);
drop function if exists create_pos_sale(jsonb, payment_method, uuid);
drop function if exists cancel_online_order(uuid);

-- ---------------------------------------------------------------- storefront
-- Called by anon from the public storefront, so the tenant cannot come from
-- auth_store_id() and is passed explicitly. Every variant is then re-checked
-- against that store: a forged variant_id from another seller's catalogue is
-- rejected rather than quietly sold.
create function checkout_order(
  p_store_id uuid,
  p_items jsonb,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text default null,
  p_shipping_address text default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_sale_id uuid;
  v_customer_id uuid;
  v_item jsonb;
  v_variant product_variants%rowtype;
  v_product products%rowtype;
  v_qty int;
  v_subtotal numeric(12, 2) := 0;
  v_line_total numeric(12, 2);
begin
  if p_store_id is null then
    raise exception 'Store is required';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;

  if p_customer_name is null or length(trim(p_customer_name)) = 0 then
    raise exception 'Customer name is required';
  end if;

  if p_customer_phone is null or length(trim(p_customer_phone)) = 0 then
    raise exception 'Customer phone is required';
  end if;

  -- Pass 1: lock and validate everything before writing anything.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::int;

    select * into v_variant from product_variants
      where id = (v_item->>'variant_id')::uuid
        and store_id = p_store_id
      for update;

    if not found then
      raise exception 'Variant % not available', v_item->>'variant_id';
    end if;

    select * into v_product from products
      where id = v_variant.product_id and is_active and show_on_storefront;

    if not found then
      raise exception 'Product not available for variant %', v_variant.id;
    end if;

    if v_qty <= 0 then
      raise exception 'Invalid quantity for %', v_product.name;
    end if;

    if v_variant.stock_quantity < v_qty then
      raise exception 'Insufficient stock for %', v_product.name;
    end if;
  end loop;

  -- Repeat customers are matched by phone within the store only. A global lookup
  -- would attach one seller's buyer to another seller's order.
  select id into v_customer_id from customers
    where store_id = p_store_id and phone = p_customer_phone
    limit 1;

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

  -- Pass 2: write lines and draw down stock.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::int;

    select * into v_variant from product_variants where id = (v_item->>'variant_id')::uuid;
    select * into v_product from products where id = v_variant.product_id;

    v_line_total := v_variant.sale_price * v_qty;
    v_subtotal := v_subtotal + v_line_total;

    insert into sale_items (sale_id, product_id, variant_id, product_name,
                            variant_size, variant_color,
                            unit_price, unit_cost, quantity, line_total)
    values (v_sale_id, v_product.id, v_variant.id, v_product.name,
            v_variant.size, v_variant.color,
            v_variant.sale_price, v_variant.cost_price, v_qty, v_line_total);

    update product_variants
      set stock_quantity = stock_quantity - v_qty, updated_at = now()
      where id = v_variant.id;
  end loop;

  update sales set subtotal = v_subtotal, total = v_subtotal where id = v_sale_id;

  return v_sale_id;
end;
$function$;

-- ---------------------------------------------------------------- till
create function create_pos_sale(
  p_items jsonb,
  p_payment_method payment_method,
  p_customer_id uuid default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_store_id uuid := auth_store_id();
  v_sale_id uuid;
  v_item jsonb;
  v_variant product_variants%rowtype;
  v_product products%rowtype;
  v_qty int;
  v_subtotal numeric(12, 2) := 0;
  v_line_total numeric(12, 2);
begin
  -- SECURITY DEFINER bypasses RLS, so the tenant check has to be explicit here.
  if v_store_id is null then
    raise exception 'No store for current user';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Cart is empty';
  end if;

  if p_customer_id is not null
     and not exists (select 1 from customers where id = p_customer_id and store_id = v_store_id) then
    raise exception 'Customer does not belong to this store';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::int;

    select * into v_variant from product_variants
      where id = (v_item->>'variant_id')::uuid and store_id = v_store_id
      for update;

    if not found then
      raise exception 'Variant % not found', v_item->>'variant_id';
    end if;

    if v_qty <= 0 then
      raise exception 'Invalid quantity';
    end if;

    if v_variant.stock_quantity < v_qty then
      raise exception 'Insufficient stock for variant %', v_variant.id;
    end if;
  end loop;

  insert into sales (store_id, channel, status, customer_id, subtotal, total, payment_method)
  values (v_store_id, 'pos', 'completed', p_customer_id, 0, 0, p_payment_method)
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item->>'quantity')::int;

    select * into v_variant from product_variants where id = (v_item->>'variant_id')::uuid;
    select * into v_product from products where id = v_variant.product_id;

    v_line_total := v_variant.sale_price * v_qty;
    v_subtotal := v_subtotal + v_line_total;

    insert into sale_items (sale_id, product_id, variant_id, product_name,
                            variant_size, variant_color,
                            unit_price, unit_cost, quantity, line_total)
    values (v_sale_id, v_product.id, v_variant.id, v_product.name,
            v_variant.size, v_variant.color,
            v_variant.sale_price, v_variant.cost_price, v_qty, v_line_total);

    update product_variants
      set stock_quantity = stock_quantity - v_qty, updated_at = now()
      where id = v_variant.id;
  end loop;

  update sales set subtotal = v_subtotal, total = v_subtotal where id = v_sale_id;

  return v_sale_id;
end;
$function$;

-- ---------------------------------------------------------------- cancellation
create function cancel_online_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_store_id uuid := auth_store_id();
  v_updated int;
begin
  if v_store_id is null then
    raise exception 'No store for current user';
  end if;

  -- Flip the status first, scoped to this store and to orders that are still
  -- pending. If nothing matches, the order was already handled or belongs to
  -- someone else, and stock must not be returned twice.
  update sales
    set status = 'cancelled'
    where id = p_order_id
      and store_id = v_store_id
      and channel = 'online'
      and status = 'pending';

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception 'Order not found, already processed, or not yours';
  end if;

  update product_variants v
    set stock_quantity = v.stock_quantity + i.quantity, updated_at = now()
    from sale_items i
    where i.sale_id = p_order_id
      and i.variant_id = v.id;
end;
$function$;

-- ---------------------------------------------------------------- grants
revoke all on function checkout_order(uuid, jsonb, text, text, text, text) from public;
grant execute on function checkout_order(uuid, jsonb, text, text, text, text) to anon, authenticated;

revoke all on function create_pos_sale(jsonb, payment_method, uuid) from public;
grant execute on function create_pos_sale(jsonb, payment_method, uuid) to authenticated;

revoke all on function cancel_online_order(uuid) from public;
grant execute on function cancel_online_order(uuid) to authenticated;

commit;
