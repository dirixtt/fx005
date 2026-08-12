-- Step 2 of the roadmap: sizes and per-size stock.
--
-- A clothing reseller sells one model in many sizes, and "42 bormi?" is the
-- question the assistant exists to answer. A flat products row with a single
-- stock_quantity cannot express it, so price and stock move from the product
-- (the model) to the variant (the sellable SKU).
--
-- Existing products are NOT deleted. Each one is given a single variant carrying
-- its current price, stock, sku and barcode, so the catalogue survives intact and
-- there is exactly one source of truth for stock afterwards. Leaving the old
-- columns in place alongside the new table would have been less disruptive but
-- would create two places claiming to know the stock level, which is precisely
-- the bug this table is meant to prevent.
--
-- Rollback: see 0002_product_variants.down.sql

begin;

create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,

  size text,
  color text,

  -- Carried over from products, which held these unique. Identifiers belong to
  -- the thing you physically scan at the till, and that is the variant.
  sku text unique,
  barcode text unique,

  cost_price numeric(12, 2) not null default 0 check (cost_price >= 0),
  sale_price numeric(12, 2) not null check (sale_price >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table product_variants is 'Sellable SKU: a product in one size/colour. Stock and price live here, never on products.';

-- One row per size+colour of a model. COALESCE keeps this effective for products
-- that vary on a single axis (or none at all, as every backfilled row does),
-- where a plain unique index would let NULLs duplicate freely.
create unique index product_variants_combo_key
  on product_variants (product_id, coalesce(size, ''), coalesce(color, ''));

create index product_variants_product_idx on product_variants (product_id);
-- The storefront and the assistant both ask "what is actually available".
create index product_variants_in_stock_idx
  on product_variants (product_id) where stock_quantity > 0;
create index product_variants_barcode_idx on product_variants (barcode);

-- ---------------------------------------------------------------- backfill
insert into product_variants
  (product_id, size, color, sku, barcode, cost_price, sale_price, stock_quantity, created_at)
select id, null, null, sku, barcode, cost_price, sale_price, stock_quantity, created_at
from products;

-- ---------------------------------------------------------------- sale_items
alter table sale_items add column variant_id uuid references product_variants (id) on delete restrict;

-- Snapshotted next to the product_name/unit_price/unit_cost this table already
-- captures, so a past receipt still reads "42 / чёрный" after the variant is
-- renamed or removed. Continues the existing convention rather than inventing one.
alter table sale_items add column variant_size text;
alter table sale_items add column variant_color text;

-- Historic lines predate variants; each product has exactly one at this point,
-- so the mapping is unambiguous.
update sale_items i
   set variant_id = v.id
  from product_variants v
 where v.product_id = i.product_id;

create index sale_items_variant_idx on sale_items (variant_id);

-- ---------------------------------------------------------------- products
-- Dropped only after the backfill above has copied every value out.
alter table products drop constraint if exists products_sku_key;
alter table products drop constraint if exists products_barcode_key;
drop index if exists products_barcode_idx;

alter table products drop column sku;
alter table products drop column barcode;
alter table products drop column cost_price;
alter table products drop column sale_price;
alter table products drop column stock_quantity;

-- ---------------------------------------------------------------- RLS
alter table product_variants enable row level security;

-- Mirrors the single-owner policies the rest of the schema already uses.
create policy "owner full access product_variants" on product_variants
  for all to authenticated using (true) with check (true);

-- The storefront reads variants of publicly visible products only, matching the
-- existing "public read storefront products" policy.
create policy "public read storefront variants" on product_variants
  for select to anon
  using (exists (
    select 1 from products p
    where p.id = product_id and p.is_active and p.show_on_storefront
  ));

commit;
