begin;

drop index telegram_messages_dedupe_idx;
create unique index telegram_messages_dedupe_idx on telegram_messages (chat_id, telegram_message_id);

alter table telegram_chats drop constraint telegram_chats_pkey;
alter table telegram_chats add primary key (chat_id);
alter table telegram_chats alter column business_connection_id drop not null;

drop index product_variants_store_barcode_key;
drop index product_variants_store_sku_key;
alter table product_variants add constraint product_variants_barcode_key unique (barcode);
alter table product_variants add constraint product_variants_sku_key unique (sku);

alter table products drop constraint products_store_slug_key;
alter table products add constraint products_slug_key unique (slug);

alter table categories drop constraint categories_store_name_key;
alter table categories add constraint categories_name_key unique (name);

alter table telegram_chats drop column store_id;
alter table telegram_messages drop column store_id;
alter table telegram_connections drop column store_id;
alter table product_variants drop column store_id;
alter table delivery_zones drop column store_id;
alter table sales drop column store_id;
alter table customers drop column store_id;
alter table products drop column store_id;
alter table categories drop column store_id;

alter table shop_info drop column notify_chat_id;
alter table shop_info drop column store_id;
alter table shop_info add column id boolean primary key default true check (id);
insert into shop_info (id) values (true);

alter table assistant_settings drop column store_id;
alter table assistant_settings add column id boolean primary key default true check (id);
insert into assistant_settings (id) values (true);

drop table telegram_link_codes;
drop view store_public;
drop function auth_store_id();
drop table stores;

commit;
