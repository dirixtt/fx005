/**
 * Helpers for reasoning about a product's variants.
 *
 * Storefront, POS, inventory and the price-tag printer all need the same answers
 * — what does this cost, is any size left, what do I call this row — so they live
 * here rather than being re-derived slightly differently in each surface.
 */

export type VariantLike = {
  id: string;
  size: string | null;
  color: string | null;
  sale_price: number;
  stock_quantity: number;
};

/**
 * Human label for a variant: "42 / чёрный", "42", "чёрный", or a dash.
 *
 * Every product backfilled from the pre-variant catalogue has one variant with no
 * size and no colour, so the dash case is the common one today, not an edge case.
 */
export function variantLabel(variant: Pick<VariantLike, "size" | "color">): string {
  const parts = [variant.size, variant.color].filter(
    (part): part is string => typeof part === "string" && part.trim().length > 0,
  );
  return parts.length > 0 ? parts.join(" / ") : "—";
}

export function inStock(variants: VariantLike[]): VariantLike[] {
  return variants.filter((v) => v.stock_quantity > 0);
}

export function totalStock(variants: VariantLike[]): number {
  return variants.reduce((sum, v) => sum + v.stock_quantity, 0);
}

/**
 * Price to advertise for a product, and whether its variants disagree.
 *
 * Prices are taken from variants that are actually available where possible: a
 * listing that advertises a cheap size which sold out is a promise the shop
 * cannot keep. Only when nothing is left does it fall back to all variants, so
 * a sold-out product still shows a price instead of blank.
 */
export function priceRange(
  variants: VariantLike[],
): { min: number; max: number; mixed: boolean } | null {
  const available = inStock(variants);
  const basis = available.length > 0 ? available : variants;
  if (basis.length === 0) return null;

  const prices = basis.map((v) => v.sale_price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { min, max, mixed: min !== max };
}

/** Sizes are shown in the order the seller entered them, deduplicated. */
export function distinctSizes(variants: VariantLike[]): string[] {
  const seen = new Set<string>();
  const sizes: string[] = [];
  for (const v of variants) {
    if (v.size && !seen.has(v.size)) {
      seen.add(v.size);
      sizes.push(v.size);
    }
  }
  return sizes;
}

/**
 * The variant a "buy" button should default to: the cheapest one still in stock,
 * or nothing when the product is sold out.
 */
export function defaultVariant(variants: VariantLike[]): VariantLike | null {
  const available = inStock(variants);
  if (available.length === 0) return null;
  return available.reduce((best, v) => (v.sale_price < best.sale_price ? v : best));
}
