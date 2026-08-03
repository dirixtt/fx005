import { createClient } from "@/lib/supabase/server";
import { PosClient } from "@/components/admin/pos-client";

export default async function PosPage() {
  const supabase = await createClient();

  const [{ data: products }, { data: customers }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, sku, barcode, sale_price, stock_quantity")
      .eq("is_active", true)
      .order("name"),
    supabase.from("customers").select("id, full_name, phone").order("full_name"),
  ]);

  return <PosClient products={products ?? []} customers={customers ?? []} />;
}
