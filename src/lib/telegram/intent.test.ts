import { describe, expect, it } from "vitest";
import { classifyIntent, intentFromToolUse, INTENT_TOOLS } from "@/lib/telegram/intent";

describe("intentFromToolUse", () => {
  it("reads a stock question", () => {
    expect(
      intentFromToolUse("check_availability", {
        language: "uz",
        product: null,
        size: "42",
        color: null,
      }),
    ).toEqual({
      kind: "check_availability",
      language: "uz",
      product: null,
      size: "42",
      color: null,
    });
  });

  it("reads a price question", () => {
    expect(intentFromToolUse("ask_price", { language: "ru", product: "бомбер" })).toEqual({
      kind: "ask_price",
      language: "ru",
      product: "бомбер",
    });
  });

  it("defaults an order without a stated quantity to one item", () => {
    const intent = intentFromToolUse("place_order", {
      language: "uz",
      product: "krossovka",
      size: "42",
      color: null,
      quantity: null,
    });

    expect(intent).toMatchObject({ kind: "place_order", quantity: 1 });
  });

  it("keeps an explicit quantity", () => {
    expect(
      intentFromToolUse("place_order", {
        language: "ru",
        product: null,
        size: "M",
        color: "чёрный",
        quantity: 2,
      }),
    ).toMatchObject({ kind: "place_order", quantity: 2 });
  });

  it("marks a model-classified small-talk message as 'classified'", () => {
    expect(intentFromToolUse("other", { language: "uz", note: "приветствие" })).toEqual({
      kind: "other",
      language: "uz",
      reason: "classified",
      note: "приветствие",
    });
  });

  it("treats blank strings as 'not mentioned' rather than as a value", () => {
    // A size of "" would otherwise be looked up in the catalogue as a real size
    // and come back empty, which reads to the customer as "we don't have it".
    expect(
      intentFromToolUse("check_availability", {
        language: "ru",
        product: "  ",
        size: "",
        color: null,
      }),
    ).toMatchObject({ product: null, size: null, color: null });
  });

  it("falls back to 'other' on arguments it cannot read", () => {
    expect(intentFromToolUse("check_availability", { size: 42 })).toMatchObject({
      kind: "other",
      reason: "invalid_arguments",
    });
    expect(intentFromToolUse("ask_price", null)).toMatchObject({
      kind: "other",
      reason: "invalid_arguments",
    });
  });

  it("falls back to 'other' on a tool name it does not know", () => {
    expect(intentFromToolUse("cancel_order", { language: "ru" })).toMatchObject({
      kind: "other",
      reason: "invalid_arguments",
    });
  });
});

describe("classifyIntent guards", () => {
  it("does not call the model for a message with no words in it", async () => {
    // Stickers, voice notes and bare photos arrive with no text. Spending an API
    // call on them is pure waste, and the answer is 'other' either way.
    const client = {
      messages: {
        create: () => {
          throw new Error("should not be called");
        },
      },
    };

    for (const text of [null, "", "   "]) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const intent = await classifyIntent(text, { client: client as any });
      expect(intent).toMatchObject({ kind: "other", reason: "no_text" });
    }
  });

  it("stays silent when the model errors out", async () => {
    const client = {
      messages: { create: async () => Promise.reject(new Error("rate limited")) },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const intent = await classifyIntent("42 bormi", { client: client as any });
    expect(intent).toMatchObject({ kind: "other", reason: "unavailable" });
  });

  it("stays silent when the model answers with prose instead of a function", async () => {
    const client = {
      messages: {
        create: async () => ({
          content: [{ type: "text", text: "Да, 42 размер есть в наличии!" }],
          stop_reason: "end_turn",
        }),
      },
    };

    // Exactly the failure this whole design exists to contain: a confident,
    // fluent, completely invented answer about stock. It must never reach anyone.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const intent = await classifyIntent("42 bormi", { client: client as any });
    expect(intent).toMatchObject({ kind: "other", reason: "no_tool_call" });
  });

  it("sends a tool set the model cannot answer freely from", () => {
    expect(INTENT_TOOLS.map((tool) => tool.name)).toEqual([
      "check_availability",
      "ask_price",
      "place_order",
      "other",
    ]);
    // Strict mode is what makes intentFromToolUse's happy path the common case
    // rather than a hope.
    expect(INTENT_TOOLS.every((tool) => tool.strict === true)).toBe(true);
  });
});

/**
 * The real bilingual corpus. Runs only with a key present, so CI stays free and
 * offline, but `ANTHROPIC_API_KEY=... npm test` checks the prompt for real.
 */
describe.skipIf(!process.env.ANTHROPIC_API_KEY)("classifyIntent against the model", () => {
  const cases: Array<{ text: string; kind: string; size?: string }> = [
    // Russian
    { text: "есть 42 размер?", kind: "check_availability", size: "42" },
    { text: "а чёрный есть", kind: "check_availability" },
    { text: "сколько стоит", kind: "ask_price" },
    { text: "почём куртка", kind: "ask_price" },
    { text: "беру, отправляйте", kind: "place_order" },
    { text: "здравствуйте", kind: "other" },
    // Uzbek, Latin
    { text: "42 bormi", kind: "check_availability", size: "42" },
    { text: "qora bormi", kind: "check_availability" },
    { text: "narxi qancha", kind: "ask_price" },
    { text: "qancha turadi", kind: "ask_price" },
    { text: "olaman", kind: "place_order" },
    { text: "rahmat", kind: "other" },
    // Uzbek, Cyrillic
    { text: "нархи қанча", kind: "ask_price" },
    { text: "бор ми", kind: "check_availability" },
    { text: "ассалому алайкум", kind: "other" },
    // A greeting glued to a question must be classified by the question.
    { text: "салом, 42 борми", kind: "check_availability", size: "42" },
  ];

  it.each(cases)("classifies $text as $kind", async ({ text, kind, size }) => {
    const intent = await classifyIntent(text);
    expect(intent.kind).toBe(kind);
    if (size && "size" in intent) expect(intent.size).toBe(size);
  }, 30_000);
});
