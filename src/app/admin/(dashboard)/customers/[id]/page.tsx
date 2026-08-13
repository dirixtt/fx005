import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/utils";
import type { AppLocale } from "@/lib/i18n/locale";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("customers");
  const locale = (await getLocale()) as AppLocale;
  const format = await getFormatter();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: customer }, { data: sales }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", id).maybeSingle(),
    supabase
      .from("sales")
      .select("*")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (!customer) {
    notFound();
  }

  const completedSales = sales?.filter((s) => s.status === "completed") ?? [];
  const totalSpent = completedSales.reduce((sum, s) => sum + s.total, 0);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/customers" className="text-sm text-neutral-500 hover:text-brand-700 hover:underline">
          {t("backToCustomers")}
        </Link>
        <h1 className="mt-1 text-xl font-bold text-neutral-900">{customer.full_name}</h1>
        <p className="text-sm text-neutral-500">
          {customer.phone ?? t("noPhone")} · {customer.email ?? t("noEmail")}
        </p>
      </div>

      <Card>
        <CardContent className="flex gap-8 pt-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">{t("totalSpent")}</p>
            <p className="text-lg font-bold text-brand-700">{formatMoney(totalSpent, locale)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">{t("ordersCount")}</p>
            <p className="text-lg font-bold text-neutral-900">{sales?.length ?? 0}</p>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          {t("purchaseHistory")}
        </h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colDate")}</TableHead>
              <TableHead>{t("colChannel")}</TableHead>
              <TableHead>{t("colStatus")}</TableHead>
              <TableHead>{t("colAmount")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales?.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{format.dateTime(new Date(s.created_at), { dateStyle: "medium", timeStyle: "short" })}</TableCell>
                <TableCell>{s.channel === "pos" ? t("channelPos") : t("channelOnline")}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      s.status === "completed" ? "success" : s.status === "pending" ? "warning" : "destructive"
                    }
                  >
                    {s.status === "completed"
                      ? t("statusCompleted")
                      : s.status === "pending"
                        ? t("statusPending")
                        : t("statusCancelled")}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{formatMoney(s.total, locale)}</TableCell>
              </TableRow>
            ))}
            {!sales?.length && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-neutral-500">
                  {t("noPurchases")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
