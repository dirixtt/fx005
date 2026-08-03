"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { Printer } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";

type LabelProduct = {
  id: string;
  name: string;
  sale_price: number;
  barcode: string | null;
  sku: string | null;
  slug: string;
};

function LabelCard({ product }: { product: LabelProduct }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const code = product.barcode || product.sku || product.slug;

  useEffect(() => {
    if (!canvasRef.current) return;
    try {
      JsBarcode(canvasRef.current, code, {
        format: "CODE128",
        width: 1.6,
        height: 40,
        fontSize: 12,
        margin: 4,
        displayValue: true,
      });
    } catch {
      // fall back silently if the code has characters CODE128 can't encode
    }
  }, [code]);

  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-neutral-300 p-3 text-center print:break-inside-avoid">
      <p className="line-clamp-2 min-h-8 text-xs font-medium text-neutral-900">{product.name}</p>
      <p className="text-lg font-bold text-neutral-900">{formatMoney(product.sale_price)}</p>
      <canvas ref={canvasRef} />
    </div>
  );
}

export function LabelsPrintView({ products }: { products: LabelProduct[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/admin/inventory" className="text-sm text-neutral-500 hover:text-brand-700 hover:underline">
          ← Назад к складу
        </Link>
        <Button type="button" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Печать
        </Button>
      </div>

      {products.length === 0 ? (
        <p className="text-neutral-500">Товары не выбраны.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3 print:gap-2">
          {products.map((p) => (
            <LabelCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
