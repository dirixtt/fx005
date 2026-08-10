-- Rollback for 0004_rpc_variants.sql
--
-- Only drops the variant-aware functions. Restoring the original pre-variant
-- definitions is NOT done here on purpose: those bodies read products.sale_price,
-- products.cost_price and products.stock_quantity, which do not exist again until
-- 0002_product_variants.down.sql has run.
--
-- Correct rollback order is therefore:
--   0003.down  →  0004.down  →  0002.down  →  0001.down
--
-- and the original function bodies are recreated at the end of 0002.down, where
-- the columns they depend on are back.

begin;

drop function if exists checkout_order(uuid, jsonb, text, text, text, text);
drop function if exists create_pos_sale(jsonb, payment_method, uuid);
drop function if exists cancel_online_order(uuid);

commit;
