"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { updateShopInfo, type ActionState } from "@/lib/actions/assistant-settings";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/lib/types/database.types";

export function ShopInfoForm({ info }: { info: Pick<Tables<"shop_info">, "payment_text" | "hours_text"> }) {
  const t = useTranslations("settings");
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateShopInfo, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="payment_text">{t("paymentLabel")}</Label>
        <Textarea
          id="payment_text"
          name="payment_text"
          defaultValue={info.payment_text ?? ""}
          rows={2}
          placeholder={t("paymentPlaceholder")}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="hours_text">{t("hoursLabel")}</Label>
        <Textarea
          id="hours_text"
          name="hours_text"
          defaultValue={info.hours_text ?? ""}
          rows={2}
          placeholder={t("hoursPlaceholder")}
        />
      </div>
      <p className="text-xs text-neutral-500">{t("shopInfoHint")}</p>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {t("save")}
        </Button>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      </div>
    </form>
  );
}
