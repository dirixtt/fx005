import { z } from "zod";

type T = (key: string) => string;

/**
 * A product is now the model — what it is called, what it looks like, where it
 * sits in the catalogue. Everything you can put a price on or count moved to the
 * variant, because a jacket does not have one stock level, each size does.
 *
 * Schemas are built per-request from a translation function rather than at
 * module scope, since validation messages are user-facing and need to follow
 * the seller's chosen interface language.
 */
export function createProductSchema(t: T) {
  return z.object({
    name: z.string().min(1, t("validationNameRequired")),
    category_id: z.string().optional(),
    description: z.string().optional(),
    show_on_storefront: z.coerce.boolean().optional(),
    image_url: z.string().optional(),
  });
}

export function createVariantSchema(t: T) {
  return z.object({
    // Kept so an existing variant is updated rather than replaced, which would
    // orphan the sale_items pointing at it.
    id: z.string().uuid().optional(),
    size: z.string().trim().optional(),
    color: z.string().trim().optional(),
    sku: z.string().trim().optional(),
    barcode: z.string().trim().optional(),
    cost_price: z.coerce.number().min(0, t("validationCostNonNegative")),
    sale_price: z.coerce.number().min(0, t("validationPriceNonNegative")),
    stock_quantity: z.coerce
      .number()
      .int(t("validationStockInteger"))
      .min(0, t("validationStockNonNegative")),
  });
}

export function createProductWithVariantsSchema(t: T) {
  return createProductSchema(t).extend({
    // At least one: a product with no variants has nothing to sell, would show no
    // price on the storefront, and could never be added to a cart.
    variants: z.array(createVariantSchema(t)).min(1, t("validationAtLeastOneVariant")),
  });
}

export type ProductFormValues = z.infer<ReturnType<typeof createProductSchema>>;
export type VariantFormValues = z.infer<ReturnType<typeof createVariantSchema>>;

/**
 * Reads the repeated `variants[i][field]` inputs the product form submits.
 *
 * Rows are collected by index rather than by position in the FormData, so
 * removing a row in the browser cannot shift another row's values onto the wrong
 * variant — which would silently move stock between sizes.
 */
export function parseVariantsFromFormData(formData: FormData): unknown[] {
  const byIndex = new Map<number, Record<string, FormDataEntryValue>>();

  for (const [key, value] of formData.entries()) {
    const match = key.match(/^variants\[(\d+)]\[(\w+)]$/);
    if (!match) continue;

    const index = Number(match[1]);
    const field = match[2];
    const row = byIndex.get(index) ?? {};
    row[field] = value;
    byIndex.set(index, row);
  }

  return Array.from(byIndex.entries())
    .sort(([a], [b]) => a - b)
    .map(([, row]) => ({
      id: row.id ? String(row.id) : undefined,
      size: row.size ? String(row.size) : undefined,
      color: row.color ? String(row.color) : undefined,
      sku: row.sku ? String(row.sku) : undefined,
      barcode: row.barcode ? String(row.barcode) : undefined,
      cost_price: row.cost_price ?? 0,
      sale_price: row.sale_price ?? 0,
      stock_quantity: row.stock_quantity ?? 0,
    }));
}
