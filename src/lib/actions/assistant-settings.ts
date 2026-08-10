"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error?: string } | undefined;

const PATH = "/admin/settings/assistant";
const LANGUAGE_MODES = ["auto", "ru", "uz"] as const;

export async function updateAssistantSettings(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const reminderMinutes = Number(formData.get("reminder_minutes"));
  if (!Number.isFinite(reminderMinutes) || reminderMinutes <= 0) {
    return { error: "Интервал напоминания должен быть положительным числом." };
  }

  const languageMode = String(formData.get("language_mode") || "auto");
  if (!LANGUAGE_MODES.includes(languageMode as (typeof LANGUAGE_MODES)[number])) {
    return { error: "Некорректный язык." };
  }

  const signature = String(formData.get("signature") || "").trim();
  const extraInstructions = String(formData.get("extra_instructions") || "").trim();

  // Checkboxes send "on" when checked and are simply absent from FormData when
  // not — there is no unchecked value to read.
  const supabase = await createClient();
  const { error } = await supabase
    .from("assistant_settings")
    .update({
      enabled: formData.get("enabled") === "on",
      can_answer_availability: formData.get("can_answer_availability") === "on",
      can_answer_price: formData.get("can_answer_price") === "on",
      can_answer_order_status: formData.get("can_answer_order_status") === "on",
      can_answer_shop_info: formData.get("can_answer_shop_info") === "on",
      can_place_orders: formData.get("can_place_orders") === "on",
      can_match_photos: formData.get("can_match_photos") === "on",
      acknowledge_unanswered: formData.get("acknowledge_unanswered") === "on",
      reminder_minutes: reminderMinutes,
      language_mode: languageMode as (typeof LANGUAGE_MODES)[number],
      signature: signature || null,
      extra_instructions: extraInstructions || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);

  if (error) return { error: error.message };

  revalidatePath(PATH);
  return undefined;
}

export async function updateShopInfo(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const paymentText = String(formData.get("payment_text") || "").trim();
  const hoursText = String(formData.get("hours_text") || "").trim();

  const supabase = await createClient();
  const { error } = await supabase
    .from("shop_info")
    .update({
      payment_text: paymentText || null,
      hours_text: hoursText || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);

  if (error) return { error: error.message };

  revalidatePath(PATH);
  return undefined;
}

export async function addDeliveryZone(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") || "").trim();
  const price = Number(formData.get("price"));
  const etaDays = String(formData.get("eta_days") || "").trim();

  if (!name) return { error: "Укажите название зоны." };
  if (!Number.isFinite(price) || price < 0) return { error: "Цена должна быть числом не меньше нуля." };

  const supabase = await createClient();

  const { count } = await supabase.from("delivery_zones").select("*", { count: "exact", head: true });

  const { error } = await supabase.from("delivery_zones").insert({
    name,
    price,
    eta_days: etaDays || null,
    // New zones go to the end of the list the bot reads out, so an existing
    // order (say, cheapest first) is never silently reshuffled by an addition.
    sort_order: count ?? 0,
  });

  if (error) return { error: error.message };

  revalidatePath(PATH);
  return undefined;
}

export async function deleteDeliveryZone(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("delivery_zones").delete().eq("id", id);
  revalidatePath(PATH);
}
