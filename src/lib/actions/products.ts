"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { productSchema } from "@/lib/validation/product";
import { slugify } from "@/lib/utils";

export type ActionState = { error?: string } | undefined;

function parseForm(formData: FormData) {
  return productSchema.safeParse({
    name: formData.get("name"),
    sku: formData.get("sku") || undefined,
    barcode: formData.get("barcode") || undefined,
    category_id: formData.get("category_id") || undefined,
    description: formData.get("description") || undefined,
    cost_price: formData.get("cost_price"),
    sale_price: formData.get("sale_price"),
    stock_quantity: formData.get("stock_quantity"),
    show_on_storefront: formData.get("show_on_storefront") === "on",
  });
}

export async function createProduct(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const slugBase = slugify(parsed.data.name);
  const slug = `${slugBase}-${Math.random().toString(36).slice(2, 7)}`;

  const { error } = await supabase.from("products").insert({
    name: parsed.data.name,
    sku: parsed.data.sku || null,
    barcode: parsed.data.barcode || null,
    category_id: parsed.data.category_id || null,
    description: parsed.data.description || null,
    cost_price: parsed.data.cost_price,
    sale_price: parsed.data.sale_price,
    stock_quantity: parsed.data.stock_quantity,
    show_on_storefront: parsed.data.show_on_storefront ?? false,
    slug,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/inventory");
  redirect("/admin/inventory");
}

export async function updateProduct(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("products")
    .update({
      name: parsed.data.name,
      sku: parsed.data.sku || null,
      barcode: parsed.data.barcode || null,
      category_id: parsed.data.category_id || null,
      description: parsed.data.description || null,
      cost_price: parsed.data.cost_price,
      sale_price: parsed.data.sale_price,
      stock_quantity: parsed.data.stock_quantity,
      show_on_storefront: parsed.data.show_on_storefront ?? false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/inventory");
  redirect("/admin/inventory");
}

export async function setProductActive(id: string, isActive: boolean) {
  const supabase = await createClient();
  await supabase.from("products").update({ is_active: isActive }).eq("id", id);
  revalidatePath("/admin/inventory");
}

export async function archiveProduct(id: string) {
  await setProductActive(id, false);
}

export async function restoreProduct(id: string) {
  await setProductActive(id, true);
}
