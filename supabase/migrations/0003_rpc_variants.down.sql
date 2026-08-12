-- Rollback for 0003_rpc_variants.sql
--
-- Restores the pre-variant function bodies. Must run AFTER
-- 0002_product_variants.down.sql, because these bodies read
-- products.sale_price / cost_price / stock_quantity, which that migration
-- puts back.

begin;

create or replace function checkout_order(
  p_items jsonb, p_customer_name text, p_customer_phone text,
  p_customer_email text default null, p_shipping_address text default null
) returns uuid language plpgsql security definer set search_path = public as $function$
declare
  v_sale_id uuid; v_customer_id uuid; v_item jsonb;
  v_product products%rowtype; v_subtotal numeric(12,2) := 0; v_line_total numeric(12,2);
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Cart is empty'; end if;
  if p_customer_name is null or length(trim(p_customer_name)) = 0 then raise exception 'Customer name is required'; end if;
  if p_customer_phone is null or length(trim(p_customer_phone)) = 0 then raise exception 'Customer phone is required'; end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from products
      where id = (v_item->>'product_id')::uuid and is_active and show_on_storefront for update;
    if not found then raise exception 'Product % not available', v_item->>'product_id'; end if;
    if (v_item->>'quantity')::int <= 0 then raise exception 'Invalid quantity for %', v_product.name; end if;
    if v_product.stock_quantity < (v_item->>'quantity')::int then raise exception 'Insufficient stock for %', v_product.name; end if;
  end loop;

  select id into v_customer_id from customers where phone = p_customer_phone limit 1;
  if v_customer_id is null then
    insert into customers (full_name, phone, email) values (p_customer_name, p_customer_phone, p_customer_email)
    returning id into v_customer_id;
  end if;

  insert into sales (channel, status, customer_id, subtotal, total,
                     customer_name, customer_phone, customer_email, shipping_address)
  values ('online', 'pending', v_customer_id, 0, 0,
          p_customer_name, p_customer_phone, p_customer_email, p_shipping_address)
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from products where id = (v_item->>'product_id')::uuid;
    v_line_total := v_product.sale_price * (v_item->>'quantity')::int;
    v_subtotal := v_subtotal + v_line_total;
    insert into sale_items (sale_id, product_id, product_name, unit_price, unit_cost, quantity, line_total)
    values (v_sale_id, v_product.id, v_product.name, v_product.sale_price, v_product.cost_price,
            (v_item->>'quantity')::int, v_line_total);
    update products set stock_quantity = stock_quantity - (v_item->>'quantity')::int where id = v_product.id;
  end loop;

  update sales set subtotal = v_subtotal, total = v_subtotal where id = v_sale_id;
  return v_sale_id;
end;
$function$;

create or replace function create_pos_sale(
  p_items jsonb, p_payment_method payment_method, p_customer_id uuid default null
) returns uuid language plpgsql security definer set search_path = public as $function$
declare
  v_sale_id uuid; v_item jsonb; v_product products%rowtype;
  v_subtotal numeric(12,2) := 0; v_line_total numeric(12,2);
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then raise exception 'Cart is empty'; end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from products where id = (v_item->>'product_id')::uuid for update;
    if not found then raise exception 'Product % not found', v_item->>'product_id'; end if;
    if (v_item->>'quantity')::int <= 0 then raise exception 'Invalid quantity for %', v_product.name; end if;
    if v_product.stock_quantity < (v_item->>'quantity')::int then raise exception 'Insufficient stock for %', v_product.name; end if;
  end loop;

  insert into sales (channel, status, customer_id, subtotal, total, payment_method)
  values ('pos', 'completed', p_customer_id, 0, 0, p_payment_method)
  returning id into v_sale_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from products where id = (v_item->>'product_id')::uuid;
    v_line_total := v_product.sale_price * (v_item->>'quantity')::int;
    v_subtotal := v_subtotal + v_line_total;
    insert into sale_items (sale_id, product_id, product_name, unit_price, unit_cost, quantity, line_total)
    values (v_sale_id, v_product.id, v_product.name, v_product.sale_price, v_product.cost_price,
            (v_item->>'quantity')::int, v_line_total);
    update products set stock_quantity = stock_quantity - (v_item->>'quantity')::int where id = v_product.id;
  end loop;

  update sales set subtotal = v_subtotal, total = v_subtotal where id = v_sale_id;
  return v_sale_id;
end;
$function$;

create or replace function cancel_online_order(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $function$
begin
  update sales set status = 'cancelled' where id = p_order_id and channel = 'online' and status = 'pending';
  update products p set stock_quantity = p.stock_quantity + i.quantity
    from sale_items i where i.sale_id = p_order_id and i.product_id = p.id;
end;
$function$;

commit;
