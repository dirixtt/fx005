import { NextResponse, after } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { handleInboundMessage } from "@/lib/telegram/assistant";
import { notifySeller } from "@/lib/telegram/client";
import { buildMessageRow } from "@/lib/telegram/message";
import type { BusinessConnection, BusinessMessage, TelegramUpdate } from "@/lib/telegram/types";

/**
 * Telegram webhook — the entry point for everything the assistant does, and
 * for the one flow that isn't a Business chat at all: a seller linking their
 * Telegram account to their store.
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

const LINK_CODE_PATTERN = /^\d{6}$/;

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

    // A plain message — not business_message — only ever means one thing right
    // now: a seller in a normal 1:1 chat with the bot, sending the linking code
    // shown on /admin/settings/telegram. Nothing else reaches this branch, so
    // nothing here touches telegram_messages — it isn't a customer conversation.
    if (update.message && !update.business_message) {
      await handleLinkAttempt(update.message);
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

  // A connection can arrive before the seller has sent their linking code, or
  // after — the code path in handleLinkAttempt backfills store_id onto an
  // existing connection row the same way this backfills it onto a new one.
  const { data: store } = await supabase
    .from("stores")
    .select("id")
    .eq("owner_telegram_user_id", connection.user.id)
    .maybeSingle();

  const { error } = await supabase.from("telegram_connections").upsert(
    {
      business_connection_id: connection.id,
      telegram_user_id: connection.user.id,
      store_id: store?.id ?? null,
      is_enabled: connection.is_enabled,
      // Bot API moved this into `rights`; older payloads still carry the flat flag.
      can_reply: connection.rights?.can_reply ?? connection.can_reply ?? false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "business_connection_id" },
  );

  if (error) throw new Error(`upsert telegram_connections: ${error.message}`);

  console.info(
    `[telegram] connection ${connection.id} user=${connection.user.id} store=${store?.id ?? "unlinked"} enabled=${connection.is_enabled}`,
  );
}

async function recordMessage(message: BusinessMessage, update: TelegramUpdate) {
  const supabase = createServiceRoleClient();
  const businessConnectionId = message.business_connection_id ?? null;

  // Who owns this connection decides whether the message is the customer asking
  // or the seller replying (resolveDirection) — and, now, which store it
  // belongs to at all.
  let connectionOwnerId: number | null = null;
  let storeId: string | null = null;

  if (businessConnectionId) {
    const { data: connection } = await supabase
      .from("telegram_connections")
      .select("telegram_user_id, store_id")
      .eq("business_connection_id", businessConnectionId)
      .maybeSingle();

    connectionOwnerId = connection?.telegram_user_id ?? null;
    storeId = connection?.store_id ?? null;
  }

  const row = buildMessageRow(message, update, connectionOwnerId, storeId);

  const { data: inserted, error } = await supabase
    .from("telegram_messages")
    .upsert(
      {
        ...row,
        raw: JSON.parse(JSON.stringify(row.raw)) as never,
      },
      // Telegram retries an update it thinks failed, and re-delivers our own sends.
      // Without this, a retry would run the assistant twice over one question:
      // two replies to the customer, and mid-purchase, two orders. Keyed on
      // business_connection_id too: chat_id alone is only unique to Telegram
      // within one connection, and two sellers' customers can collide on it.
      { onConflict: "business_connection_id,chat_id,telegram_message_id", ignoreDuplicates: true },
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
    `[telegram] ${row.direction} chat=${row.chat_id} store=${storeId ?? "unlinked"} text=${JSON.stringify(row.text ?? "")}`,
  );

  // Telegram sends several resolutions of the same photo; the last is largest,
  // which is what the vision pipeline in assistant.ts wants to look at.
  const photoFileId = message.photo?.at(-1)?.file_id ?? null;
  const hasVoice = Boolean(message.voice);

  // Only the customer's side, and only if there is something to work with. A
  // sticker has neither text, a photo nor a voice note and stays exactly as
  // silent as it always has — there is nothing to acknowledge and nothing for
  // the seller to be pinged about. Running the assistant over the seller's own
  // replies would burn a model call to answer a question nobody asked.
  if (row.direction !== "in" || (!row.text && !photoFileId && !hasVoice)) return;

  // No store yet — the seller hasn't finished the linking flow (or their
  // account got disconnected). The message stays logged for the audit trail,
  // but there's no settings row, no catalogue, and nowhere to notify, so the
  // assistant pipeline stays inert rather than guessing.
  if (!businessConnectionId || !storeId) {
    console.info(`[telegram] no store linked for connection ${businessConnectionId ?? "unknown"}, skipping assistant`);
    return;
  }

  const text = row.text ?? "";
  after(async () => {
    try {
      await handleInboundMessage({
        messageId: inserted.id,
        chatId: row.chat_id,
        businessConnectionId,
        text,
        senderName: message.from?.first_name ?? null,
        photoFileId,
        hasVoice,
        storeId,
      });
    } catch (error) {
      // The response went out long ago and the customer is unaffected — they get
      // the same silence they would have got before the bot existed, and the
      // conversation stays on the seller's unanswered list.
      console.error("[telegram] assistant failed", inserted.id, error);
    }
  });
}

/**
 * A seller sends a 6-digit code, generated on /admin/settings/telegram, to the
 * bot in a plain chat (not a Business one) to prove which Telegram account is
 * theirs. This is the only place `stores.owner_telegram_user_id` gets set.
 *
 * Anything that isn't a plausible code is ignored outright — a normal "hi" to
 * the bot from a curious seller shouldn't get a reply at all outside this flow.
 */
async function handleLinkAttempt(message: BusinessMessage) {
  const text = (message.text ?? "").trim();
  if (!LINK_CODE_PATTERN.test(text) || !message.from) return;

  const supabase = createServiceRoleClient();
  const now = new Date().toISOString();

  const { data: code } = await supabase
    .from("telegram_link_codes")
    .select("id, store_id, expires_at, used_at")
    .eq("code", text)
    .maybeSingle();

  if (!code || code.used_at || code.expires_at < now) {
    await notifySeller(message.chat.id, "Код неверный или срок его действия истёк. Сгенерируйте новый в кабинете.");
    return;
  }

  const { error: storeError } = await supabase
    .from("stores")
    .update({ owner_telegram_user_id: message.from.id, updated_at: now })
    .eq("id", code.store_id);

  if (storeError) {
    console.error("[telegram] link failed to update store", code.store_id, storeError.message);
    await notifySeller(message.chat.id, "Не получилось привязать аккаунт — попробуйте ещё раз.");
    return;
  }

  await supabase
    .from("shop_info")
    .update({ notify_chat_id: message.chat.id, updated_at: now })
    .eq("store_id", code.store_id);

  await supabase.from("telegram_link_codes").update({ used_at: now }).eq("id", code.id);

  // The seller may have connected the bot in Telegram Business settings before
  // sending this code — backfill store_id onto that connection now rather than
  // waiting for Telegram to resend a business_connection update, which it may
  // not do until something about the connection actually changes.
  await supabase
    .from("telegram_connections")
    .update({ store_id: code.store_id, updated_at: now })
    .eq("telegram_user_id", message.from.id)
    .is("store_id", null);

  await notifySeller(
    message.chat.id,
    "Готово! Аккаунт привязан. Теперь подключите этого же бота в Telegram: Настройки → Telegram Business → Чат-боты.",
  );
}
