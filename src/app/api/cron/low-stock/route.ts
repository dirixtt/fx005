import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

const LOW_STOCK_THRESHOLD = 5;

export async function GET(request: NextRequest) {
  // Fail closed: without a configured secret this endpoint would be world-callable,
  // letting anyone spam the owner's Telegram and enumerate low-stock inventory.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }

  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    return NextResponse.json({ error: "Telegram not configured" }, { status: 500 });
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data: lowStock, error } = await supabase
    .from("products")
    .select("name, stock_quantity")
    .eq("is_active", true)
    .lte("stock_quantity", LOW_STOCK_THRESHOLD)
    .order("stock_quantity");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!lowStock || lowStock.length === 0) {
    return NextResponse.json({ sent: false, reason: "no low-stock products" });
  }

  const lines = lowStock.map((p) => `• ${p.name} — ${p.stock_quantity} шт.`);
  const text = `⚠️ Заканчиваются на складе (${lowStock.length}):\n\n${lines.join("\n")}`;

  const tgResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  if (!tgResponse.ok) {
    const body = await tgResponse.text();
    return NextResponse.json({ error: `Telegram error: ${body}` }, { status: 502 });
  }

  return NextResponse.json({ sent: true, count: lowStock.length });
}
