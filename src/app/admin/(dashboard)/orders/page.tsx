import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/utils";

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("sales")
    .select("*")
    .eq("channel", "online")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-neutral-900">Online orders</h1>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders?.map((o) => (
            <TableRow key={o.id}>
              <TableCell>{new Date(o.created_at).toLocaleString()}</TableCell>
              <TableCell>
                {o.customer_name}
                <div className="text-xs text-neutral-500">{o.customer_phone}</div>
              </TableCell>
              <TableCell>{formatMoney(o.total)}</TableCell>
              <TableCell>
                <Badge
                  variant={o.status === "completed" ? "success" : o.status === "pending" ? "warning" : "destructive"}
                >
                  {o.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Link href={`/admin/orders/${o.id}`} className="text-sm hover:underline">
                  View
                </Link>
              </TableCell>
            </TableRow>
          ))}
          {!orders?.length && (
            <TableRow>
              <TableCell colSpan={5} className="py-8 text-center text-neutral-500">
                No online orders yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
