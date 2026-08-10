-- Rollback for 0002_product_variants.sql
--
-- Collapses each product back to a single price and stock level. This is exact
-- only while every product still has the one variant the backfill created. Once a
-- seller has added real sizes there is no honest way to squeeze several variants
-- into one row, so this picks the cheapest variant's prices and sums the stock,
-- and the size/colour breakdown is lost. Treat it as an escape hatch for the
-- period right after the migration, not as a supported downgrade.

begin;

alter table products add column sku text;
alter table products add column barcode text;
alter table products add column cost_price numeric(12, 2) not null default 0;
alter table products add column sale_price numeric(12, 2) not null default 0;
alter table products add column stock_quantity integer not null default 0;

with collapsed as (
  select
    product_id,
    sum(stock_quantity) as stock_quantity,
    min(sale_price) as sale_price,
    -- Cost is taken from the same row the price came from, so margin stays coherent.
    (array_agg(cost_price order by sale_price, id))[1] as cost_price,
    (array_agg(sku order by sale_price, id))[1] as sku,
    (array_agg(barcode order by sale_price, id))[1] as barcode
  from product_variants
  group by product_id
)
update products p
   set stock_quantity = c.stock_quantity,
       sale_price = c.sale_price,
       cost_price = c.cost_price,
       sku = c.sku,
       barcode = c.barcode
  from collapsed c
 where c.product_id = p.id;

alter table products add constraint products_sku_key unique (sku);
alter table products add constraint products_barcode_key unique (barcode);
create index products_barcode_idx on products (barcode);

drop index if exists sale_items_variant_idx;
alter table sale_items drop column if exists variant_color;
alter table sale_items drop column if exists variant_size;
alter table sale_items drop column if exists variant_id;

drop table if exists product_variants;

commit;
