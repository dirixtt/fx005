import type { BusinessMessage, TelegramUpdate } from "@/lib/telegram/types";

export type MessageDirection = "in" | "out";

export type RecordedMessage = {
  business_connection_id: string | null;
  chat_id: number;
  telegram_user_id: number | null;
  telegram_message_id: number;
  direction: MessageDirection;
  text: string | null;
  raw: unknown;
};

/**
 * Telegram delivers the seller's own outgoing replies over the same stream as the
 * customer's incoming messages, distinguished only by who sent them.
 *
 * Getting this wrong is not cosmetic: the Step 6 reminder asks "has anyone replied
 * to this chat?", so a seller's reply misfiled as inbound would make an answered
 * conversation look permanently unanswered and nag the seller forever.
 *
 * When the owner is unknown — a message over a connection we have not recorded yet
 * — it is treated as inbound. A spurious reminder is a far cheaper mistake than
 * silently dropping a real customer question.
 */
export function resolveDirection(
  senderId: number | null | undefined,
  connectionOwnerId: number | null | undefined,
): MessageDirection {
  if (senderId == null || connectionOwnerId == null) return "in";
  return senderId === connectionOwnerId ? "out" : "in";
}

/** Builds the row for `telegram_messages`, keeping the whole update in `raw`. */
export function buildMessageRow(
  message: BusinessMessage,
  update: TelegramUpdate,
  connectionOwnerId: number | null | undefined,
): RecordedMessage {
  return {
    business_connection_id: message.business_connection_id ?? null,
    chat_id: message.chat.id,
    telegram_user_id: message.from?.id ?? null,
    telegram_message_id: message.message_id,
    direction: resolveDirection(message.from?.id, connectionOwnerId),
    // Photo-only messages carry their words in `caption`; treating them as empty
    // would lose questions like a picture of a jacket captioned "42 bormi?".
    text: message.text ?? message.caption ?? null,
    raw: update,
  };
}
