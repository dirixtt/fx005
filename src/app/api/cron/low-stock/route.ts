import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";
import { notifySeller } from "@/lib/telegram/client";
import { loadNotifyChatId } from "@/lib/telegram/settings";
import { variantLabel } from "@/lib/variants";

const LOW_STOCK_THRESHOLD = 5;

export async function GET(request: NextRequest) {
  // Fail closed: without a configured secret this endpoint would be world-callable,
  // letting anyone spam every store's owner and enumerate low-stock inventory.
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 });
  }

  if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Service role, not anon: this now needs shop_info.notify_chat_id per store,
  // which — unlike product data — is owner-only and has no public read policy.
  const supabase = createServiceRoleClient();

  const { data: stores, error: storesError } = await supabase.from("stores").select("id").eq("is_active", true);
  if (storesError) {
    return NextResponse.json({ error: storesError.message }, { status: 500 });
  }

  let sentTo = 0;

  for (const store of stores ?? []) {
    // Per-size, matching the dashboard: a product-level total would stay healthy
    // while the size customers actually ask for has been out for a week.
    const { data: lowStock, error } = await supabase
      .from("product_variants")
      .select("size, color, stock_quantity, products!inner(name, is_active)")
      .eq("store_id", store.id)
      .eq("products.is_active", true)
      .lte("stock_quantity", LOW_STOCK_THRESHOLD)
      .order("stock_quantity");

    if (error) {
      console.error(`[cron] low-stock query failed for store ${store.id}`, error.message);
      continue;
    }
    if (!lowStock || lowStock.length === 0) continue;

    const notifyChatId = await loadNotifyChatId(supabase, store.id);
    if (!notifyChatId) continue;

    const lines = lowStock.map((v) => `• ${v.products.name} ${variantLabel(v)} — ${v.stock_quantity} шт.`);
    const result = await notifySeller(notifyChatId, `⚠️ Заканчиваются на складе (${lowStock.length}):\n\n${lines.join("\n")}`);

    if (result.ok) sentTo += 1;
    else console.error(`[cron] low-stock notify failed for store ${store.id}`, result.error);
  }

  return NextResponse.json({ stores: stores?.length ?? 0, sentTo });
}
