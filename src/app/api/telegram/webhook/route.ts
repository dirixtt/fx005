import { NextResponse, after } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { handleInboundMessage } from "@/lib/telegram/assistant";
import { buildMessageRow } from "@/lib/telegram/message";
import type { BusinessConnection, BusinessMessage, TelegramUpdate } from "@/lib/telegram/types";

/**
 * Telegram Business webhook — the entry point for everything the assistant does.
 *
 * This route does as little as possible: authenticate, record, acknowledge. The
 * work happens in `after()`, once the 200 is already on the wire. Telegram gives
 * a webhook a few seconds before it retries, and disables one that keeps timing
 * out — and answering a customer takes a model call plus several queries, which
 * does not fit in that budget.
 */

// The service-role client must never be bundled for the edge/browser.
export const runtime = "nodejs";
// Telegram delivers unpredictably; nothing here may be cached or prerendered.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;

  // Fail closed. Without a configured secret this endpoint would accept forged
  // updates from anyone who guessed the URL, so it refuses to run at all —
  // the same posture as /api/cron/low-stock.
  if (!secret) {
    console.error("[telegram] TELEGRAM_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  if (request.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: "Malformed JSON" }, { status: 400 });
  }

  try {
    if (update.business_connection) {
      await recordConnection(update.business_connection);
    }

    const message = update.business_message ?? update.edited_business_message;
    if (message) {
      await recordMessage(message, update);
    }
  } catch (error) {
    // Deliberately still 200. Telegram retries non-2xx responses and disables a
    // webhook that keeps failing; a database hiccup must not cost us the
    // connection. The update is lost, which is why the error is logged loudly.
    console.error("[telegram] failed to record update", update.update_id, error);
  }

  return NextResponse.json({ ok: true });
}

async function recordConnection(connection: BusinessConnection) {
  const supabase = createServiceRoleClient();

  const { error } = await supabase.from("telegram_connections").upsert(
    {
      business_connection_id: connection.id,
      telegram_user_id: connection.user.id,
      is_enabled: connection.is_enabled,
      // Bot API moved this into `rights`; older payloads still carry the flat flag.
      can_reply: connection.rights?.can_reply ?? connection.can_reply ?? false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "business_connection_id" },
  );

  if (error) throw new Error(`upsert telegram_connections: ${error.message}`);

  console.info(
    `[telegram] connection ${connection.id} user=${connection.user.id} enabled=${connection.is_enabled}`,
  );
}

async function recordMessage(message: BusinessMessage, update: TelegramUpdate) {
  const supabase = createServiceRoleClient();
  const businessConnectionId = message.business_connection_id ?? null;

  // Who owns this connection decides whether the message is the customer asking
  // or the seller replying — see resolveDirection for why that distinction matters.
  let connectionOwnerId: number | null = null;

  if (businessConnectionId) {
    const { data: connection } = await supabase
      .from("telegram_connections")
      .select("telegram_user_id")
      .eq("business_connection_id", businessConnectionId)
      .maybeSingle();

    connectionOwnerId = connection?.telegram_user_id ?? null;
  }

  const row = buildMessageRow(message, update, connectionOwnerId);

  const { data: inserted, error } = await supabase
    .from("telegram_messages")
    .upsert(
      {
        ...row,
        raw: JSON.parse(JSON.stringify(row.raw)) as never,
      },
      // Telegram retries an update it thinks failed, and re-delivers our own sends.
      // Without this, a retry would run the assistant twice over one question:
      // two replies to the customer, and mid-purchase, two orders.
      { onConflict: "chat_id,telegram_message_id", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();

  if (error) throw new Error(`insert telegram_messages: ${error.message}`);

  // No row back means this exact message is already recorded. Already handled.
  if (!inserted) {
    console.info(`[telegram] duplicate ${row.chat_id}/${row.telegram_message_id}, skipped`);
    return;
  }

  console.info(
    `[telegram] ${row.direction} chat=${row.chat_id} text=${JSON.stringify(row.text ?? "")}`,
  );

  // Telegram sends several resolutions of the same photo; the last is largest,
  // which is what the vision pipeline in assistant.ts wants to look at.
  const photoFileId = message.photo?.at(-1)?.file_id ?? null;

  // Only the customer's side, and only if there is something to work with. A
  // sticker or a voice note has neither text nor a photo and stays exactly as
  // silent as it always has. Running the assistant over the seller's own
  // replies would burn a model call to answer a question nobody asked.
  if (row.direction !== "in" || (!row.text && !photoFileId)) return;

  const text = row.text ?? "";
  after(async () => {
    try {
      await handleInboundMessage({
        messageId: inserted.id,
        chatId: row.chat_id,
        businessConnectionId: businessConnectionId,
        text,
        senderName: message.from?.first_name ?? null,
        photoFileId,
      });
    } catch (error) {
      // The response went out long ago and the customer is unaffected — they get
      // the same silence they would have got before the bot existed, and the
      // conversation stays on the seller's unanswered list.
      console.error("[telegram] assistant failed", inserted.id, error);
    }
  });
}
