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
        <Link href="/admin/customers" className="text-sm text-neutral-500 hover:underline">
          ← Back to customers
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-neutral-900">{customer.full_name}</h1>
        <p className="text-sm text-neutral-500">
          {customer.phone ?? "No phone"} · {customer.email ?? "No email"}
        </p>
      </div>

      <Card>
        <CardContent className="flex gap-8 pt-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">Total spent</p>
            <p className="text-lg font-semibold">{formatMoney(totalSpent)}</p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-neutral-500">Orders</p>
            <p className="text-lg font-semibold">{sales?.length ?? 0}</p>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-2 text-sm font-medium text-neutral-700">Purchase history</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales?.map((s) => (
              <TableRow key={s.id}>
                <TableCell>{new Date(s.created_at).toLocaleString()}</TableCell>
                <TableCell className="capitalize">{s.channel}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      s.status === "completed" ? "success" : s.status === "pending" ? "warning" : "destructive"
                    }
                  >
                    {s.status}
                  </Badge>
                </TableCell>
                <TableCell>{formatMoney(s.total)}</TableCell>
              </TableRow>
            ))}
            {!sales?.length && (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-neutral-500">
                  No purchases yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
