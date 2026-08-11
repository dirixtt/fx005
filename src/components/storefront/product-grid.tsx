"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { PackageX } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { priceRange, totalStock, type VariantLike } from "@/lib/variants";
import { useStore } from "@/lib/store-context";

type Product = {
  id: string;
  name: string;
  slug: string;
  image_url: string | null;
  product_variants: VariantLike[];
};

/**
 * Sizes of one model can differ in price, so a single figure would be a lie.
 * "от X" is shown only when they actually disagree.
 */
function priceLabel(product: Product): string {
  const range = priceRange(product.product_variants);
  if (!range) return "—";
  return range.mixed ? `от ${formatMoney(range.min)}` : formatMoney(range.min);
}

export function ProductGrid({ products }: { products: Product[] }) {
  const store = useStore();

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {products.map((p) => (
        <motion.div
          key={p.id}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "100px" }}
          transition={{ duration: 0.25 }}
        >
          <Link
            href={`/s/${store.slug}/products/${p.slug}`}
            className="group flex h-full flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-md"
          >
            <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-neutral-100 text-neutral-300">
              {p.image_url ? (
                <Image
                  src={p.image_url}
                  alt={p.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 25vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              ) : (
                <PackageX className="h-8 w-8" strokeWidth={1.5} />
              )}
              {totalStock(p.product_variants) <= 0 && (
                <span className="absolute left-2 top-2 rounded-full bg-neutral-900/80 px-2 py-0.5 text-[10px] font-medium text-white">
                  Нет в наличии
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1 p-3">
              <p className="line-clamp-2 flex-1 text-sm font-medium text-neutral-900 group-hover:text-brand-700">
                {p.name}
              </p>
              <p className="text-sm font-semibold text-brand-700">{priceLabel(p)}</p>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
