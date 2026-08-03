import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/utils";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
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
          ← Назад к клиентам
        </Link>
        <h1 className="mt-1 text-xl font-bold text-neutral-900">{customer.full_name}</h1>
        <p className="text-sm text-neutral-500">
          {customer.phone ?? "Нет телефона"} · {customer.email ?? "Нет email"}
        </p>
      </div>

      <Card>
        <CardContent className="flex gap-8 pt-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">Всего потрачено</p>
            <p className="text-lg font-bold text-brand-700">{formatMoney(totalSpent)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">Заказов</p>
            <p className="text-lg font-bold text-neutral-900">{sales?.length ?? 0}</p>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">История покупок</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Дата</TableHead>
              <TableHead>Канал</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Сумма</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales?.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{new Date(s.created_at).toLocaleString("ru-RU")}</TableCell>
                <TableCell>{s.channel === "pos" ? "Касса" : "Онлайн"}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      s.status === "completed" ? "success" : s.status === "pending" ? "warning" : "destructive"
                    }
                  >
                    {s.status === "completed" ? "Выполнен" : s.status === "pending" ? "В обработке" : "Отменён"}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{formatMoney(s.total)}</TableCell>
              </TableRow>
            ))}
            {!sales?.length && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-neutral-500">
                  Покупок пока нет.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
