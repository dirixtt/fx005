"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Tables } from "@/lib/types/database.types";

type Variant = Tables<"product_variants">;

type Row = {
  /** Present only for variants that already exist in the database. */
  id?: string;
  /** Stable key for React across insertions and removals; never submitted. */
  key: string;
  size: string;
  color: string;
  sku: string;
  barcode: string;
  cost_price: string;
  sale_price: string;
  stock_quantity: string;
};

function toRow(variant: Variant): Row {
  return {
    id: variant.id,
    key: variant.id,
    size: variant.size ?? "",
    color: variant.color ?? "",
    sku: variant.sku ?? "",
    barcode: variant.barcode ?? "",
    cost_price: String(variant.cost_price),
    sale_price: String(variant.sale_price),
    stock_quantity: String(variant.stock_quantity),
  };
}

function emptyRow(): Row {
  return {
    key: crypto.randomUUID(),
    size: "",
    color: "",
    sku: "",
    barcode: "",
    cost_price: "0",
    sale_price: "0",
    stock_quantity: "0",
  };
}

/**
 * Editor for a product's sellable sizes.
 *
 * Inputs are named `variants[i][field]` so the whole set arrives in one FormData
 * submission alongside the product itself — the server action reassembles them by
 * index, which is why removing a row cannot shift another row's stock.
 */
export function VariantEditor({ variants }: { variants?: Variant[] }) {
  const t = useTranslations("inventory");
  const [rows, setRows] = useState<Row[]>(
    variants && variants.length > 0 ? variants.map(toRow) : [emptyRow()],
  );

  function update(key: string, field: keyof Row, value: string) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, [field]: value } : row)),
    );
  }

  function remove(key: string) {
    // Never drop to zero rows: a product with no variants has no price and
    // cannot be sold, and the server rejects it anyway.
    setRows((current) => (current.length <= 1 ? current : current.filter((r) => r.key !== key)));
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{t("variantsLabel")}</Label>
        <Button type="button" variant="outline" size="sm" onClick={() => setRows((c) => [...c, emptyRow()])}>
          <Plus className="h-4 w-4" /> {t("addVariant")}
        </Button>
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={row.key} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            {row.id && <input type="hidden" name={`variants[${index}][id]`} value={row.id} />}

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Field
                label={t("sizeLabel")}
                name={`variants[${index}][size]`}
                value={row.size}
                placeholder={t("sizePlaceholder")}
                onChange={(v) => update(row.key, "size", v)}
              />
              <Field
                label={t("colorLabel")}
                name={`variants[${index}][color]`}
                value={row.color}
                placeholder={t("colorPlaceholder")}
                onChange={(v) => update(row.key, "color", v)}
              />
              <Field
                label={t("skuLabel")}
                name={`variants[${index}][sku]`}
                value={row.sku}
                onChange={(v) => update(row.key, "sku", v)}
              />
              <Field
                label={t("barcodeLabel")}
                name={`variants[${index}][barcode]`}
                value={row.barcode}
                onChange={(v) => update(row.key, "barcode", v)}
              />
            </div>

            <div className="mt-2 flex flex-wrap items-end gap-2">
              <Field
                label={t("costPriceLabel")}
                name={`variants[${index}][cost_price]`}
                value={row.cost_price}
                type="number"
                onChange={(v) => update(row.key, "cost_price", v)}
                className="w-32"
              />
              <Field
                label={t("salePriceLabel")}
                name={`variants[${index}][sale_price]`}
                value={row.sale_price}
                type="number"
                required
                onChange={(v) => update(row.key, "sale_price", v)}
                className="w-32"
              />
              <Field
                label={t("stockLabel")}
                name={`variants[${index}][stock_quantity]`}
                value={row.stock_quantity}
                type="number"
                step="1"
                required
                onChange={(v) => update(row.key, "stock_quantity", v)}
                className="w-28"
              />

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="ml-auto text-neutral-400 hover:text-red-600"
                onClick={() => remove(row.key)}
                disabled={rows.length <= 1}
                aria-label={t("removeVariant")}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-neutral-500">{t("noVariantsHint")}</p>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  step,
  placeholder,
  required,
  className,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  step?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </span>
      <Input
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        type={type}
        step={step ?? (type === "number" ? "0.01" : undefined)}
        min={type === "number" ? "0" : undefined}
        placeholder={placeholder}
        required={required}
      />
    </div>
  );
}
