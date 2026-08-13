"use client";

import { useActionState } from "react";
import { Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { addDeliveryZone, deleteDeliveryZone, type ActionState } from "@/lib/actions/assistant-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/utils";
import type { Tables } from "@/lib/types/database.types";
import type { AppLocale } from "@/lib/i18n/locale";

type Zone = Tables<"delivery_zones">;

export function DeliveryZonesManager({ zones }: { zones: Zone[] }) {
  const t = useTranslations("settings");
  const locale = useLocale() as AppLocale;
  const [state, formAction, pending] = useActionState<ActionState, FormData>(addDeliveryZone, undefined);

  return (
    <div className="space-y-4">
      {zones.length > 0 ? (
        <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200">
          {zones.map((zone) => (
            <li key={zone.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span>
                <span className="font-medium text-neutral-900">{zone.name}</span>
                <span className="ml-2 text-neutral-500">
                  {formatMoney(zone.price, locale)}
                  {zone.eta_days ? ` · ${zone.eta_days}` : ""}
                </span>
              </span>
              <form action={deleteDeliveryZone.bind(null, zone.id)}>
                <button
                  type="submit"
                  className="text-neutral-400 transition-colors hover:text-red-600"
                  aria-label={t("removeZone", { name: zone.name })}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-neutral-500">{t("noZones")}</p>
      )}

      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <div className="w-40 space-y-1.5">
          <label className="text-xs font-medium text-neutral-700">{t("zoneLabel")}</label>
          <Input name="name" placeholder={t("zonePlaceholder")} />
        </div>
        <div className="w-32 space-y-1.5">
          <label className="text-xs font-medium text-neutral-700">{t("priceLabel")}</label>
          <Input name="price" type="number" min={0} placeholder={t("pricePlaceholder")} />
        </div>
        <div className="w-32 space-y-1.5">
          <label className="text-xs font-medium text-neutral-700">{t("etaLabel")}</label>
          <Input name="eta_days" placeholder={t("etaPlaceholder")} />
        </div>
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {t("add")}
        </Button>
      </form>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
