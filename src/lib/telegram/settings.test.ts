import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, effectiveLanguage, withSignature } from "@/lib/telegram/settings";

describe("effectiveLanguage", () => {
  it("uses the detected language when the seller left it on auto", () => {
    expect(effectiveLanguage({ ...DEFAULT_SETTINGS, languageMode: "auto" }, "uz")).toBe("uz");
  });

  it("overrides the detected language when the seller forced one", () => {
    // The whole point of this setting: a seller whose customers all read Russian
    // does not want the bot switching to Uzbek because one message used a
    // borrowed word the classifier read as Uzbek.
    expect(effectiveLanguage({ ...DEFAULT_SETTINGS, languageMode: "ru" }, "uz")).toBe("ru");
  });
});

describe("withSignature", () => {
  it("appends the seller's signature", () => {
    const settings = { ...DEFAULT_SETTINGS, signature: "— магазин FX005" };
    expect(withSignature(settings, "Есть в наличии.")).toBe("Есть в наличии.\n\n— магазин FX005");
  });

  it("leaves the message untouched when no signature is configured", () => {
    expect(withSignature(DEFAULT_SETTINGS, "Есть в наличии.")).toBe("Есть в наличии.");
  });
});
