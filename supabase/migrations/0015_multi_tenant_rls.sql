-- Multi-tenant pivot, phase 1b: RLS.
--
-- Replaces every blanket `using (true)` owner policy with `store_id =
-- auth_store_id()`. Public anon read policies on products/product_variants/
-- categories are untouched on purpose — storefront product data is meant to be
-- publicly readable once a customer is looking at a given store's page; store
-- scoping for that path is an application-level filter after resolving the
-- slug (see Ф4), not an RLS concern.
--
-- Rollback: see 0015_multi_tenant_rls.down.sql

begin;

create policy "owner reads own store" on stores
  for select to authenticated using (owner_user_id = auth.uid());

create policy "owner updates own store" on stores
  for update to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- No authenticated insert policy: a store row is only ever created through the
-- security-definer create_store() RPC (Ф3), not a direct client insert.

create policy "owner manages own link codes" on telegram_link_codes
  for all to authenticated
  using (store_id = auth_store_id())
  with check (store_id = auth_store_id());
-- The webhook (service role) resolves codes across all stores to find a match;
-- service role bypasses RLS entirely, so no separate policy is needed for that.

drop policy "owner full access categories" on categories;
create policy "store owner manages categories" on categories
  for all to authenticated using (store_id = auth_store_id()) with check (store_id = auth_store_id());

drop policy "owner full access products" on products;
create policy "store owner manages products" on products
  for all to authenticated using (store_id = auth_store_id()) with check (store_id = auth_store_id());

drop policy "owner full access customers" on customers;
create policy "store owner manages customers" on customers
  for all to authenticated using (store_id = auth_store_id()) with check (store_id = auth_store_id());

drop policy "owner full access sales" on sales;
create policy "store owner manages sales" on sales
  for all to authenticated using (store_id = auth_store_id()) with check (store_id = auth_store_id());

-- sale_items has no store_id of its own — tenancy is inherited through sale_id,
-- the same snapshot principle the codebase already applies to product_name/price.
drop policy "owner full access sale_items" on sale_items;
create policy "store owner manages sale_items" on sale_items
  for all to authenticated
  using (exists (select 1 from sales s where s.id = sale_items.sale_id and s.store_id = auth_store_id()))
  with check (exists (select 1 from sales s where s.id = sale_items.sale_id and s.store_id = auth_store_id()));

drop policy "owner full access delivery_zones" on delivery_zones;
create policy "store owner manages delivery_zones" on delivery_zones
  for all to authenticated using (store_id = auth_store_id()) with check (store_id = auth_store_id());

drop policy "owner full access product_variants" on product_variants;
create policy "store owner manages product_variants" on product_variants
  for all to authenticated using (store_id = auth_store_id()) with check (store_id = auth_store_id());

drop policy "owner full access assistant_settings" on assistant_settings;
create policy "store owner manages assistant_settings" on assistant_settings
  for all to authenticated using (store_id = auth_store_id()) with check (store_id = auth_store_id());

drop policy "owner full access shop_info" on shop_info;
create policy "store owner manages shop_info" on shop_info
  for all to authenticated using (store_id = auth_store_id()) with check (store_id = auth_store_id());

-- telegram_connections/telegram_messages each carry two near-duplicate
-- read-only policies from earlier migrations (0001 + 0008) — collapse each
-- pair into one store-scoped policy.
drop policy "owner reads telegram connections" on telegram_connections;
drop policy "owner reads telegram_connections" on telegram_connections;
create policy "store owner reads telegram_connections" on telegram_connections
  for select to authenticated using (store_id = auth_store_id());

drop policy "owner reads telegram messages" on telegram_messages;
drop policy "owner reads telegram_messages" on telegram_messages;
create policy "store owner reads telegram_messages" on telegram_messages
  for select to authenticated using (store_id = auth_store_id());

drop policy "owner reads telegram chats" on telegram_chats;
create policy "store owner reads telegram_chats" on telegram_chats
  for select to authenticated using (store_id = auth_store_id());

commit;
