import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { notifySeller } from "@/lib/telegram/client";
import { loadAssistantSettings } from "@/lib/telegram/settings";

/**
 * Step 6 — chase the conversations nobody answered.
 *
 * Scheduled from Postgres (pg_cron + pg_net, see 0007_reminders.sql), not from
 * vercel.json: the Hobby plan allows one cron run per day, and "you have an
 * unanswered customer" is worth nothing if it arrives tomorrow morning.
 *
 * Everything the bot could answer has already been answered by the time this
 * runs. What is left is the residue — the greetings, the complaints, the
 * questions the classifier was unsure of — which is exactly the set a human
 * needs to see.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Enough for a busy morning; past this the seller needs the inbox, not a list. */
const MAX_CHATS_PER_RUN = 10;

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  // Fail closed, like every other scheduled route here. Left open, this one lets
  // anyone read what customers are asking the shop.
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();

  // Query override wins when present, so a manual "check right now with a 5
  // minute window" still works without touching the seller's saved preference.
  const queryMinutes = Number(request.nextUrl.searchParams.get("minutes"));
  const minutes = queryMinutes > 0 ? queryMinutes : (await loadAssistantSettings(supabase)).reminderMinutes;

  const { data: chats, error } = await supabase.rpc("unanswered_chats", { p_minutes: minutes });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!chats || chats.length === 0) {
    return NextResponse.json({ notified: 0 });
  }

  const batch = chats.slice(0, MAX_CHATS_PER_RUN);
  const lines = batch.map((chat) => {
    const preview = (chat.last_text ?? "").replace(/\s+/g, " ").slice(0, 80);
    return `• ${chat.waiting_minutes} мин — «${preview}»`;
  });

  const overflow = chats.length > batch.length ? `\n\nи ещё ${chats.length - batch.length}` : "";
  const result = await notifySeller(
    `💬 Без ответа (${chats.length}):\n\n${lines.join("\n")}${overflow}`,
  );

  if (!result.ok) {
    // Deliberately not marking these as reminded: the seller was not actually
    // told, and silently clearing the flag would lose the customer for good.
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  // Stamped only after delivery, and only for the chats named in the message that
  // was sent — the overflow stays pending for the next run.
  const now = new Date().toISOString();
  const { error: stampError } = await supabase
    .from("telegram_chats")
    .upsert(
      batch.map((chat) => ({
        chat_id: chat.chat_id,
        business_connection_id: chat.business_connection_id,
        last_reminded_at: now,
        updated_at: now,
      })),
      { onConflict: "chat_id" },
    );

  if (stampError) {
    // The alert went out, so returning an error would make pg_cron retry and
    // send it again. Log and move on; a duplicate nudge in 5 minutes is the
    // lesser evil, and the seller has already been told.
    console.error("[cron] failed to stamp reminders", stampError.message);
  }

  return NextResponse.json({ notified: batch.length, pending: chats.length - batch.length });
}
