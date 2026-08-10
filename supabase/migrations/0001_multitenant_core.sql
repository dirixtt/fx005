-- Multi-tenant core: stores as the tenant boundary.
--
-- The app was built for a single owner: every RLS policy read `USING (true)` for
-- the `authenticated` role, which is why the Supabase linter flags all five tables
-- with `rls_policy_always_true`. That is safe with exactly one login and unsafe the
-- moment a second seller signs up, so tenancy has to land before anything else.
--
-- Existing business data is deleted deliberately (the catalogue was a tools shop;
-- the product is being rebuilt for clothing resellers). A JSON dump was taken first.
-- Auth users are NOT touched.
--
-- Rollback: see 0001_multitenant_core.down.sql

begin;

-- ---------------------------------------------------------------- wipe
-- Order matters: children first. Deleted rather than truncated so FK cascades
-- and any future audit triggers behave normally.
delete from sale_items;
delete from sales;
delete from customers;
delete from products;
delete from categories;

-- ---------------------------------------------------------------- stores
create table stores (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  owner_user_id uuid not null unique references auth.users (id) on delete cascade,

  -- Telegram identity of the seller, filled in by the pairing flow. Nullable
  -- because a store exists before the bot is ever connected.
  telegram_user_id bigint unique,
  pairing_code text unique,
  pairing_code_expires_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table stores is 'Tenant boundary. One owner per store for now; staff roles would add a store_members table without changing auth_store_id().';

-- Resolves the caller's tenant. SECURITY DEFINER so RLS policies on `stores`
-- itself cannot recurse into the policy that is currently being evaluated.
create or replace function auth_store_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from stores where owner_user_id = auth.uid();
$$;

comment on function auth_store_id is 'Store id owned by the current user, or null. Every tenant RLS policy is written against this.';

alter table stores enable row level security;

create policy "owner reads own store" on stores
  for select to authenticated
  using (owner_user_id = auth.uid());

create policy "owner updates own store" on stores
  for update to authenticated
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

-- Onboarding: a signed-in user may create exactly one store (the unique
-- constraint on owner_user_id enforces the "exactly one" part).
create policy "user creates own store" on stores
  for insert to authenticated
  with check (owner_user_id = auth.uid());

-- The public storefront resolves /s/<slug> before anyone is signed in.
create policy "public reads stores by slug" on stores
  for select to anon
  using (true);

-- ---------------------------------------------------------------- store_id
alter table categories add column store_id uuid not null references stores (id) on delete cascade;
alter table products   add column store_id uuid not null references stores (id) on delete cascade;
alter table customers  add column store_id uuid not null references stores (id) on delete cascade;
alter table sales      add column store_id uuid not null references stores (id) on delete cascade;

-- Names and slugs are only unique inside a store: two sellers may both stock
-- "Nike Air Force 1". The old global unique constraints would have made the
-- second seller's catalogue impossible to enter.
alter table categories drop constraint if exists categories_name_key;
create unique index categories_store_name_key on categories (store_id, name);

alter table products drop constraint if exists products_slug_key;
create unique index products_store_slug_key on products (store_id, slug);

create index categories_store_idx on categories (store_id);
create index products_store_idx   on products (store_id);
create index customers_store_idx  on customers (store_id);
create index sales_store_created_idx on sales (store_id, created_at desc);

-- Needed by product_variants' composite foreign key, which is what stops a
-- variant from being attached to a product in a different store.
alter table products add constraint products_id_store_key unique (id, store_id);

-- ---------------------------------------------------------------- RLS rewrite
drop policy if exists "owner full access categories" on categories;
drop policy if exists "owner full access products"   on products;
drop policy if exists "owner full access customers"  on customers;
drop policy if exists "owner full access sales"      on sales;
drop policy if exists "owner full access sale_items" on sale_items;

create policy "tenant access categories" on categories
  for all to authenticated
  using (store_id = auth_store_id()) with check (store_id = auth_store_id());

create policy "tenant access products" on products
  for all to authenticated
  using (store_id = auth_store_id()) with check (store_id = auth_store_id());

create policy "tenant access customers" on customers
  for all to authenticated
  using (store_id = auth_store_id()) with check (store_id = auth_store_id());

create policy "tenant access sales" on sales
  for all to authenticated
  using (store_id = auth_store_id()) with check (store_id = auth_store_id());

-- sale_items carries no store_id of its own; it inherits the tenant through its sale.
create policy "tenant access sale_items" on sale_items
  for all to authenticated
  using (exists (select 1 from sales s where s.id = sale_id and s.store_id = auth_store_id()))
  with check (exists (select 1 from sales s where s.id = sale_id and s.store_id = auth_store_id()));

commit;
