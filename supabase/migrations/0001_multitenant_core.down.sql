-- Rollback for 0001_multitenant_core.sql
--
-- Restores the single-owner shape. Deleted business data is NOT restored — reload
-- it from the JSON dump taken before the migration ran.

begin;

drop policy if exists "tenant access categories" on categories;
drop policy if exists "tenant access products"   on products;
drop policy if exists "tenant access customers"  on customers;
drop policy if exists "tenant access sales"      on sales;
drop policy if exists "tenant access sale_items" on sale_items;

create policy "owner full access categories" on categories for all to authenticated using (true) with check (true);
create policy "owner full access products"   on products   for all to authenticated using (true) with check (true);
create policy "owner full access customers"  on customers  for all to authenticated using (true) with check (true);
create policy "owner full access sales"      on sales      for all to authenticated using (true) with check (true);
create policy "owner full access sale_items" on sale_items for all to authenticated using (true) with check (true);

alter table products drop constraint if exists products_id_store_key;

drop index if exists categories_store_name_key;
drop index if exists products_store_slug_key;
drop index if exists categories_store_idx;
drop index if exists products_store_idx;
drop index if exists customers_store_idx;
drop index if exists sales_store_created_idx;

alter table categories drop column if exists store_id;
alter table products   drop column if exists store_id;
alter table customers  drop column if exists store_id;
alter table sales      drop column if exists store_id;

alter table categories add constraint categories_name_key unique (name);
alter table products   add constraint products_slug_key   unique (slug);

drop function if exists auth_store_id();
drop table if exists stores;

commit;
