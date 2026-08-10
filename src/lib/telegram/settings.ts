import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";
import type { IntentLanguage } from "@/lib/telegram/intent";

/**
 * The seller's live configuration for the assistant, read fresh on every
 * message. No caching: a seller who just flipped the master switch off in
 * /admin/settings/assistant needs the very next message to respect it, not the
 * next deploy.
 */
export type AssistantSettings = {
  enabled: boolean;
  canAnswerAvailability: boolean;
  canAnswerPrice: boolean;
  canAnswerOrderStatus: boolean;
  canAnswerShopInfo: boolean;
  canPlaceOrders: boolean;
  canMatchPhotos: boolean;
  reminderMinutes: number;
  languageMode: "auto" | IntentLanguage;
  signature: string | null;
  extraInstructions: string | null;
};

/**
 * Used only if the settings row is somehow missing — it never should be, the
 * migration seeds exactly one row and nothing deletes it. Defaults match the
 * column defaults in the migration: everything on except order-taking, which
 * stays off until a seller has watched the bot's read-only answers and turned
 * it on deliberately.
 */
export const DEFAULT_SETTINGS: AssistantSettings = {
  enabled: true,
  canAnswerAvailability: true,
  canAnswerPrice: true,
  canAnswerOrderStatus: true,
  canAnswerShopInfo: true,
  canPlaceOrders: false,
  canMatchPhotos: false,
  reminderMinutes: 15,
  languageMode: "auto",
  signature: null,
  extraInstructions: null,
};

export async function loadAssistantSettings(
  supabase: SupabaseClient<Database>,
): Promise<AssistantSettings> {
  const { data, error } = await supabase.from("assistant_settings").select("*").maybeSingle();

  if (error || !data) {
    if (error) console.error("[settings] failed to load assistant_settings", error.message);
    return DEFAULT_SETTINGS;
  }

  return {
    enabled: data.enabled,
    canAnswerAvailability: data.can_answer_availability,
    canAnswerPrice: data.can_answer_price,
    canAnswerOrderStatus: data.can_answer_order_status,
    canAnswerShopInfo: data.can_answer_shop_info,
    canPlaceOrders: data.can_place_orders,
    canMatchPhotos: data.can_match_photos,
    reminderMinutes: data.reminder_minutes,
    languageMode: data.language_mode as "auto" | IntentLanguage,
    signature: data.signature,
    extraInstructions: data.extra_instructions,
  };
}

/** Applies the language override, when one is configured, to a reply's language. */
export function effectiveLanguage(settings: AssistantSettings, detected: IntentLanguage): IntentLanguage {
  return settings.languageMode === "auto" ? detected : settings.languageMode;
}

/** Appends the seller's signature, when one is configured. */
export function withSignature(settings: AssistantSettings, text: string): string {
  return settings.signature ? `${text}\n\n${settings.signature}` : text;
}
