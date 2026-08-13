"use client";

import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { Printer } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";
import { variantLabel } from "@/lib/variants";
import type { AppLocale } from "@/lib/i18n/locale";

type LabelVariant = {
  id: string;
  size: string | null;
  color: string | null;
  sale_price: number;
  barcode: string | null;
  sku: string | null;
  products: { name: string; slug: string };
};

function LabelCard({ variant }: { variant: LabelVariant }) {
  const locale = useLocale() as AppLocale;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Falls back through the identifiers most likely to be scannable. The variant
  // id is last because it is a UUID — encodable, but unreadable to a human
  // checking a tag against the shelf.
  const code = variant.barcode || variant.sku || variant.id;

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
      <p className="line-clamp-2 min-h-8 text-xs font-medium text-neutral-900">
        {variant.products.name}
      </p>
      <p className="text-xs font-semibold text-neutral-500">{variantLabel(variant)}</p>
      <p className="text-lg font-bold text-neutral-900">{formatMoney(variant.sale_price, locale)}</p>
      <canvas ref={canvasRef} />
    </div>
  );
}

export function LabelsPrintView({ variants }: { variants: LabelVariant[] }) {
  const t = useTranslations("inventory");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/admin/inventory" className="text-sm text-neutral-500 hover:text-brand-700 hover:underline">
          {t("backToInventory")}
        </Link>
        <Button type="button" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> {t("print")}
        </Button>
      </div>

      {variants.length === 0 ? (
        <p className="text-neutral-500">{t("noProductsSelected")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-3 print:gap-2">
          {variants.map((v) => (
            <LabelCard key={v.id} variant={v} />
          ))}
        </div>
      )}
    </div>
  );
}
