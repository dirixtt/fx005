import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddCategoryForm } from "@/components/admin/add-category-form";
import { InventoryFilters } from "@/components/admin/inventory-filters";
import { InventoryTable } from "@/components/admin/inventory-table";
import { Pagination } from "@/components/storefront/pagination";

const PAGE_SIZE = 30;

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; page?: string }>;
}) {
  const { category, q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const supabase = await createClient();

  let productsQuery = supabase
    .from("products")
    .select("*, categories(id, name), product_variants(*)", { count: "exact" })
    .order("created_at", { ascending: false });

  if (category) productsQuery = productsQuery.eq("category_id", category);
  if (q) productsQuery = productsQuery.ilike("name", `%${q}%`);

  const from = (page - 1) * PAGE_SIZE;

  const [{ data: products, count }, { data: categories }] = await Promise.all([
    productsQuery.range(from, from + PAGE_SIZE - 1),
    supabase.from("categories").select("*").order("name"),
  ]);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const makeHref = (p: number) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/admin/inventory?${qs}` : "/admin/inventory";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900">Склад</h1>
          <p className="text-sm text-neutral-500">{count ?? 0} товаров всего</p>
        </div>
        <Link href="/admin/inventory/new" className={buttonVariants()}>
          <PlusCircle className="h-4 w-4" /> Добавить товар
        </Link>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
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

      <InventoryFilters categories={categories ?? []} />

      <InventoryTable products={products ?? []} />

      <Pagination page={page} totalPages={totalPages} makeHref={makeHref} />
    </div>
  );
}
