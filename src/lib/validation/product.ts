import { z } from "zod";

/**
 * A product is now the model — what it is called, what it looks like, where it
 * sits in the catalogue. Everything you can put a price on or count moved to the
 * variant, because a jacket does not have one stock level, each size does.
 */
export const productSchema = z.object({
  name: z.string().min(1, "Укажите название"),
  category_id: z.string().optional(),
  description: z.string().optional(),
  show_on_storefront: z.coerce.boolean().optional(),
  image_url: z.string().optional(),
});

export const variantSchema = z.object({
  // Kept so an existing variant is updated rather than replaced, which would
  // orphan the sale_items pointing at it.
  id: z.string().uuid().optional(),
  size: z.string().trim().optional(),
  color: z.string().trim().optional(),
  sku: z.string().trim().optional(),
  barcode: z.string().trim().optional(),
  cost_price: z.coerce.number().min(0, "Себестоимость не может быть отрицательной"),
  sale_price: z.coerce.number().min(0, "Цена не может быть отрицательной"),
  stock_quantity: z.coerce
    .number()
    .int("Остаток — целое число")
    .min(0, "Остаток не может быть отрицательным"),
});

export const productWithVariantsSchema = productSchema.extend({
  // At least one: a product with no variants has nothing to sell, would show no
  // price on the storefront, and could never be added to a cart.
  variants: z.array(variantSchema).min(1, "Добавьте хотя бы один вариант"),
});

export type ProductFormValues = z.infer<typeof productSchema>;
export type VariantFormValues = z.infer<typeof variantSchema>;

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
