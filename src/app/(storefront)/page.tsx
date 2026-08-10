import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ProductGrid } from "@/components/storefront/product-grid";
import { Pagination } from "@/components/storefront/pagination";

const PAGE_SIZE = 24;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  if (!q) return {};
  return {
    title: `Поиск: ${q}`,
    robots: { index: false, follow: true },
  };
}

export default async function StorefrontHomePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; page?: string }>;
}) {
  const { category, q, page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const supabase = await createClient();

  let query = supabase
    .from("products")
    .select(
      "id, name, slug, image_url, category_id, product_variants(id, size, color, sale_price, stock_quantity)",
      { count: "exact" },
    )
    .eq("is_active", true)
    .eq("show_on_storefront", true);

  if (category) query = query.eq("category_id", category);
  if (q) query = query.ilike("name", `%${q}%`);

  const from = (page - 1) * PAGE_SIZE;
  const { data: products, count } = await query
    .order("name")
    .range(from, from + PAGE_SIZE - 1);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const makeHref = (p: number) => {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  };

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl bg-ink-950 px-6 py-8 sm:px-10 sm:py-12">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-400">Магазин инструментов</p>
        <h1 className="mt-2 max-w-lg text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
          {q ? `Результаты по запросу «${q}»` : "Всё для дома, стройки и сада"}
        </h1>
        <p className="mt-2 max-w-md text-sm text-neutral-400">
          {count ?? 0} товаров в наличии — от отвёрток и замков до кабеля и электрофурнитуры.
        </p>
      </div>

      {!products?.length ? (
        <p className="py-12 text-center text-neutral-500">Товары не найдены — попробуйте другой запрос.</p>
      ) : (
        <>
          <ProductGrid products={products} />
          <Pagination page={page} totalPages={totalPages} makeHref={makeHref} />
        </>
      )}
    </div>
  );
}
