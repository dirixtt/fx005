import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProductForm } from "@/components/admin/product-form";
import { updateProduct } from "@/lib/actions/products";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    supabase.from("categories").select("*").order("name"),
  ]);

  if (!product) {
    notFound();
  }

  const boundAction = updateProduct.bind(null, id);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/inventory" className="text-sm text-neutral-500 hover:underline">
          ← Back to inventory
        </Link>
        <h1 className="mt-1 text-xl font-semibold text-neutral-900">Edit {product.name}</h1>
      </div>
      <ProductForm action={boundAction} categories={categories ?? []} product={product} />
    </div>
  );
}
