import { NextResponse, after } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { classifyIntent } from "@/lib/telegram/intent";
import { buildMessageRow } from "@/lib/telegram/message";
import type { BusinessConnection, BusinessMessage, TelegramUpdate } from "@/lib/telegram/types";

/**
 * Telegram Business webhook — observe, record, and (Step 3) classify.
 *
 * Still no replies and no order creation: the classifier's verdict is written to
 * telegram_messages and read by nobody but us. That is the point. It lets the
 * intent recognition be measured against real customers before Step 4 gives it a
 * voice, and a misclassification at this stage costs a wrong row, not a wrong
 * answer to a paying customer.
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
    .insert({
      ...row,
      raw: JSON.parse(JSON.stringify(row.raw)) as never,
    })
    .select("id")
    .single();

  if (error) throw new Error(`insert telegram_messages: ${error.message}`);

  console.info(
    `[telegram] ${row.direction} chat=${row.chat_id} text=${JSON.stringify(row.text ?? "")}`,
  );

  // Only the customer's side. Classifying the seller's own replies would burn a
  // model call to learn nothing.
  if (row.direction === "in" && row.text) {
    // Telegram gives a webhook a few seconds before it retries and, if that keeps
    // failing, disables it. A model call does not fit in that budget, so it runs
    // after the 200 is already on the wire.
    after(() => classifyAndStore(inserted.id, row.text as string));
  }
}

async function classifyAndStore(messageId: string, text: string) {
  const intent = await classifyIntent(text);

  const { error } = await createServiceRoleClient()
    .from("telegram_messages")
    .update({ intent: intent.kind, intent_data: intent as never })
    .eq("id", messageId);

  // Nothing to escalate to: the response is long gone and the customer is
  // unaffected — the seller answers by hand either way, as they do today.
  if (error) {
    console.error("[telegram] failed to store intent", messageId, error.message);
    return;
  }

  console.info(`[telegram] intent ${intent.kind} msg=${messageId}`);
}
