import Link from "next/link";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/storefront/pagination";
import { formatMoney } from "@/lib/utils";
import type { AppLocale } from "@/lib/i18n/locale";

const PAGE_SIZE = 30;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const t = await getTranslations("orders");
  const locale = (await getLocale()) as AppLocale;
  const format = await getFormatter();
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const supabase = await createClient();

  const from = (page - 1) * PAGE_SIZE;
  // Telegram orders are online orders that arrived through a conversation instead
  // of the cart. Leaving them out of this list would mean a customer waits for a
  // call the seller never knew to make.
  const { data: orders, count } = await supabase
    .from("sales")
    .select("*", { count: "exact" })
    .in("channel", ["online", "telegram"])
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const makeHref = (p: number) => (p > 1 ? `/admin/orders?page=${p}` : "/admin/orders");

  const statusLabel: Record<string, string> = {
    completed: t("statusCompleted"),
    pending: t("statusPending"),
    cancelled: t("statusCancelled"),
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900">{t("title")}</h1>
        <p className="text-sm text-neutral-500">{t("countLabel", { count: count ?? 0 })}</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("colDate")}</TableHead>
            <TableHead>{t("colCustomer")}</TableHead>
            <TableHead>{t("colAmount")}</TableHead>
            <TableHead>{t("colStatus")}</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders?.map((o) => (
            <TableRow key={o.id}>
              <TableCell>{format.dateTime(new Date(o.created_at), { dateStyle: "medium", timeStyle: "short" })}</TableCell>
              <TableCell>
                <span className="flex items-center gap-1.5">
                  {o.channel === "telegram" && (
                    <span title={t("telegramOrderTitle")} aria-label={t("telegramOrderTitle")}>
                      💬
                    </span>
                  )}
                  {o.customer_name}
                </span>
                <div className="text-xs text-neutral-500">{o.customer_phone}</div>
              </TableCell>
              <TableCell className="font-medium">{formatMoney(o.total, locale)}</TableCell>
              <TableCell>
                <Badge
                  variant={o.status === "completed" ? "success" : o.status === "pending" ? "warning" : "destructive"}
                >
                  {statusLabel[o.status] ?? o.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Link href={`/admin/orders/${o.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                  {t("openLink")}
                </Link>
              </TableCell>
            </TableRow>
          ))}
          {!orders?.length && (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-neutral-500">
                {t("empty")}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination page={page} totalPages={totalPages} makeHref={makeHref} />
    </div>
  );
}
