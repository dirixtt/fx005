import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AddCustomerForm } from "@/components/admin/add-customer-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-neutral-900">Customers</h1>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <AddCustomerForm />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Email</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers?.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">
                <Link href={`/admin/customers/${c.id}`} className="hover:underline">
                  {c.full_name}
                </Link>
              </TableCell>
              <TableCell>{c.phone ?? "—"}</TableCell>
              <TableCell>{c.email ?? "—"}</TableCell>
            </TableRow>
          ))}
          {!customers?.length && (
            <TableRow>
              <TableCell colSpan={3} className="py-8 text-center text-neutral-500">
                No customers yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
