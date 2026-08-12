import { createClient } from "@/lib/supabase/server";
import { PosClient } from "@/components/admin/pos-client";

export default async function PosPage() {
  const supabase = await createClient();

  // The till sells variants, not products: the thing scanned at the counter is one
  // size of one model, and that is what carries the barcode, price and stock.
  const [{ data: variants }, { data: customers }] = await Promise.all([
    supabase
      .from("product_variants")
      .select("id, size, color, sku, barcode, sale_price, stock_quantity, products!inner(name, is_active)")
      .eq("products.is_active", true)
      .order("sale_price"),
    supabase.from("customers").select("id, full_name, phone").order("full_name"),
  ]);

  const rows = (variants ?? []).map((v) => ({
    id: v.id,
    name: v.products.name,
    size: v.size,
    color: v.color,
    sku: v.sku,
    barcode: v.barcode,
    sale_price: v.sale_price,
    stock_quantity: v.stock_quantity,
  }));

  // Sorted here rather than in SQL: ordering by the embedded product name is not
  // expressible in a PostgREST order clause.
  rows.sort((a, b) => a.name.localeCompare(b.name, "ru"));

  return <PosClient variants={rows} customers={customers ?? []} />;
}
