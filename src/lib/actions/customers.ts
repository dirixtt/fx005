"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCurrentStore } from "@/lib/stores/current-store";

export type ActionState = { error?: string } | undefined;

export async function createCustomer(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const full_name = String(formData.get("full_name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!full_name) {
    return { error: "Name is required" };
  }

  const store = await requireCurrentStore();
  const supabase = await createClient();
  const { error } = await supabase.from("customers").insert({
    store_id: store.id,
    full_name,
    phone: phone || null,
    email: email || null,
    notes: notes || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/customers");
  return { error: undefined };
}
