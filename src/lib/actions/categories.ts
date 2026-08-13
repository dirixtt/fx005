"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentStore } from "@/lib/stores/current-store";

export async function createCategory(_prevState: { error?: string } | undefined, formData: FormData) {
  const t = await getTranslations("inventory");
  const name = String(formData.get("name") || "").trim();
  if (!name) {
    return { error: t("errorCategoryNameRequired") };
  }

  const store = await requireCurrentStore();
  const supabase = await createClient();
  const { error } = await supabase.from("categories").insert({ name, store_id: store.id });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/inventory");
  return { error: undefined };
}
