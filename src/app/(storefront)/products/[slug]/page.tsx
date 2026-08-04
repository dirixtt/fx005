import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, PackageX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AddToCartButton } from "@/components/storefront/add-to-cart-button";
import { formatMoney } from "@/lib/utils";

const getProduct = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("products")
    .select("*, categories(id, name)")
    .eq("slug", slug)
    .maybeSingle();
  return data;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) return {};

  const description = product.description
    ? product.description.slice(0, 160)
    : `Купить ${product.name} за ${formatMoney(product.sale_price)} — в наличии в fx005.`;

  return {
    title: product.name,
    description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: {
      title: product.name,
      description,
      images: product.image_url ? [{ url: product.image_url }] : undefined,
    },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description ?? undefined,
    image: product.image_url ?? undefined,
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: product.sale_price,
      availability:
        product.stock_quantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="space-y-6">
        <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-brand-700">
          <ChevronLeft className="h-4 w-4" /> Назад к каталогу
        </Link>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
          <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-neutral-200 bg-neutral-100 text-neutral-300">
            {product.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <PackageX className="h-16 w-16" strokeWidth={1.25} />
            )}
          </div>
          <div className="space-y-5">
            {product.categories?.name && (
              <Link
                href={`/?category=${product.categories.id}`}
                className="inline-block rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100"
              >
                {product.categories.name}
              </Link>
            )}
            <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">{product.name}</h1>
            <p className="text-3xl font-bold text-brand-700">{formatMoney(product.sale_price)}</p>
            {product.description && <p className="leading-relaxed text-neutral-600">{product.description}</p>}

            {product.stock_quantity > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-neutral-500">В наличии: {product.stock_quantity} шт.</p>
                <AddToCartButton
                  product={{
                    id: product.id,
                    name: product.name,
                    slug: product.slug,
                    sale_price: product.sale_price,
                    image_url: product.image_url,
                  }}
                />
              </div>
            ) : (
              <p className="inline-block rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                Нет в наличии
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
