import { Download } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { RevenueByDayChart, TopProductsChart } from "@/components/admin/reports-charts";
import { defaultDateRange, getReportData } from "@/lib/reports";
import { cn, formatMoney } from "@/lib/utils";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const { from, to, fromDate, toDate } = defaultDateRange(params);

  const supabase = await createClient();
  const { sales, revenue, profit, stockValuation, revenueByDay, topProducts } = await getReportData(
    supabase,
    fromDate,
    toDate,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-neutral-900">Отчёты</h1>
        <a
          href={`/admin/reports/export?from=${from}&to=${to}`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <Download className="h-4 w-4" /> Скачать Excel
        </a>
      </div>

      <form className="flex items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="from">С</Label>
          <Input id="from" type="date" name="from" defaultValue={from} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to">По</Label>
          <Input id="to" type="date" name="to" defaultValue={to} />
        </div>
        <Button type="submit" variant="outline">
          Применить
        </Button>
      </form>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Выручка</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-neutral-900">{formatMoney(revenue)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Прибыль</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-brand-700">{formatMoney(profit)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Заказы</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-neutral-900">{sales.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Оценка склада</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-neutral-900">{formatMoney(stockValuation)}</CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Выручка по дням</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByDay.length ? (
              <RevenueByDayChart data={revenueByDay} />
            ) : (
              <p className="py-8 text-center text-sm text-neutral-500">Нет продаж за этот период.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Топ товаров (по продажам)</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length ? (
              <TopProductsChart data={topProducts} />
            ) : (
              <p className="py-8 text-center text-sm text-neutral-500">Нет продаж за этот период.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
