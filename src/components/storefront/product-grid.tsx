"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { PackageX } from "lucide-react";
import { formatMoney } from "@/lib/utils";

type Product = {
  id: string;
  name: string;
  slug: string;
  sale_price: number;
  image_url: string | null;
  stock_quantity: number;
};

export function ProductGrid({ products }: { products: Product[] }) {
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
            href={`/products/${p.slug}`}
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
              {p.stock_quantity <= 0 && (
                <span className="absolute left-2 top-2 rounded-full bg-neutral-900/80 px-2 py-0.5 text-[10px] font-medium text-white">
                  Нет в наличии
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-1 p-3">
              <p className="line-clamp-2 flex-1 text-sm font-medium text-neutral-900 group-hover:text-brand-700">
                {p.name}
              </p>
              <p className="text-sm font-semibold text-brand-700">{formatMoney(p.sale_price)}</p>
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
