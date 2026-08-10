import Link from "next/link";
import { AlertTriangle, Clock, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/admin/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";
import { variantLabel } from "@/lib/variants";

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
    // Low stock is now a per-size question: a jacket with ten mediums and no 42
    // is out of stock for the customer asking about 42, and the old
    // product-level total hid exactly that.
    supabase
      .from("product_variants")
      .select("id, size, color, stock_quantity, products!inner(id, name, is_active)")
      .eq("products.is_active", true)
      .lte("stock_quantity", 5)
      .order("stock_quantity"),
  ]);

  const todayRevenue = todaySales?.reduce((sum, s) => sum + s.total, 0) ?? 0;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold tracking-tight text-neutral-900">Дашборд</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<Wallet className="h-5 w-5" strokeWidth={2} />}
          label="Выручка сегодня"
          value={formatMoney(todayRevenue)}
          accent="brand"
          index={0}
        />
        <StatCard
          icon={<Clock className="h-5 w-5" strokeWidth={2} />}
          label="Ожидают обработки"
          value={pendingOrders ?? 0}
          href="/admin/orders"
          accent="blue"
          index={1}
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" strokeWidth={2} />}
          label="Товары заканчиваются"
          value={lowStock?.length ?? 0}
          accent={lowStock && lowStock.length > 0 ? "amber" : "neutral"}
          index={2}
        />
      </div>

      {lowStock && lowStock.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Заканчивается на складе</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {lowStock.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-3 text-sm">
                <Link
                  href={`/admin/inventory/${v.products.id}`}
                  className="font-medium text-neutral-800 hover:text-brand-700 hover:underline"
                >
                  {v.products.name}
                  {/* Without the size the seller cannot tell which row to restock. */}
                  <span className="ml-1.5 text-neutral-400">{variantLabel(v)}</span>
                </Link>
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                  {v.stock_quantity} шт.
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
