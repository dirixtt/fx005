import { Download } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button, buttonVariants } from "@/components/ui/button";
import { RevenueByDayChart, TopProductsChart } from "@/components/admin/reports-charts";
import { defaultDateRange, getReportData } from "@/lib/reports";
import { cn, formatMoney } from "@/lib/utils";
import type { AppLocale } from "@/lib/i18n/locale";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const t = await getTranslations("reports");
  const locale = (await getLocale()) as AppLocale;
  const params = await searchParams;
  const { from, to, fromDate, toDate } = defaultDateRange(params);

  const supabase = await createClient();
  const { sales, revenue, profit, stockValuation, revenueByDay, topProducts, truncated } =
    await getReportData(supabase, fromDate, toDate);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold tracking-tight text-neutral-900">{t("title")}</h1>
        <a
          href={`/admin/reports/export?from=${from}&to=${to}`}
          className={cn(buttonVariants({ variant: "outline" }))}
        >
          <Download className="h-4 w-4" /> {t("downloadExcel")}
        </a>
      </div>

      <form className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="from">{t("fromLabel")}</Label>
          <Input id="from" type="date" name="from" defaultValue={from} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="to">{t("toLabel")}</Label>
          <Input id="to" type="date" name="to" defaultValue={to} />
        </div>
        <Button type="submit" variant="outline">
          {t("apply")}
        </Button>
      </form>

      {truncated && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t("truncatedWarning")}
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>{t("revenue")}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-neutral-900">{formatMoney(revenue, locale)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("profit")}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-brand-700">{formatMoney(profit, locale)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("orders")}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-neutral-900">{sales.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("stockValuation")}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-neutral-900">{formatMoney(stockValuation, locale)}</CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("revenueByDay")}</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByDay.length ? (
              <RevenueByDayChart data={revenueByDay} />
            ) : (
              <p className="py-8 text-center text-sm text-neutral-500">{t("noSalesPeriod")}</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("topProducts")}</CardTitle>
          </CardHeader>
          <CardContent>
            {topProducts.length ? (
              <TopProductsChart data={topProducts} />
            ) : (
              <p className="py-8 text-center text-sm text-neutral-500">{t("noSalesPeriod")}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
