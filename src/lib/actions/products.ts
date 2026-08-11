"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  parseVariantsFromFormData,
  productWithVariantsSchema,
  type VariantFormValues,
} from "@/lib/validation/product";
import { slugify } from "@/lib/utils";
import { requireCurrentStore } from "@/lib/stores/current-store";

export type ActionState = { error?: string } | undefined;

function parseForm(formData: FormData) {
  return productWithVariantsSchema.safeParse({
    name: formData.get("name"),
    category_id: formData.get("category_id") || undefined,
    description: formData.get("description") || undefined,
    show_on_storefront: formData.get("show_on_storefront") === "on",
    image_url: formData.get("image_url") || undefined,
    variants: parseVariantsFromFormData(formData),
  });
}

/** Empty strings from the form become NULL, so "no size" is one value, not two. */
function variantRow(variant: VariantFormValues, productId: string, storeId: string) {
  return {
    product_id: productId,
    store_id: storeId,
    size: variant.size || null,
    color: variant.color || null,
    sku: variant.sku || null,
    barcode: variant.barcode || null,
    cost_price: variant.cost_price,
    sale_price: variant.sale_price,
    stock_quantity: variant.stock_quantity,
    updated_at: new Date().toISOString(),
  };
}

export async function createProduct(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Проверьте поля формы" };
  }

  const store = await requireCurrentStore();
  const supabase = await createClient();
  const slugBase = slugify(parsed.data.name) || "tovar";
  const slug = `${slugBase}-${Math.random().toString(36).slice(2, 7)}`;

  const { data: product, error } = await supabase
    .from("products")
    .insert({
      store_id: store.id,
      name: parsed.data.name,
      category_id: parsed.data.category_id || null,
      description: parsed.data.description || null,
      show_on_storefront: parsed.data.show_on_storefront ?? false,
      image_url: parsed.data.image_url || null,
      slug,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  const { error: variantError } = await supabase
    .from("product_variants")
    .insert(parsed.data.variants.map((v) => variantRow(v, product.id, store.id)));

  if (variantError) {
    // Without this the catalogue would keep a product that has nothing to sell:
    // no price, no stock, invisible on the storefront and unaddable to a cart.
    await supabase.from("products").delete().eq("id", product.id);
    return { error: `Не удалось сохранить варианты: ${variantError.message}` };
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
    return { error: parsed.error.issues[0]?.message ?? "Проверьте поля формы" };
  }

  const store = await requireCurrentStore();
  const supabase = await createClient();

  const { error } = await supabase
    .from("products")
    .update({
      name: parsed.data.name,
      category_id: parsed.data.category_id || null,
      description: parsed.data.description || null,
      show_on_storefront: parsed.data.show_on_storefront ?? false,
      image_url: parsed.data.image_url || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  const submitted = parsed.data.variants;
  const keptIds = submitted.map((v) => v.id).filter((v): v is string => Boolean(v));

  // Rows the seller removed in the form. Deleted before the upsert so a size
  // being renamed (delete 41, add 42) cannot collide on the (product, size,
  // colour) unique index mid-way.
  let removal = supabase.from("product_variants").delete().eq("product_id", id);
  if (keptIds.length > 0) {
    removal = removal.not("id", "in", `(${keptIds.join(",")})`);
  }

  const { error: deleteError } = await removal;
  if (deleteError) {
    // Restricted by the sale_items foreign key: a variant that has ever been sold
    // cannot disappear, or historic receipts would lose what was actually bought.
    return {
      error:
        "Нельзя удалить вариант, по которому уже были продажи. Обнулите остаток вместо удаления.",
    };
  }

  const existing = submitted.filter((v) => v.id);
  const added = submitted.filter((v) => !v.id);

  for (const variant of existing) {
    const { error: updateError } = await supabase
      .from("product_variants")
      .update(variantRow(variant, id, store.id))
      .eq("id", variant.id!);
    if (updateError) return { error: updateError.message };
  }

  if (added.length > 0) {
    const { error: insertError } = await supabase
      .from("product_variants")
      .insert(added.map((v) => variantRow(v, id, store.id)));
    if (insertError) return { error: insertError.message };
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
