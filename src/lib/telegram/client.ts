/**
 * Outgoing calls to the Telegram Bot API.
 *
 * Two very different kinds of send live here, and confusing them is the mistake
 * this module exists to prevent:
 *
 *   - `replyToCustomer` speaks *as the seller*, inside their Business account.
 *     It needs a business_connection_id; without one Telegram either rejects the
 *     call or the message arrives from the bot instead of the shop, which is
 *     jarring for the customer and defeats the point of the Business API.
 *
 *   - `notifySeller` speaks *to the seller*, in their own chat with the bot.
 *     This is the low-stock alert and the unanswered-conversation nudge.
 */

const API_BASE = "https://api.telegram.org";

export type SendResult =
  | { ok: true; messageId: number | null }
  | { ok: false; error: string };

type SendMessagePayload = {
  chat_id: number | string;
  text: string;
  business_connection_id?: string;
  disable_notification?: boolean;
};

async function sendMessage(payload: SendMessagePayload): Promise<SendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN is not configured" };

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      // A hung Telegram call must not hold a serverless function open until the
      // platform kills it.
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "network error" };
  }

  const body = (await response.json().catch(() => null)) as
    | { ok?: boolean; description?: string; result?: { message_id?: number } }
    | null;

  if (!response.ok || !body?.ok) {
    return { ok: false, error: body?.description ?? `HTTP ${response.status}` };
  }

  // The id comes back so the reply can be logged with the same de-duplication key
  // Telegram will use when it echoes the message back to the webhook.
  return { ok: true, messageId: body.result?.message_id ?? null };
}

/** Replies to a customer as the seller's business account. */
export function replyToCustomer(
  chatId: number,
  text: string,
  businessConnectionId: string | null,
): Promise<SendResult> {
  if (!businessConnectionId) {
    // Sending anyway would deliver the message from the bot's own account, which
    // is not who the customer is talking to. Silence is the better failure.
    return Promise.resolve({ ok: false, error: "no business_connection_id for this chat" });
  }

  return sendMessage({
    chat_id: chatId,
    text,
    business_connection_id: businessConnectionId,
  });
}

/** Sends an operational alert to the shop owner's chat with the bot. */
export function notifySeller(text: string): Promise<SendResult> {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) return Promise.resolve({ ok: false, error: "TELEGRAM_CHAT_ID is not configured" });

  return sendMessage({ chat_id: chatId, text });
}
