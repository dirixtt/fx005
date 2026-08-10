import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/storefront/pagination";
import { formatMoney } from "@/lib/utils";

const PAGE_SIZE = 30;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const supabase = await createClient();

  const from = (page - 1) * PAGE_SIZE;
  const { data: orders, count } = await supabase
    .from("sales")
    .select("*", { count: "exact" })
    .eq("channel", "online")
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const makeHref = (p: number) => (p > 1 ? `/admin/orders?page=${p}` : "/admin/orders");

  const statusLabel: Record<string, string> = {
    completed: "Выполнен",
    pending: "В обработке",
    cancelled: "Отменён",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900">Онлайн-заказы</h1>
        <p className="text-sm text-neutral-500">{count ?? 0} заказов всего</p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Дата</TableHead>
            <TableHead>Клиент</TableHead>
            <TableHead>Сумма</TableHead>
            <TableHead>Статус</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders?.map((o) => (
            <TableRow key={o.id}>
              <TableCell>{new Date(o.created_at).toLocaleString("ru-RU")}</TableCell>
              <TableCell>
                {o.customer_name}
                <div className="text-xs text-neutral-500">{o.customer_phone}</div>
              </TableCell>
              <TableCell className="font-medium">{formatMoney(o.total)}</TableCell>
              <TableCell>
                <Badge
                  variant={o.status === "completed" ? "success" : o.status === "pending" ? "warning" : "destructive"}
                >
                  {statusLabel[o.status] ?? o.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Link href={`/admin/orders/${o.id}`} className="text-sm font-medium text-brand-700 hover:underline">
                  Открыть
                </Link>
              </TableCell>
            </TableRow>
          ))}
          {!orders?.length && (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-neutral-500">
                Онлайн-заказов пока нет.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Pagination page={page} totalPages={totalPages} makeHref={makeHref} />
    </div>
  );
}
