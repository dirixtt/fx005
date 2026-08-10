-- Size/colour variants.
--
-- Clothing resellers sell one model in many sizes, and the whole point of the
-- Telegram assistant is answering "42 bormi?" — which a flat products table with a
-- single stock_quantity cannot express. Price and stock therefore move off the
-- product (the model) and onto the variant (the sellable SKU).
--
-- Rollback: see 0002_product_variants.down.sql

begin;

create table product_variants (
  id uuid primary key default gen_random_uuid(),

  product_id uuid not null,
  -- Denormalised so RLS and the uniqueness rules below can be expressed without
  -- joining products on every row. The composite FK below is what keeps it honest:
  -- a variant physically cannot point at a product in another store.
  store_id uuid not null,

  size text,
  color text,
  sku text,
  barcode text,

  cost_price numeric(12, 2) not null default 0 check (cost_price >= 0),
  sale_price numeric(12, 2) not null check (sale_price >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  foreign key (product_id, store_id) references products (id, store_id) on delete cascade
);

comment on table product_variants is 'Sellable SKU: a product in one size/colour. Stock and price live here, not on products.';

-- One row per size+colour of a model. COALESCE keeps the constraint effective for
-- products that vary on only one axis (a hat with colours but no sizes), where a
-- plain unique index would let NULLs duplicate freely.
create unique index product_variants_combo_key
  on product_variants (product_id, coalesce(size, ''), coalesce(color, ''));

-- Barcodes and article numbers are unique per seller, not globally: two stores
-- may legitimately use the same internal SKU.
create unique index product_variants_store_sku_key
  on product_variants (store_id, sku) where sku is not null;
create unique index product_variants_store_barcode_key
  on product_variants (store_id, barcode) where barcode is not null;

-- Scanning at the till and the bot's stock lookup both hit these.
create index product_variants_product_idx on product_variants (product_id);
create index product_variants_store_idx   on product_variants (store_id);
create index product_variants_in_stock_idx
  on product_variants (store_id, stock_quantity) where stock_quantity > 0;

alter table product_variants enable row level security;

create policy "tenant access product_variants" on product_variants
  for all to authenticated
  using (store_id = auth_store_id()) with check (store_id = auth_store_id());

-- The storefront and the bot both read variants for publicly visible products.
create policy "public read storefront variants" on product_variants
  for select to anon
  using (exists (
    select 1 from products p
    where p.id = product_id and p.is_active and p.show_on_storefront
  ));

-- ------------------------------------------------- products becomes model-level
alter table products drop constraint if exists products_sku_key;
alter table products drop constraint if exists products_barcode_key;
drop index if exists products_barcode_idx;

alter table products drop column if exists sku;
alter table products drop column if exists barcode;
alter table products drop column if exists cost_price;
alter table products drop column if exists sale_price;
alter table products drop column if exists stock_quantity;

-- ------------------------------------------------- sale_items points at variants
alter table sale_items add column variant_id uuid references product_variants (id) on delete restrict;

-- Snapshotted alongside the product_name/unit_price/unit_cost this table already
-- captures, so a receipt still reads "42 / чёрный" after the variant is edited or
-- deleted. Continues the existing convention rather than inventing a new one.
alter table sale_items add column variant_size  text;
alter table sale_items add column variant_color text;

create index sale_items_variant_idx on sale_items (variant_id);

commit;
