"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tag } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { archiveProduct, restoreProduct } from "@/lib/actions/products";
import { formatMoney, cn } from "@/lib/utils";
import { priceRange, totalStock, variantLabel } from "@/lib/variants";
import type { Tables } from "@/lib/types/database.types";
import type { AppLocale } from "@/lib/i18n/locale";

type Product = Tables<"products"> & {
  categories: { id: string; name: string } | null;
  product_variants: Tables<"product_variants">[];
};

export function InventoryTable({ products }: { products: Product[] }) {
  const t = useTranslations("inventory");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  /** "от 500 UZS" when sizes disagree on price, a single figure when they don't. */
  function formatPrice(product: Product): string {
    const range = priceRange(product.product_variants);
    if (!range) return "—";
    return range.mixed
      ? t("priceFrom", { price: formatMoney(range.min, locale) })
      : formatMoney(range.min, locale);
  }

  const allSelected = products.length > 0 && selected.size === products.length;

  function toggle(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(products.map((p) => p.id)));
  }

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  return (
    <div className="space-y-3">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-neutral-300"
                checked={allSelected}
                onChange={toggleAll}
                aria-label={t("selectAll")}
              />
            </TableHead>
            <TableHead>{t("colName")}</TableHead>
            <TableHead>{t("colCategory")}</TableHead>
            <TableHead>{t("colSizes")}</TableHead>
            <TableHead>{t("colPrice")}</TableHead>
            <TableHead>{t("colStock")}</TableHead>
            <TableHead>{t("colStatus")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((p) => (
            <TableRow key={p.id}>
              <TableCell>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-neutral-300"
                  checked={selected.has(p.id)}
                  onChange={() => toggle(p.id)}
                  aria-label={t("selectOne", { name: p.name })}
                />
              </TableCell>
              <TableCell className="font-medium">
                <Link href={`/admin/inventory/${p.id}`} className="hover:text-brand-700 hover:underline">
                  {p.name}
                </Link>
              </TableCell>
              <TableCell className="text-neutral-500">{p.categories?.name ?? "—"}</TableCell>
              <TableCell className="text-neutral-500">
                {/* Sizes with nothing left are greyed rather than hidden: the seller
                    needs to see that 42 exists and is out, not that it vanished. */}
                <div className="flex flex-wrap gap-1">
                  {p.product_variants.map((v) => (
                    <span
                      key={v.id}
                      className={cn(
                        "rounded px-1.5 py-0.5 text-xs",
                        v.stock_quantity > 0
                          ? "bg-neutral-100 text-neutral-700"
                          : "bg-neutral-50 text-neutral-300 line-through",
                      )}
                    >
                      {variantLabel(v)}
                    </span>
                  ))}
                </div>
              </TableCell>
              <TableCell className="font-medium text-brand-700">{formatPrice(p)}</TableCell>
              <TableCell>
                {totalStock(p.product_variants) <= 5 ? (
                  <Badge variant="warning">{t("lowStockBadge", { count: totalStock(p.product_variants) })}</Badge>
                ) : (
                  totalStock(p.product_variants)
                )}
              </TableCell>
              <TableCell>
                {p.is_active ? (
                  <Badge variant="success">{t("statusActive")}</Badge>
                ) : (
                  <Badge variant="secondary">{t("statusArchived")}</Badge>
                )}
              </TableCell>
              <TableCell>
                <form action={p.is_active ? archiveProduct.bind(null, p.id) : restoreProduct.bind(null, p.id)}>
                  <Button type="submit" variant="ghost" size="sm">
                    {p.is_active ? t("actionArchive") : t("actionRestore")}
                  </Button>
                </form>
              </TableCell>
            </TableRow>
          ))}
          {!products.length && (
            <TableRow>
              <TableCell colSpan={8} className={cn("py-8 text-center text-neutral-500")}>
                {t("empty")}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {selectedIds.length > 0 && (
        <div className="sticky bottom-4 flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3 shadow-lg">
          <span className="pl-2 text-sm font-medium text-neutral-700">
            {t("selectedCount", { count: selectedIds.length })}
          </span>
          <Button
            type="button"
            onClick={() => router.push(`/admin/inventory/labels?ids=${selectedIds.join(",")}`)}
          >
            <Tag className="h-4 w-4" /> {t("printLabels")}
          </Button>
        </div>
      )}
    </div>
  );
}
