"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updateAssistantSettings, type ActionState } from "@/lib/actions/assistant-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/lib/types/database.types";

type Settings = Tables<"assistant_settings">;

export function AssistantSettingsForm({ settings }: { settings: Settings }) {
  const t = useTranslations("settings");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateAssistantSettings, undefined);

  const capabilities: Array<{ name: keyof Settings; label: string; hint: string }> = [
    { name: "can_answer_availability", label: t("capAvailability"), hint: t("capAvailabilityHint") },
    { name: "can_answer_price", label: t("capPrice"), hint: t("capPriceHint") },
    { name: "can_answer_order_status", label: t("capOrderStatus"), hint: t("capOrderStatusHint") },
    { name: "can_answer_shop_info", label: t("capShopInfo"), hint: t("capShopInfoHint") },
    { name: "can_match_photos", label: t("capPhotos"), hint: t("capPhotosHint") },
    { name: "can_place_orders", label: t("capOrders"), hint: t("capOrdersHint") },
  ];

  return (
    <form action={formAction} className="space-y-5">
      <label className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3">
        <input type="checkbox" name="enabled" defaultChecked={settings.enabled} className="h-4 w-4" />
        <span>
          <span className="block text-sm font-medium text-neutral-900">{t("enabledLabel")}</span>
          <span className="block text-xs text-neutral-500">{t("enabledHint")}</span>
        </span>
      </label>

      <label className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3">
        <input
          type="checkbox"
          name="acknowledge_unanswered"
          defaultChecked={settings.acknowledge_unanswered}
          className="h-4 w-4"
        />
        <span>
          <span className="block text-sm font-medium text-neutral-900">{t("ackLabel")}</span>
          <span className="block text-xs text-neutral-500">{t("ackHint")}</span>
        </span>
      </label>

      <div className="space-y-2">
        <p className="text-sm font-medium text-neutral-700">{t("whatItAnswersLabel")}</p>
        {capabilities.map((cap) => (
          <label key={cap.name} className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3">
            <input
              type="checkbox"
              name={cap.name}
              defaultChecked={Boolean(settings[cap.name])}
              className="h-4 w-4"
            />
            <span>
              <span className="block text-sm text-neutral-900">{cap.label}</span>
              <span className="block text-xs text-neutral-500">{cap.hint}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="reminder_minutes">{t("reminderMinutesLabel")}</Label>
          <Input
            id="reminder_minutes"
            name="reminder_minutes"
            type="number"
            min={1}
            defaultValue={settings.reminder_minutes}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="language_mode">{t("languageModeLabel")}</Label>
          <Select id="language_mode" name="language_mode" defaultValue={settings.language_mode}>
            <option value="auto">{t("languageAuto")}</option>
            <option value="ru">{t("languageRu")}</option>
            <option value="uz">{t("languageUz")}</option>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="signature">{t("signatureLabel")}</Label>
        <Textarea id="signature" name="signature" defaultValue={settings.signature ?? ""} rows={2} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="extra_instructions">{t("extraInstructionsLabel")}</Label>
        <Textarea
          id="extra_instructions"
          name="extra_instructions"
          defaultValue={settings.extra_instructions ?? ""}
          rows={3}
          placeholder={t("extraInstructionsPlaceholder")}
        />
        <p className="text-xs text-neutral-500">{t("extraInstructionsHint")}</p>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {t("save")}
        </Button>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      </div>
    </form>
  );
}
