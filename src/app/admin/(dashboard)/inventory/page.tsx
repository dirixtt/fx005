import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddCategoryForm } from "@/components/admin/add-category-form";
import { archiveProduct, restoreProduct } from "@/lib/actions/products";
import { formatMoney } from "@/lib/utils";

export default async function InventoryPage() {
  const supabase = await createClient();

  const [{ data: products }, { data: categories }] = await Promise.all([
    supabase
      .from("products")
      .select("*, categories(name)")
      .order("created_at", { ascending: false }),
    supabase.from("categories").select("*").order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-neutral-900">Inventory</h1>
        <Link href="/admin/inventory/new" className={buttonVariants()}>
          Add product
        </Link>
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <AddCategoryForm />
        {categories && categories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <Badge key={c.id} variant="secondary">
                {c.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Barcode</TableHead>
            <TableHead>Cost</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Stock</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {products?.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">
                <Link href={`/admin/inventory/${p.id}`} className="hover:underline">
                  {p.name}
                </Link>
              </TableCell>
              <TableCell>{p.categories?.name ?? "—"}</TableCell>
              <TableCell>{p.barcode ?? "—"}</TableCell>
              <TableCell>{formatMoney(p.cost_price)}</TableCell>
              <TableCell>{formatMoney(p.sale_price)}</TableCell>
              <TableCell>
                {p.stock_quantity <= 5 ? (
                  <Badge variant="warning">{p.stock_quantity} low</Badge>
                ) : (
                  p.stock_quantity
                )}
              </TableCell>
              <TableCell>
                {p.is_active ? (
                  <Badge variant="success">Active</Badge>
                ) : (
                  <Badge variant="secondary">Archived</Badge>
                )}
              </TableCell>
              <TableCell>
                <form action={p.is_active ? archiveProduct.bind(null, p.id) : restoreProduct.bind(null, p.id)}>
                  <Button type="submit" variant="ghost" size="sm">
                    {p.is_active ? "Archive" : "Restore"}
                  </Button>
                </form>
              </TableCell>
            </TableRow>
          ))}
          {!products?.length && (
            <TableRow>
              <TableCell colSpan={8} className="py-8 text-center text-neutral-500">
                No products yet. Add your first product to get started.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
