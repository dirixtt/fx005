import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/utils";

export default async function StorefrontHomePage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, slug, sale_price, image_url, stock_quantity")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-neutral-900">Shop our products</h1>

      {!products?.length && (
        <p className="text-neutral-500">No products available yet — check back soon.</p>
      )}

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
        {products?.map((p) => (
          <Link
            key={p.id}
            href={`/products/${p.slug}`}
            className="group rounded-lg border border-neutral-200 p-3 transition-colors hover:border-neutral-400"
          >
            <div className="mb-3 flex aspect-square items-center justify-center rounded-md bg-neutral-100 text-neutral-300">
              {p.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.image_url} alt={p.name} className="h-full w-full rounded-md object-cover" />
              ) : (
                <span className="text-xs">No image</span>
              )}
            </div>
            <p className="text-sm font-medium text-neutral-900 group-hover:underline">{p.name}</p>
            <p className="text-sm text-neutral-500">{formatMoney(p.sale_price)}</p>
            {p.stock_quantity <= 0 && <p className="text-xs text-red-600">Out of stock</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}
