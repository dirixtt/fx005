import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/product-form";
import { createProduct } from "@/lib/actions/products";

export default async function NewProductPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase.from("categories").select("*").order("name");

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/inventory" className="text-sm text-neutral-500 hover:underline">
          ← Back to inventory
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-neutral-900">Add product</h1>
      </div>
      <ProductForm action={createProduct} categories={categories ?? []} />
    </div>
  );
}
