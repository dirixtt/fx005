begin;

drop policy "store owner reads telegram_chats" on telegram_chats;
create policy "owner reads telegram chats" on telegram_chats
  for select to authenticated using (true);

drop policy "store owner reads telegram_messages" on telegram_messages;
create policy "owner reads telegram messages" on telegram_messages
  for select to authenticated using (true);
create policy "owner reads telegram_messages" on telegram_messages
  for select to authenticated using (true);

drop policy "store owner reads telegram_connections" on telegram_connections;
create policy "owner reads telegram connections" on telegram_connections
  for select to authenticated using (true);
create policy "owner reads telegram_connections" on telegram_connections
  for select to authenticated using (true);

drop policy "store owner manages shop_info" on shop_info;
create policy "owner full access shop_info" on shop_info for all to authenticated using (true) with check (true);

drop policy "store owner manages assistant_settings" on assistant_settings;
create policy "owner full access assistant_settings" on assistant_settings for all to authenticated using (true) with check (true);

drop policy "store owner manages product_variants" on product_variants;
create policy "owner full access product_variants" on product_variants for all to authenticated using (true) with check (true);

drop policy "store owner manages delivery_zones" on delivery_zones;
create policy "owner full access delivery_zones" on delivery_zones for all to authenticated using (true) with check (true);

drop policy "store owner manages sale_items" on sale_items;
create policy "owner full access sale_items" on sale_items for all to authenticated using (true) with check (true);

drop policy "store owner manages sales" on sales;
create policy "owner full access sales" on sales for all to authenticated using (true) with check (true);

drop policy "store owner manages customers" on customers;
create policy "owner full access customers" on customers for all to authenticated using (true) with check (true);

drop policy "store owner manages products" on products;
create policy "owner full access products" on products for all to authenticated using (true) with check (true);

drop policy "store owner manages categories" on categories;
create policy "owner full access categories" on categories for all to authenticated using (true) with check (true);

drop policy "owner manages own link codes" on telegram_link_codes;
drop policy "owner updates own store" on stores;
drop policy "owner reads own store" on stores;

commit;
