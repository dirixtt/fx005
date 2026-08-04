import { describe, expect, it } from "vitest";
import { formatMoney, slugify } from "@/lib/utils";

// Non-breaking spaces are what Intl emits as the ru-RU group separator.
const normalize = (s: string) => s.replace(/ | /g, " ");

describe("formatMoney", () => {
  it("formats in som, not dollars — catalogue prices are UZS", () => {
    expect(normalize(formatMoney(1_515_250))).toBe("1 515 250 UZS");
  });

  it("drops fractional tiyin, which are never quoted in the shop", () => {
    expect(normalize(formatMoney(34_809.4))).toBe("34 809 UZS");
  });

  it("renders zero rather than an empty string", () => {
    expect(normalize(formatMoney(0))).toBe("0 UZS");
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Power Drill 500W")).toBe("power-drill-500w");
  });

  it("trims separators from both ends instead of leaving them dangling", () => {
    expect(slugify("  --Hammer!!  ")).toBe("hammer");
  });

  it("collapses runs of non-alphanumerics into a single hyphen", () => {
    expect(slugify("LED  лампа///12W")).toBe("led-lampa-12w");
  });

  it("transliterates Cyrillic instead of stripping it to nothing", () => {
    expect(slugify("Кабель 2x1.5")).toBe("kabel-2x1-5");
    expect(slugify("Отвёртка")).toBe("otvertka");
    expect(slugify("Щётка")).toBe("schetka");
  });

  it("keeps Uzbek Cyrillic letters that are absent from the Russian alphabet", () => {
    expect(slugify("Ўзбек")).toBe("ozbek");
  });
});
