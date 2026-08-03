import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AddToCartButton } from "@/components/storefront/add-to-cart-button";
import { formatMoney } from "@/lib/utils";

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!product) {
    notFound();
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      <div className="flex aspect-square items-center justify-center rounded-lg bg-neutral-100 text-neutral-300">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt={product.name} className="h-full w-full rounded-lg object-cover" />
        ) : (
          <span className="text-sm">No image</span>
        )}
      </div>
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-neutral-900">{product.name}</h1>
        <p className="text-xl text-neutral-700">{formatMoney(product.sale_price)}</p>
        {product.description && <p className="text-neutral-600">{product.description}</p>}
        {product.stock_quantity > 0 ? (
          <AddToCartButton
            product={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              sale_price: product.sale_price,
              image_url: product.image_url,
            }}
          />
        ) : (
          <p className="text-sm font-medium text-red-600">Out of stock</p>
        )}
      </div>
    </div>
  );
}
