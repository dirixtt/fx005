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

// PostgREST caps how many rows a single request may return, and a silently
// truncated result would understate revenue rather than fail loudly. We ask for
// one row more than we're willing to chart so an over-large period is detectable
// and can be surfaced to the user instead of quietly reported as fact.
export const REPORT_ROW_LIMIT = 10_000;

export async function getReportData(
  supabase: SupabaseClient<Database>,
  fromDate: Date,
  toDate: Date,
) {
  const fromIso = fromDate.toISOString();
  const toIso = toDate.toISOString();

  const [{ data: sales }, { data: items }, { data: products }] = await Promise.all([
    supabase
      .from("sales")
      .select("id, created_at, total, channel")
      .eq("status", "completed")
      .gte("created_at", fromIso)
      .lte("created_at", toIso)
      .range(0, REPORT_ROW_LIMIT),
    // Filter sale_items through the sales foreign key rather than collecting every
    // sale id and passing them back as an `in.(...)` list — that list became a URL
    // longer than the server would accept once a period held a few hundred sales.
    supabase
      .from("sale_items")
      .select("product_name, quantity, unit_price, unit_cost, line_total, sales!inner(created_at, status)")
      .eq("sales.status", "completed")
      .gte("sales.created_at", fromIso)
      .lte("sales.created_at", toIso)
      .range(0, REPORT_ROW_LIMIT),
    // Stock now lives per size, so valuation sums variants and reaches through the
    // foreign key to skip archived products — the product-level flag is still what
    // decides whether an item counts as inventory.
    supabase
      .from("product_variants")
      .select("stock_quantity, cost_price, products!inner(is_active)")
      .eq("products.is_active", true)
      .range(0, REPORT_ROW_LIMIT),
  ]);

  return summarizeReport({
    sales: sales ?? [],
    items: items ?? [],
    products: products ?? [],
  });
}

export type ReportSale = { created_at: string; total: number };
export type ReportItem = {
  product_name: string;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  line_total: number;
};
export type ReportProduct = { stock_quantity: number; cost_price: number };

const TOP_PRODUCTS_COUNT = 8;

/**
 * Pure aggregation over already-fetched rows. Kept free of the Supabase client
 * so the money math — revenue, profit, stock valuation — can be tested directly.
 */
export function summarizeReport<S extends ReportSale, I extends ReportItem>({
  sales,
  items,
  products,
}: {
  sales: S[];
  items: I[];
  products: ReportProduct[];
}) {
  const truncated = sales.length > REPORT_ROW_LIMIT || items.length > REPORT_ROW_LIMIT;

  const revenue = sales.reduce((sum, s) => sum + s.total, 0);
  const cost = items.reduce((sum, i) => sum + i.unit_cost * i.quantity, 0);
  const profit = revenue - cost;
  const stockValuation = products.reduce((sum, p) => sum + p.stock_quantity * p.cost_price, 0);

  const revenueByDayMap = new Map<string, number>();
  for (const s of sales) {
    const day = s.created_at.slice(0, 10);
    revenueByDayMap.set(day, (revenueByDayMap.get(day) ?? 0) + s.total);
  }
  const revenueByDay = Array.from(revenueByDayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, rev]) => ({ date, revenue: rev }));

  const topProductsMap = new Map<string, number>();
  for (const i of items) {
    topProductsMap.set(i.product_name, (topProductsMap.get(i.product_name) ?? 0) + i.quantity);
  }
  const topProducts = Array.from(topProductsMap.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, TOP_PRODUCTS_COUNT)
    .map(([name, quantity]) => ({ name, quantity }));

  return { sales, items, revenue, profit, stockValuation, revenueByDay, topProducts, truncated };
}
