import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import type { VariantLike } from "@/lib/variants";

/**
 * Turning what a customer typed into a row in the catalogue.
 *
 * This is the half of the assistant that the model is deliberately kept out of.
 * The model reports the words ("бомбер", "42"); everything below decides what
 * those words point at, and if it cannot decide, the answer is "hand it to the
 * seller" rather than a best guess.
 */

export type CatalogProduct = {
  id: string;
  name: string;
  variants: VariantLike[];
};

export type ProductResolution =
  /** Exactly one product matched — safe to answer about. */
  | { status: "resolved"; product: CatalogProduct }
  /** Several matched. We can list them from the database, but not pick one. */
  | { status: "ambiguous"; products: CatalogProduct[] }
  /** Nothing matched, or nothing was named and the chat has no history. */
  | { status: "unknown" };

const VARIANT_COLUMNS = "id, size, color, sale_price, stock_quantity";
const MAX_MATCHES = 5;

/**
 * Strips everything that is not a letter, digit, space or hyphen.
 *
 * Two reasons, and the second is the important one. Cosmetically, "бомбер?" and
 * "бомбер" should find the same thing. Structurally, PostgREST encodes filters in
 * the query string, where commas separate arguments and parentheses group them —
 * a product name pasted in raw can therefore change the shape of the query rather
 * than just its value. Restricting the term to harmless characters removes that
 * whole class of problem instead of trying to escape it.
 *
 * Returns null for anything too short to be a real search: a single character
 * matches most of the catalogue, which is worse than not answering.
 */
export function sanitizeSearchTerm(input: string | null | undefined): string | null {
  if (!input) return null;

  const cleaned = input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);

  return cleaned.length >= 2 ? cleaned : null;
}

/**
 * Compares two sizes the way a person would: "42 " and "42" are the same size,
 * and so are "m" and "M".
 *
 * Nothing cleverer than that — no mapping between EU, UK and letter sizing. A bot
 * that decides M means 46 will eventually ship the wrong thing, and the seller
 * who typed the sizes in is the one who knows which system they meant.
 */
export function sizesMatch(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, "");
  return normalize(a) === normalize(b);
}

export function findVariantBySize(variants: VariantLike[], size: string | null): VariantLike | null {
  if (!size) return null;
  return variants.find((variant) => sizesMatch(variant.size, size)) ?? null;
}

/** Sizes that are actually orderable right now, in the seller's own order. */
export function availableSizes(variants: VariantLike[]): string[] {
  const seen = new Set<string>();
  const sizes: string[] = [];
  for (const variant of variants) {
    if (variant.stock_quantity > 0 && variant.size && !seen.has(variant.size)) {
      seen.add(variant.size);
      sizes.push(variant.size);
    }
  }
  return sizes;
}

type Client = SupabaseClient<Database>;

async function loadProducts(supabase: Client, ids: string[]): Promise<CatalogProduct[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("products")
    .select(`id, name, product_variants (${VARIANT_COLUMNS})`)
    .in("id", ids)
    .eq("is_active", true);

  if (error) {
    console.error("[catalog] failed to load products", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    variants: row.product_variants ?? [],
  }));
}

/** Searches by product name, and by variant SKU or barcode for quoted articles. */
async function searchProductIds(supabase: Client, term: string): Promise<string[]> {
  // Resellers quote article numbers constantly ("1024 bormi"), and those live on
  // the variant, not the product. Only a single token can be a code, which also
  // keeps the term out of PostgREST's comma-separated `or` grammar entirely.
  const code = term.includes(" ") ? null : term;

  const [byName, bySku, byBarcode] = await Promise.all([
    supabase
      .from("products")
      .select("id")
      .eq("is_active", true)
      .ilike("name", `%${term}%`)
      .limit(MAX_MATCHES + 1),
    // Exact match, not partial: a SKU that merely contains "1024" is a different
    // article, and offering it would be the bot inventing a match.
    code
      ? supabase.from("product_variants").select("product_id").eq("sku", code).limit(MAX_MATCHES + 1)
      : null,
    code
      ? supabase
          .from("product_variants")
          .select("product_id")
          .eq("barcode", code)
          .limit(MAX_MATCHES + 1)
      : null,
  ]);

  const ids = new Set<string>();
  for (const row of byName.data ?? []) ids.add(row.id);
  for (const row of bySku?.data ?? []) ids.add(row.product_id);
  for (const row of byBarcode?.data ?? []) ids.add(row.product_id);
  return [...ids];
}

/**
 * Works out which product the customer means.
 *
 * Their own words win; the last product discussed in this chat is the fallback,
 * because "42 bormi" sent under a photo names nothing at all and the previous
 * turn is the only context that exists.
 */
export async function resolveProduct(
  supabase: Client,
  options: { query: string | null; lastProductId: string | null },
): Promise<ProductResolution> {
  const term = sanitizeSearchTerm(options.query);

  if (term) {
    const ids = await searchProductIds(supabase, term);

    if (ids.length === 1) {
      const [product] = await loadProducts(supabase, ids);
      if (product) return { status: "resolved", product };
    }

    if (ids.length > 1) {
      const products = await loadProducts(supabase, ids.slice(0, MAX_MATCHES));
      // One survivor after the is_active filter is still an unambiguous answer.
      if (products.length === 1) return { status: "resolved", product: products[0] };
      if (products.length > 1) return { status: "ambiguous", products };
    }
  }

  // Either they named nothing, or they named something the catalogue does not
  // have. Both fall back to what this conversation was already about.
  if (options.lastProductId) {
    const [product] = await loadProducts(supabase, [options.lastProductId]);
    if (product) return { status: "resolved", product };
  }

  return { status: "unknown" };
}
