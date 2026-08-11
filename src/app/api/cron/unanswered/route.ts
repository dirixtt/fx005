import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { notifySeller } from "@/lib/telegram/client";
import { loadAssistantSettings, loadNotifyChatId } from "@/lib/telegram/settings";

/**
 * Step 6 — chase the conversations nobody answered, for every linked store.
 *
 * Scheduled from Postgres (pg_cron + pg_net, see 0007_reminders.sql), not from
 * vercel.json: the Hobby plan allows one cron run per day, and "you have an
 * unanswered customer" is worth nothing if it arrives tomorrow morning.
 *
 * Everything the bot could answer has already been answered by the time this
 * runs. What is left is the residue — the greetings, the complaints, the
 * questions the classifier was unsure of — which is exactly the set a human
 * needs to see. One store's slow reminder run must not delay another's, so
 * each store is handled independently and a failure in one is logged and
 * skipped rather than aborting the whole run.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Enough for a busy morning; past this the seller needs the inbox, not a list. */
const MAX_CHATS_PER_RUN = 10;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  // Fail closed, like every other scheduled route here. Left open, this one lets
  // anyone read what customers are asking every shop on the platform.
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  // Query override wins when present, so a manual "check right now with a 5
  // minute window" still works without touching any store's saved preference.
  const queryMinutes = Number(request.nextUrl.searchParams.get("minutes"));
  const overrideMinutes = queryMinutes > 0 ? queryMinutes : null;

  const { data: stores, error: storesError } = await supabase.from("stores").select("id").eq("is_active", true);
  if (storesError) {
    return NextResponse.json({ error: storesError.message }, { status: 500 });
  }

  const results = await Promise.all(
    (stores ?? []).map((store) => remindStore(supabase, store.id, overrideMinutes)),
  );

  const notified = results.reduce((sum, r) => sum + r.notified, 0);
  const pending = results.reduce((sum, r) => sum + r.pending, 0);
  return NextResponse.json({ stores: results.length, notified, pending });
}

async function remindStore(
  supabase: ReturnType<typeof createServiceRoleClient>,
  storeId: string,
  overrideMinutes: number | null,
): Promise<{ notified: number; pending: number }> {
  try {
    const minutes = overrideMinutes ?? (await loadAssistantSettings(supabase, storeId)).reminderMinutes;

    const { data: chats, error } = await supabase.rpc("unanswered_chats", { p_store_id: storeId, p_minutes: minutes });
    if (error) throw new Error(error.message);
    if (!chats || chats.length === 0) return { notified: 0, pending: 0 };

    const notifyChatId = await loadNotifyChatId(supabase, storeId);
    if (!notifyChatId) return { notified: 0, pending: chats.length };

    const batch = chats.slice(0, MAX_CHATS_PER_RUN);
    const lines = batch.map((chat) => {
      const preview = (chat.last_text ?? "").replace(/\s+/g, " ").slice(0, 80);
      return `• ${chat.waiting_minutes} мин — «${preview}»`;
    });

    const overflow = chats.length > batch.length ? `\n\nи ещё ${chats.length - batch.length}` : "";
    const result = await notifySeller(notifyChatId, `💬 Без ответа (${chats.length}):\n\n${lines.join("\n")}${overflow}`);

    if (!result.ok) {
      // Deliberately not marking these as reminded: the seller was not actually
      // told, and silently clearing the flag would lose the customer for good.
      console.error(`[cron] notifySeller failed for store ${storeId}`, result.error);
      return { notified: 0, pending: chats.length };
    }

    // Stamped only after delivery, and only for the chats named in the message
    // that was sent — the overflow stays pending for the next run.
    const now = new Date().toISOString();
    const { error: stampError } = await supabase.from("telegram_chats").upsert(
      batch.map((chat) => ({
        chat_id: chat.chat_id,
        business_connection_id: chat.business_connection_id,
        store_id: storeId,
        last_reminded_at: now,
        updated_at: now,
      })),
      { onConflict: "business_connection_id,chat_id" },
    );

    if (stampError) {
      // The alert went out, so returning an error would make pg_cron retry and
      // send it again. Log and move on; a duplicate nudge in 5 minutes is the
      // lesser evil, and the seller has already been told.
      console.error(`[cron] failed to stamp reminders for store ${storeId}`, stampError.message);
    }

    return { notified: batch.length, pending: chats.length - batch.length };
  } catch (error) {
    console.error(`[cron] reminder run failed for store ${storeId}`, error);
    return { notified: 0, pending: 0 };
  }
}
