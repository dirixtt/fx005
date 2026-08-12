import Link from "next/link";
import { AlertTriangle, Clock, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatCard } from "@/components/admin/stat-card";
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

  const today = new Intl.DateTimeFormat("ru-RU", { weekday: "long", day: "numeric", month: "long" }).format(
    new Date(),
  );

  return (
    <div className="-m-4 min-h-[calc(100vh-3.5rem)] space-y-6 bg-bg-app p-4 transition-colors duration-300 md:-m-6 md:min-h-screen md:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-fg-primary">Дашборд</h1>
        <span className="text-[13px] capitalize text-fg-tertiary">{today}</span>
      </div>

      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-3">
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
        <div className="rounded-[18px] border border-glass-border bg-glass-bg p-6 shadow-[0_6px_22px_var(--shadow-color)] backdrop-blur-xl">
          <h3 className="mb-3.5 text-[11px] font-bold uppercase tracking-[0.04em] text-fg-tertiary">
            Заканчивается на складе
          </h3>
          <div className="divide-y divide-divider">
            {lowStock.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <Link
                  href={`/admin/inventory/${v.products.id}`}
                  className="font-medium text-fg-primary hover:underline"
                >
                  {v.products.name}
                  {/* Without the size the seller cannot tell which row to restock. */}
                  <span className="ml-1.5 font-normal text-fg-tertiary">{variantLabel(v)}</span>
                </Link>
                <span className="shrink-0 rounded-full bg-tint-orange px-2.5 py-0.5 text-xs font-semibold text-accent-orange">
                  {v.stock_quantity} шт.
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
