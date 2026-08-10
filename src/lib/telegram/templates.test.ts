import { describe, expect, it } from "vitest";
import * as t from "@/lib/telegram/templates";

/**
 * Intl separates thousands with a non-breaking space, which is correct in the
 * message and invisible in a test file. Normalising here keeps the assertions
 * readable instead of littering them with  .
 */
const plain = (text: string) => text.replace(/ /g, " ");

/**
 * These read like assertions about wording, and partly they are. The load-bearing
 * ones are the numbers: every price and every size in a reply has to be a value
 * that was passed in from a database row, because there is no other way for one
 * to reach a customer.
 */

describe("availability replies", () => {
  it("quotes the price it was given", () => {
    const reply = plain(t.inStockReply("ru", "Бомбер", "42", 450_000));
    expect(reply).toContain("Бомбер, 42");
    expect(reply).toContain("450 000");
  });

  it("answers in Uzbek when the customer wrote in Uzbek", () => {
    expect(t.inStockReply("uz", "Bomber", "42", 450_000)).toContain("bor");
    expect(t.inStockReply("uz", "Bomber", "42", 450_000)).toContain("Narxi");
  });

  it("offers the sizes that are left when the asked-for one is gone", () => {
    const reply = t.outOfSizeReply("ru", "Бомбер", "42", ["40", "41", "44"]);
    expect(reply).toContain("42");
    expect(reply).toContain("40, 41, 44");
  });

  it("says so plainly when nothing is left at all", () => {
    // The dangerous version of this branch is one that lists sizes anyway.
    const reply = t.outOfSizeReply("ru", "Бомбер", "42", []);
    expect(reply).not.toMatch(/Есть:/);
  });
});

describe("price replies", () => {
  it("shows a single price when every size costs the same", () => {
    const reply = plain(t.priceReply("ru", "Бомбер", 450_000, 450_000));
    expect(reply.match(/450 000/g)).toHaveLength(1);
    expect(reply).not.toContain("—");
  });

  it("shows a range when sizes are priced differently", () => {
    // Quoting only the cheapest and letting the customer find out at checkout is
    // how a shop loses one.
    const reply = plain(t.priceReply("ru", "Бомбер", 450_000, 600_000));
    expect(reply).toContain("450 000");
    expect(reply).toContain("600 000");
  });
});

describe("order replies", () => {
  it("states the total before asking for contact details", () => {
    const reply = plain(t.askContactReply("ru", "Бомбер", "42", 900_000));
    expect(reply).toContain("900 000");
    expect(reply).toContain("телефон");
  });

  it("confirms with the same product and total", () => {
    const reply = plain(t.orderCreatedReply("uz", "Bomber", "42", 900_000));
    expect(reply).toContain("Bomber, 42");
    expect(reply).toContain("900 000");
  });

  it("gives no reason when an order could not be created", () => {
    // The real reason is nearly always "the last one just sold", which is the
    // seller's to explain — the bot guessing at it would be the guess this whole
    // design avoids.
    const reply = t.orderFailedReply("ru");
    expect(reply).not.toMatch(/склад|остат|ошибк/i);
  });
});

describe("clarifying replies", () => {
  it("lists candidate products rather than picking one", () => {
    const reply = t.whichProductReply("ru", ["Бомбер чёрный", "Бомбер синий"]);
    expect(reply).toContain("Бомбер чёрный");
    expect(reply).toContain("Бомбер синий");
  });

  it("asks which size, offering only what is in stock", () => {
    expect(t.whichSizeReply("uz", "Bomber", ["41", "42"])).toContain("41, 42");
  });
});
