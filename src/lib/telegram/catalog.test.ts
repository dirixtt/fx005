import { describe, expect, it } from "vitest";
import {
  availableSizes,
  findVariantBySize,
  sanitizeSearchTerm,
  sizesMatch,
} from "@/lib/telegram/catalog";
import type { VariantLike } from "@/lib/variants";

const variant = (over: Partial<VariantLike> & { id: string }): VariantLike => ({
  size: null,
  color: null,
  sale_price: 100_000,
  stock_quantity: 1,
  ...over,
});

describe("sanitizeSearchTerm", () => {
  it("keeps ordinary words in either script", () => {
    expect(sanitizeSearchTerm("Бомбер")).toBe("бомбер");
    expect(sanitizeSearchTerm("Krossovka")).toBe("krossovka");
  });

  it("drops the punctuation people type around a question", () => {
    expect(sanitizeSearchTerm("бомбер?")).toBe("бомбер");
    expect(sanitizeSearchTerm("  куртка!!  ")).toBe("куртка");
  });

  it("strips characters that would change the shape of a PostgREST filter", () => {
    // Not cosmetic: commas separate arguments and parentheses group them in the
    // query string, so a raw value here could rewrite the query rather than fill it.
    expect(sanitizeSearchTerm("shoes,(or.id.eq.1)")).toBe("shoes or id eq 1");
    expect(sanitizeSearchTerm("100% cotton")).toBe("100 cotton");
  });

  it("refuses a term too short to mean anything", () => {
    // One character matches most of a catalogue; answering about a random product
    // is worse than staying quiet.
    expect(sanitizeSearchTerm("a")).toBeNull();
    expect(sanitizeSearchTerm("?")).toBeNull();
    expect(sanitizeSearchTerm("")).toBeNull();
    expect(sanitizeSearchTerm(null)).toBeNull();
  });
});

describe("sizesMatch", () => {
  it("ignores case and stray spaces", () => {
    expect(sizesMatch("42", " 42 ")).toBe(true);
    expect(sizesMatch("M", "m")).toBe(true);
    expect(sizesMatch("XL", "xl")).toBe(true);
  });

  it("does not translate between sizing systems", () => {
    // A bot that decides M means 46 eventually ships the wrong thing. The seller
    // who typed the sizes in is the one who knows which system they meant.
    expect(sizesMatch("M", "46")).toBe(false);
    expect(sizesMatch("42", "43")).toBe(false);
  });

  it("treats a missing size as no match", () => {
    expect(sizesMatch(null, "42")).toBe(false);
    expect(sizesMatch("42", null)).toBe(false);
  });
});

describe("findVariantBySize", () => {
  const variants = [
    variant({ id: "a", size: "41", stock_quantity: 0 }),
    variant({ id: "b", size: "42", stock_quantity: 3 }),
  ];

  it("finds the size regardless of how it was typed", () => {
    expect(findVariantBySize(variants, " 42 ")?.id).toBe("b");
  });

  it("returns a sold-out variant rather than pretending it does not exist", () => {
    // The caller distinguishes "no such size" from "that size is gone"; collapsing
    // them here would lose the difference.
    expect(findVariantBySize(variants, "41")?.id).toBe("a");
  });

  it("returns nothing for a size that was never stocked", () => {
    expect(findVariantBySize(variants, "50")).toBeNull();
    expect(findVariantBySize(variants, null)).toBeNull();
  });
});

describe("availableSizes", () => {
  it("lists only what can actually be ordered", () => {
    const variants = [
      variant({ id: "a", size: "40", stock_quantity: 2 }),
      variant({ id: "b", size: "41", stock_quantity: 0 }),
      variant({ id: "c", size: "42", stock_quantity: 5 }),
    ];
    // Offering 41 here is how a shop promises something it cannot ship.
    expect(availableSizes(variants)).toEqual(["40", "42"]);
  });

  it("deduplicates a size stocked in several colours", () => {
    const variants = [
      variant({ id: "a", size: "42", color: "чёрный", stock_quantity: 1 }),
      variant({ id: "b", size: "42", color: "белый", stock_quantity: 2 }),
    ];
    expect(availableSizes(variants)).toEqual(["42"]);
  });

  it("is empty for a product with no sizes", () => {
    expect(availableSizes([variant({ id: "a", stock_quantity: 4 })])).toEqual([]);
  });
});
