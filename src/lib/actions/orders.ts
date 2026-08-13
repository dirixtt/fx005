"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string } | undefined;

export async function fulfillOrder(
  id: string,
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const t = await getTranslations("orders");
  const paymentMethod = String(formData.get("payment_method") || "cash");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("sales")
    .update({
      status: "completed",
      payment_method: paymentMethod as "cash" | "card" | "other",
      fulfilled_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("channel", "online")
    .eq("status", "pending")
    .select("id")
    .maybeSingle();

  if (error) {
    return { error: error.message };
  }

  if (!data) {
    return { error: t("errorAlreadyProcessed") };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  return { error: undefined };
}

export async function cancelOrder(id: string): Promise<ActionState> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("cancel_online_order", { p_order_id: id });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
  return { error: undefined };
}
