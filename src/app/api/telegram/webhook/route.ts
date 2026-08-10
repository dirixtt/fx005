import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { buildMessageRow } from "@/lib/telegram/message";
import type { BusinessConnection, BusinessMessage, TelegramUpdate } from "@/lib/telegram/types";

/**
 * Telegram Business webhook — Step 1: observe and record, nothing else.
 *
 * No replies, no intent handling, no order creation. The point is to confirm the
 * Business API integration genuinely works before any logic is built on it.
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

  const { error } = await supabase.from("telegram_messages").insert({
    ...row,
    raw: JSON.parse(JSON.stringify(row.raw)) as never,
  });

  if (error) throw new Error(`insert telegram_messages: ${error.message}`);

  console.info(
    `[telegram] ${row.direction} chat=${row.chat_id} text=${JSON.stringify(row.text ?? "")}`,
  );
}
