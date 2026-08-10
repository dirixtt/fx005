import { createClient } from "@/lib/supabase/server";
import { LabelsPrintView } from "@/components/admin/labels-print-view";

export default async function InventoryLabelsPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids } = await searchParams;
  const idList = ids ? ids.split(",").filter(Boolean) : [];

  const supabase = await createClient();

  // One tag per variant, not per product: price and barcode belong to the size,
  // so a single tag for a jacket stocked in four sizes would be wrong on the shelf
  // and unscannable at the till.
  const { data: variants } = idList.length
    ? await supabase
        .from("product_variants")
        .select("id, size, color, sale_price, barcode, sku, products!inner(name, slug)")
        .in("product_id", idList)
        .order("product_id")
    : { data: [] };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900">Печать ценников</h1>
        <p className="text-sm text-neutral-500">
          {variants?.length ?? 0} ценников · по одному на каждый размер
        </p>
      </div>
      <LabelsPrintView variants={variants ?? []} />
    </div>
  );
}
