import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";

export default async function DashboardPage() {
  const supabase = await createClient();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [{ data: todaySales }, { count: pendingOrders }, { data: lowStock }] = await Promise.all([
    supabase
      .from("sales")
      .select("total")
      .eq("status", "completed")
      .gte("created_at", startOfToday.toISOString()),
    supabase
      .from("sales")
      .select("id", { count: "exact", head: true })
      .eq("channel", "online")
      .eq("status", "pending"),
    supabase
      .from("products")
      .select("id, name, stock_quantity")
      .eq("is_active", true)
      .lte("stock_quantity", 5)
      .order("stock_quantity"),
  ]);

  const todayRevenue = todaySales?.reduce((sum, s) => sum + s.total, 0) ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-neutral-900">Dashboard</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s revenue</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{formatMoney(todayRevenue)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pending online orders</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            <Link href="/admin/orders" className="hover:underline">
              {pendingOrders ?? 0}
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Low stock items</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{lowStock?.length ?? 0}</CardContent>
        </Card>
      </div>

      {lowStock && lowStock.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Low stock</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lowStock.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm">
                <Link href={`/admin/inventory/${p.id}`} className="hover:underline">
                  {p.name}
                </Link>
                <span className="text-neutral-500">{p.stock_quantity} left</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
