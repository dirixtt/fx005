"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { archiveProduct, restoreProduct } from "@/lib/actions/products";
import { formatMoney, cn } from "@/lib/utils";
import type { Tables } from "@/lib/types/database.types";

type Product = Tables<"products"> & { categories: { id: string; name: string } | null };

export function InventoryTable({ products }: { products: Product[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());

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
                aria-label="Выбрать все"
              />
            </TableHead>
            <TableHead>Название</TableHead>
            <TableHead>Категория</TableHead>
            <TableHead>Штрихкод</TableHead>
            <TableHead>Себестоимость</TableHead>
            <TableHead>Цена</TableHead>
            <TableHead>Остаток</TableHead>
            <TableHead>Статус</TableHead>
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
                  aria-label={`Выбрать ${p.name}`}
                />
              </TableCell>
              <TableCell className="font-medium">
                <Link href={`/admin/inventory/${p.id}`} className="hover:text-brand-700 hover:underline">
                  {p.name}
                </Link>
              </TableCell>
              <TableCell className="text-neutral-500">{p.categories?.name ?? "—"}</TableCell>
              <TableCell className="text-neutral-500">{p.barcode ?? "—"}</TableCell>
              <TableCell>{formatMoney(p.cost_price)}</TableCell>
              <TableCell className="font-medium text-brand-700">{formatMoney(p.sale_price)}</TableCell>
              <TableCell>
                {p.stock_quantity <= 5 ? (
                  <Badge variant="warning">{p.stock_quantity} мало</Badge>
                ) : (
                  p.stock_quantity
                )}
              </TableCell>
              <TableCell>
                {p.is_active ? (
                  <Badge variant="success">Активен</Badge>
                ) : (
                  <Badge variant="secondary">В архиве</Badge>
                )}
              </TableCell>
              <TableCell>
                <form action={p.is_active ? archiveProduct.bind(null, p.id) : restoreProduct.bind(null, p.id)}>
                  <Button type="submit" variant="ghost" size="sm">
                    {p.is_active ? "В архив" : "Восстановить"}
                  </Button>
                </form>
              </TableCell>
            </TableRow>
          ))}
          {!products.length && (
            <TableRow>
              <TableCell colSpan={9} className={cn("py-8 text-center text-neutral-500")}>
                Товары не найдены.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {selectedIds.length > 0 && (
        <div className="sticky bottom-4 flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-3 shadow-lg">
          <span className="pl-2 text-sm font-medium text-neutral-700">Выбрано: {selectedIds.length}</span>
          <Button
            type="button"
            onClick={() => router.push(`/admin/inventory/labels?ids=${selectedIds.join(",")}`)}
          >
            <Tag className="h-4 w-4" /> Печать ценников
          </Button>
        </div>
      )}
    </div>
  );
}
