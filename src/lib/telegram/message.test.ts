import { describe, expect, it } from "vitest";
import { buildMessageRow, resolveDirection } from "@/lib/telegram/message";
import type { BusinessMessage, TelegramUpdate } from "@/lib/telegram/types";

const SELLER = 111;
const CUSTOMER = 222;

function message(overrides: Partial<BusinessMessage> = {}): BusinessMessage {
  return {
    message_id: 1,
    business_connection_id: "conn-1",
    from: { id: CUSTOMER },
    chat: { id: 999 },
    date: 0,
    ...overrides,
  };
}

const update: TelegramUpdate = { update_id: 1 };

describe("resolveDirection", () => {
  it("treats a message from the customer as inbound", () => {
    expect(resolveDirection(CUSTOMER, SELLER)).toBe("in");
  });

  it("treats the seller's own reply as outbound, so it does not look unanswered", () => {
    expect(resolveDirection(SELLER, SELLER)).toBe("out");
  });

  it("falls back to inbound when the connection owner is unknown", () => {
    expect(resolveDirection(CUSTOMER, null)).toBe("in");
    expect(resolveDirection(CUSTOMER, undefined)).toBe("in");
  });

  it("falls back to inbound when the sender is missing", () => {
    expect(resolveDirection(undefined, SELLER)).toBe("in");
  });
});

describe("buildMessageRow", () => {
  it("maps a customer question onto the row shape", () => {
    const row = buildMessageRow(message({ text: "42 bormi?" }), update, SELLER);

    expect(row).toMatchObject({
      business_connection_id: "conn-1",
      chat_id: 999,
      telegram_user_id: CUSTOMER,
      telegram_message_id: 1,
      direction: "in",
      text: "42 bormi?",
    });
  });

  it("reads the caption when a photo carries the question", () => {
    const row = buildMessageRow(
      message({ text: undefined, caption: "narxi qancha" }),
      update,
      SELLER,
    );

    expect(row.text).toBe("narxi qancha");
  });

  it("stores null rather than an empty string for a message with no words", () => {
    expect(buildMessageRow(message(), update, SELLER).text).toBeNull();
  });

  it("keeps the untouched update so nothing is lost while the payload is still being learned", () => {
    const full: TelegramUpdate = { update_id: 7, business_message: message({ text: "hi" }) };
    expect(buildMessageRow(message({ text: "hi" }), full, SELLER).raw).toBe(full);
  });
});
