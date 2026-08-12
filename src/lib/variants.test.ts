import { describe, expect, it } from "vitest";
import {
  defaultVariant,
  distinctSizes,
  inStock,
  priceRange,
  totalStock,
  variantLabel,
  type VariantLike,
} from "@/lib/variants";

function v(overrides: Partial<VariantLike> = {}): VariantLike {
  return { id: "1", size: null, color: null, sale_price: 100, stock_quantity: 1, ...overrides };
}

describe("variantLabel", () => {
  it("joins size and colour", () => {
    expect(variantLabel({ size: "42", color: "чёрный" })).toBe("42 / чёрный");
  });

  it("shows whichever axis exists on its own", () => {
    expect(variantLabel({ size: "42", color: null })).toBe("42");
    expect(variantLabel({ size: null, color: "чёрный" })).toBe("чёрный");
  });

  it("falls back to a dash for backfilled variants that have neither", () => {
    expect(variantLabel({ size: null, color: null })).toBe("—");
  });

  it("treats blank strings as absent rather than printing a stray separator", () => {
    expect(variantLabel({ size: "  ", color: "чёрный" })).toBe("чёрный");
  });
});

describe("priceRange", () => {
  it("returns a single price when every available variant agrees", () => {
    expect(priceRange([v({ sale_price: 500 }), v({ id: "2", sale_price: 500 })])).toEqual({
      min: 500,
      max: 500,
      mixed: false,
    });
  });

  it("flags a spread so the UI can render 'from X'", () => {
    expect(priceRange([v({ sale_price: 500 }), v({ id: "2", sale_price: 900 })])).toMatchObject({
      min: 500,
      max: 900,
      mixed: true,
    });
  });

  it("ignores sold-out variants, so the shop never advertises a price it cannot honour", () => {
    const range = priceRange([
      v({ id: "cheap", sale_price: 100, stock_quantity: 0 }),
      v({ id: "left", sale_price: 900, stock_quantity: 3 }),
    ]);

    expect(range).toMatchObject({ min: 900, max: 900, mixed: false });
  });

  it("still reports a price when everything is sold out rather than showing blank", () => {
    const range = priceRange([
      v({ sale_price: 100, stock_quantity: 0 }),
      v({ id: "2", sale_price: 300, stock_quantity: 0 }),
    ]);

    expect(range).toMatchObject({ min: 100, max: 300 });
  });

  it("returns null for a product with no variants at all", () => {
    expect(priceRange([])).toBeNull();
  });
});

describe("stock helpers", () => {
  it("sums stock across sizes", () => {
    expect(totalStock([v({ stock_quantity: 2 }), v({ id: "2", stock_quantity: 5 })])).toBe(7);
  });

  it("filters to what is actually available", () => {
    expect(
      inStock([v({ id: "a", stock_quantity: 0 }), v({ id: "b", stock_quantity: 1 })]).map((x) => x.id),
    ).toEqual(["b"]);
  });
});

describe("distinctSizes", () => {
  it("deduplicates while preserving the seller's ordering", () => {
    expect(
      distinctSizes([
        v({ id: "1", size: "42" }),
        v({ id: "2", size: "41" }),
        v({ id: "3", size: "42", color: "белый" }),
      ]),
    ).toEqual(["42", "41"]);
  });

  it("skips variants with no size", () => {
    expect(distinctSizes([v({ size: null })])).toEqual([]);
  });
});

describe("defaultVariant", () => {
  it("picks the cheapest variant still in stock", () => {
    const chosen = defaultVariant([
      v({ id: "pricey", sale_price: 900 }),
      v({ id: "cheap", sale_price: 100 }),
    ]);

    expect(chosen?.id).toBe("cheap");
  });

  it("never preselects something sold out", () => {
    const chosen = defaultVariant([
      v({ id: "cheap-gone", sale_price: 100, stock_quantity: 0 }),
      v({ id: "available", sale_price: 900, stock_quantity: 2 }),
    ]);

    expect(chosen?.id).toBe("available");
  });

  it("returns null when the whole product is sold out", () => {
    expect(defaultVariant([v({ stock_quantity: 0 })])).toBeNull();
  });
});
