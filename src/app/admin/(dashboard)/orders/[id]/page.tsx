import Link from "next/link";
import { notFound } from "next/navigation";
import { getFormatter, getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrderCancelForm } from "@/components/admin/order-cancel-form";
import { OrderFulfillForm } from "@/components/admin/order-fulfill-form";
import { cancelOrder, fulfillOrder } from "@/lib/actions/orders";
import { formatMoney } from "@/lib/utils";
import type { AppLocale } from "@/lib/i18n/locale";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("orders");
  const locale = (await getLocale()) as AppLocale;
  const format = await getFormatter();
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: order }, { data: items }] = await Promise.all([
    supabase
      .from("sales")
      .select("*")
      .eq("id", id)
      .in("channel", ["online", "telegram"])
      .maybeSingle(),
    supabase.from("sale_items").select("*").eq("sale_id", id),
  ]);

  if (!order) {
    notFound();
  }

  const boundFulfill = fulfillOrder.bind(null, id);
  const boundCancel = cancelOrder.bind(null, id);

  const statusLabel =
    order.status === "completed" ? t("statusCompleted") : order.status === "pending" ? t("statusPending") : t("statusCancelled");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/orders" className="text-sm text-neutral-500 hover:text-brand-700 hover:underline">
          {t("backToOrders")}
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            {t("orderTitle", { id: order.id.slice(0, 8) })}
          </h1>
          {order.channel === "telegram" && <Badge variant="secondary">{t("telegramBadge")}</Badge>}
          <Badge
            variant={
              order.status === "completed" ? "success" : order.status === "pending" ? "warning" : "destructive"
            }
          >
            {statusLabel}
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 pt-4 text-sm">
          <div>
            <p className="text-neutral-500">{t("customerLabel")}</p>
            <p className="font-medium">{order.customer_name}</p>
          </div>
          <div>
            <p className="text-neutral-500">{t("phoneLabel")}</p>
            <p className="font-medium">{order.customer_phone}</p>
          </div>
          <div>
            <p className="text-neutral-500">{t("shippingAddressLabel")}</p>
            <p className="font-medium">{order.shipping_address ?? "—"}</p>
          </div>
          <div>
            <p className="text-neutral-500">{t("placedAtLabel")}</p>
            <p className="font-medium">{format.dateTime(new Date(order.created_at), { dateStyle: "medium", timeStyle: "short" })}</p>
          </div>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("colProduct")}</TableHead>
            <TableHead>{t("colQty")}</TableHead>
            <TableHead>{t("colUnitPrice")}</TableHead>
            <TableHead>{t("colSum")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items?.map((i) => (
            <TableRow key={i.id}>
              <TableCell>{i.product_name}</TableCell>
              <TableCell>{i.quantity}</TableCell>
              <TableCell>{formatMoney(i.unit_price, locale)}</TableCell>
              <TableCell>{formatMoney(i.line_total, locale)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between border-t border-neutral-200 pt-3 text-base font-bold text-neutral-900">
        <span>{t("total")}</span>
        <span>{formatMoney(order.total, locale)}</span>
      </div>

      {order.status === "pending" && (
        <div className="flex flex-wrap items-end justify-between gap-4">
          <OrderFulfillForm action={boundFulfill} />
          <OrderCancelForm action={boundCancel} />
        </div>
      )}
    </div>
  );
}
