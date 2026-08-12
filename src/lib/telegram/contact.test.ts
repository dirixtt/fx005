import { describe, expect, it } from "vitest";
import { normalizePhone, parseContact } from "@/lib/telegram/contact";

describe("normalizePhone", () => {
  it("expands a bare local number to E.164", () => {
    expect(normalizePhone("901234567")).toBe("+998901234567");
    expect(normalizePhone("90 123 45 67")).toBe("+998901234567");
  });

  it("accepts the country code with or without the plus", () => {
    expect(normalizePhone("+998901234567")).toBe("+998901234567");
    expect(normalizePhone("998901234567")).toBe("+998901234567");
    expect(normalizePhone("+998 (90) 123-45-67")).toBe("+998901234567");
  });

  it("leaves a foreign number alone rather than bending it into an Uzbek one", () => {
    expect(normalizePhone("+7 916 123 45 67")).toBe("+79161234567");
  });

  it("rejects anything too short to be a phone number", () => {
    // The sizes and quantities that fly around these chats must never be read as
    // a phone number — an order with "42" in the phone field is a lost customer.
    expect(normalizePhone("42")).toBeNull();
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("")).toBeNull();
  });
});

describe("parseContact", () => {
  it("splits name, phone and district", () => {
    expect(parseContact("Азиз, +998 90 123 45 67, Юнусабад")).toEqual({
      name: "Азиз",
      phone: "+998901234567",
      address: "Юнусабад",
    });
  });

  it("reads a message with no district", () => {
    expect(parseContact("Aziz 901234567")).toEqual({
      name: "Aziz",
      phone: "+998901234567",
      address: null,
    });
  });

  it("reads the parts in the other order", () => {
    expect(parseContact("+998901234567 Азиз")).toMatchObject({
      name: "Азиз",
      phone: "+998901234567",
    });
  });

  it("handles line breaks as separators", () => {
    expect(parseContact("Дилшод\n90 123 45 67\nЧиланзар")).toEqual({
      name: "Дилшод",
      phone: "+998901234567",
      address: "Чиланзар",
    });
  });

  it("returns a phone with no name when only a number was sent", () => {
    // Recoverable: the caller falls back to the Telegram account name rather than
    // refusing the order.
    expect(parseContact("+998901234567")).toMatchObject({ name: null, phone: "+998901234567" });
  });

  it("returns no phone when there is none to find", () => {
    expect(parseContact("а можно завтра?")).toMatchObject({ phone: null });
  });

  it("does not mistake a size for a phone number", () => {
    expect(parseContact("42 размер беру")).toMatchObject({ phone: null });
  });

  it("refuses a sentence as a name", () => {
    const long = "меня зовут очень длинное имя и я хочу рассказать всю свою историю покупок тут";
    expect(parseContact(`${long} 901234567`)).toMatchObject({
      name: null,
      phone: "+998901234567",
    });
  });
});
