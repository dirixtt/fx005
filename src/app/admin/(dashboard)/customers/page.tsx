import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { AddCustomerForm } from "@/components/admin/add-customer-form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/storefront/pagination";

const PAGE_SIZE = 30;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const t = await getTranslations("customers");
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const supabase = await createClient();

  const from = (page - 1) * PAGE_SIZE;
  const { data: customers, count } = await supabase
    .from("customers")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const makeHref = (p: number) => (p > 1 ? `/admin/customers?page=${p}` : "/admin/customers");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900">{t("title")}</h1>
        <p className="text-sm text-neutral-500">{t("countLabel", { count: count ?? 0 })}</p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <AddCustomerForm />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("colName")}</TableHead>
            <TableHead>{t("colPhone")}</TableHead>
            <TableHead>{t("colEmail")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers?.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">
                <Link href={`/admin/customers/${c.id}`} className="hover:text-brand-700 hover:underline">
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
