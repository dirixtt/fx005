import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import { notifySeller } from "@/lib/telegram/client";
import { variantLabel } from "@/lib/variants";

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

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // Per-size, matching the dashboard: a product-level total would stay healthy
  // while the size customers actually ask for has been out for a week.
  const { data: lowStock, error } = await supabase
    .from("product_variants")
    .select("size, color, stock_quantity, products!inner(name, is_active)")
    .eq("products.is_active", true)
    .lte("stock_quantity", LOW_STOCK_THRESHOLD)
    .order("stock_quantity");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!lowStock || lowStock.length === 0) {
    return NextResponse.json({ sent: false, reason: "no low-stock products" });
  }

  const lines = lowStock.map(
    (v) => `• ${v.products.name} ${variantLabel(v)} — ${v.stock_quantity} шт.`,
  );
  const result = await notifySeller(
    `⚠️ Заканчиваются на складе (${lowStock.length}):\n\n${lines.join("\n")}`,
  );

  if (!result.ok) {
    return NextResponse.json({ error: `Telegram error: ${result.error}` }, { status: 502 });
  }

  return NextResponse.json({ sent: true, count: lowStock.length });
}
