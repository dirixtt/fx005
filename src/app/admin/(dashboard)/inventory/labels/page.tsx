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
  const { data: products } = idList.length
    ? await supabase
        .from("products")
        .select("id, name, sale_price, barcode, sku, slug")
        .in("id", idList)
    : { data: [] };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-neutral-900">Печать ценников</h1>
      <LabelsPrintView products={products ?? []} />
    </div>
  );
}
