import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrderCancelForm } from "@/components/admin/order-cancel-form";
import { OrderFulfillForm } from "@/components/admin/order-fulfill-form";
import { cancelOrder, fulfillOrder } from "@/lib/actions/orders";
import { formatMoney } from "@/lib/utils";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: order }, { data: items }] = await Promise.all([
    supabase.from("sales").select("*").eq("id", id).eq("channel", "online").maybeSingle(),
    supabase.from("sale_items").select("*").eq("sale_id", id),
  ]);

  if (!order) {
    notFound();
  }

  const boundFulfill = fulfillOrder.bind(null, id);
  const boundCancel = cancelOrder.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/orders" className="text-sm text-neutral-500 hover:text-brand-700 hover:underline">
          ← Назад к заказам
        </Link>
        <div className="mt-1 flex items-center gap-3">
          <h1 className="text-xl font-bold text-neutral-900">Заказ #{order.id.slice(0, 8)}</h1>
          <Badge
            variant={
              order.status === "completed" ? "success" : order.status === "pending" ? "warning" : "destructive"
            }
          >
            {order.status === "completed" ? "Выполнен" : order.status === "pending" ? "В обработке" : "Отменён"}
          </Badge>
        </div>
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 pt-4 text-sm">
          <div>
            <p className="text-neutral-500">Клиент</p>
            <p className="font-medium">{order.customer_name}</p>
          </div>
          <div>
            <p className="text-neutral-500">Телефон</p>
            <p className="font-medium">{order.customer_phone}</p>
          </div>
          <div>
            <p className="text-neutral-500">Адрес доставки</p>
            <p className="font-medium">{order.shipping_address ?? "—"}</p>
          </div>
          <div>
            <p className="text-neutral-500">Оформлен</p>
            <p className="font-medium">{new Date(order.created_at).toLocaleString("ru-RU")}</p>
          </div>
        </CardContent>
      </Card>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Товар</TableHead>
            <TableHead>Кол-во</TableHead>
            <TableHead>Цена за шт.</TableHead>
            <TableHead>Сумма</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items?.map((i) => (
            <TableRow key={i.id}>
              <TableCell>{i.product_name}</TableCell>
              <TableCell>{i.quantity}</TableCell>
              <TableCell>{formatMoney(i.unit_price)}</TableCell>
              <TableCell>{formatMoney(i.line_total)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between border-t border-neutral-200 pt-3 text-base font-bold text-neutral-900">
        <span>Итого</span>
        <span>{formatMoney(order.total)}</span>
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
