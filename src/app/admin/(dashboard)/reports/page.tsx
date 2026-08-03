import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RevenueByDayChart, TopProductsChart } from "@/components/admin/reports-charts";
import { formatMoney } from "@/lib/utils";

function toDateInputValue(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const today = new Date();
  const defaultFrom = new Date(today);
  defaultFrom.setDate(defaultFrom.getDate() - 30);

  const from = params.from ?? toDateInputValue(defaultFrom);
  const to = params.to ?? toDateInputValue(today);

  const fromDate = new Date(`${from}T00:00:00.000Z`);
  const toDate = new Date(`${to}T23:59:59.999Z`);

  const supabase = await createClient();

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

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-neutral-900">Reports</h1>

      <form className="flex items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="from">From</Label>
          <Input id="from" type="date" name="from" defaultValue={from} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to">To</Label>
          <Input id="to" type="date" name="to" defaultValue={to} />
        </div>
        <Button type="submit" variant="outline">
          Apply
        </Button>
      </form>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Revenue</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatMoney(revenue)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Profit</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatMoney(profit)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Orders</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{sales?.length ?? 0}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Stock valuation</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatMoney(stockValuation)}</CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue over time</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByDay.length ? (
              <RevenueByDayChart data={revenueByDay} />
            ) : (
              <p className="py-8 text-center text-sm text-neutral-500">No sales in this range.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top products (by units sold)</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length ? (
              <TopProductsChart data={topProducts} />
            ) : (
              <p className="py-8 text-center text-sm text-neutral-500">No sales in this range.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
