-- Multi-tenant pivot, phase 1: schema.
--
-- Every table below is empty (pre-launch, verified live before writing this),
-- so store_id goes straight to NOT NULL wherever a row conceptually belongs to
-- exactly one store — no backfill step needed. Two correctness fixes ride along
-- because they were only latent bugs in a single-tenant world and become real
-- cross-tenant collisions the moment a second store exists: telegram_chats and
-- telegram_messages keyed on bare chat_id (Telegram only guarantees chat_id is
-- unique within one business_connection_id), and the assistant_settings/shop_info
-- singleton tables, which move from a "one boolean-PK row" trick to a real
-- per-store primary key.
--
-- Rollback: see 0014_multi_tenant_schema.down.sql

begin;

-- One row per seller. Owner:store is 1:1 for v1 — enforced by the unique
-- constraint on owner_user_id rather than a separate membership table.
create table stores (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tagline text,
  owner_user_id uuid not null unique references auth.users(id) on delete cascade,
  owner_telegram_user_id bigint unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stores_slug_format check (slug ~ '^[a-z0-9-]{2,40}$')
);

create index stores_owner_user_id_idx on stores (owner_user_id);

alter table stores enable row level security;

-- Every store-scoped RLS policy resolves the caller's store through this.
create function auth_store_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select id from stores where owner_user_id = auth.uid()
$$;

revoke all on function auth_store_id() from public;
grant execute on function auth_store_id() to authenticated;

-- Narrow, anon-readable slice of `stores` for resolving a storefront/landing
-- slug without exposing owner_user_id / owner_telegram_user_id publicly.
create view store_public with (security_invoker = true) as
  select id, slug, name, tagline from stores where is_active;

grant select on store_public to anon, authenticated;

-- One-time codes a seller sends to the bot in a plain (non-Business) chat to
-- link their Telegram account to their store. Short-lived, single-use.
create table telegram_link_codes (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores(id) on delete cascade,
  code text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table telegram_link_codes enable row level security;

alter table categories       add column store_id uuid not null references stores(id) on delete cascade;
alter table products         add column store_id uuid not null references stores(id) on delete cascade;
alter table customers        add column store_id uuid not null references stores(id) on delete cascade;
alter table sales            add column store_id uuid not null references stores(id) on delete cascade;
alter table delivery_zones   add column store_id uuid not null references stores(id) on delete cascade;
alter table product_variants add column store_id uuid not null references stores(id) on delete cascade;

-- Telegram tables: nullable. A connection/message/chat can arrive before the
-- seller finishes linking (see telegram_link_codes flow) — store_id fills in then.
alter table telegram_connections add column store_id uuid references stores(id) on delete set null;
alter table telegram_messages    add column store_id uuid references stores(id) on delete set null;
alter table telegram_chats       add column store_id uuid references stores(id) on delete set null;

-- Per-store uniqueness replaces global uniqueness: two independent sellers will
-- routinely reuse category names, product slugs, and SKU/barcode schemes.
alter table categories drop constraint categories_name_key;
alter table categories add constraint categories_store_name_key unique (store_id, name);

alter table products drop constraint products_slug_key;
alter table products add constraint products_store_slug_key unique (store_id, slug);

alter table product_variants drop constraint product_variants_sku_key;
alter table product_variants drop constraint product_variants_barcode_key;
create unique index product_variants_store_sku_key on product_variants (store_id, sku) where sku is not null;
create unique index product_variants_store_barcode_key on product_variants (store_id, barcode) where barcode is not null;

-- telegram_chats/telegram_messages: rebuild the key to include
-- business_connection_id (both tables are empty — a same-shape rebuild, not a
-- migration of real rows).
alter table telegram_chats alter column business_connection_id set not null;
alter table telegram_chats drop constraint telegram_chats_pkey;
alter table telegram_chats add primary key (business_connection_id, chat_id);

drop index telegram_messages_dedupe_idx;
create unique index telegram_messages_dedupe_idx
  on telegram_messages (business_connection_id, chat_id, telegram_message_id);

-- assistant_settings / shop_info: singleton -> per-store. Both hold only
-- default/empty values today (verified live), nothing worth preserving.
truncate assistant_settings;
alter table assistant_settings drop column id;
alter table assistant_settings add column store_id uuid primary key references stores(id) on delete cascade;

truncate shop_info;
alter table shop_info drop column id;
alter table shop_info add column store_id uuid primary key references stores(id) on delete cascade;
-- Where the seller's own alerts go — set by the Telegram linking flow (Ф2).
alter table shop_info add column notify_chat_id bigint;

commit;
