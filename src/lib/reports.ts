import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

export function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function defaultDateRange(params: { from?: string; to?: string }) {
  const today = new Date();
  const defaultFrom = new Date(today);
  defaultFrom.setDate(defaultFrom.getDate() - 30);

  const from = params.from ?? toDateInputValue(defaultFrom);
  const to = params.to ?? toDateInputValue(today);

  return {
    from,
    to,
    fromDate: new Date(`${from}T00:00:00.000Z`),
    toDate: new Date(`${to}T23:59:59.999Z`),
  };
}

export async function getReportData(
  supabase: SupabaseClient<Database>,
  fromDate: Date,
  toDate: Date,
) {
  const [{ data: sales }, { data: products }] = await Promise.all([
    supabase
      .from("sales")
      .select("id, created_at, total, channel")
      .eq("status", "completed")
      .gte("created_at", fromDate.toISOString())
      .lte("created_at", toDate.toISOString()),
    supabase.from("products").select("stock_quantity, cost_price").eq("is_active", true),
  ]);

  const saleIds = sales?.map((s) => s.id) ?? [];
  const { data: items } = saleIds.length
    ? await supabase.from("sale_items").select("*").in("sale_id", saleIds)
    : { data: [] as Array<{ product_name: string; quantity: number; unit_price: number; unit_cost: number; line_total: number }> };

  const revenue = sales?.reduce((sum, s) => sum + s.total, 0) ?? 0;
  const cost = items?.reduce((sum, i) => sum + i.unit_cost * i.quantity, 0) ?? 0;
  const profit = revenue - cost;
  const stockValuation = products?.reduce((sum, p) => sum + p.stock_quantity * p.cost_price, 0) ?? 0;

  const revenueByDayMap = new Map<string, number>();
  for (const s of sales ?? []) {
    const day = s.created_at.slice(0, 10);
    revenueByDayMap.set(day, (revenueByDayMap.get(day) ?? 0) + s.total);
  }
  const revenueByDay = Array.from(revenueByDayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, rev]) => ({ date, revenue: rev }));

  const topProductsMap = new Map<string, number>();
  for (const i of items ?? []) {
    topProductsMap.set(i.product_name, (topProductsMap.get(i.product_name) ?? 0) + i.quantity);
  }
  const topProducts = Array.from(topProductsMap.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([name, quantity]) => ({ name, quantity }));

  return { sales: sales ?? [], items: items ?? [], revenue, profit, stockValuation, revenueByDay, topProducts };
}
