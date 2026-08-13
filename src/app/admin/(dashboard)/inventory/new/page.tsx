import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/product-form";
import { createProduct } from "@/lib/actions/products";

export default async function NewProductPage() {
  const t = await getTranslations("inventory");
  const supabase = await createClient();
  const { data: categories } = await supabase.from("categories").select("*").order("name");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/inventory" className="text-sm text-neutral-500 hover:text-brand-700 hover:underline">
          {t("backToInventory")}
        </Link>
        <h1 className="mt-1 text-xl font-bold text-neutral-900">{t("addProductTitle")}</h1>
      </div>
      <ProductForm action={createProduct} categories={categories ?? []} />
    </div>
  );
}
