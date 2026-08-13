import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssistantSettingsForm } from "@/components/admin/assistant-settings-form";
import { ShopInfoForm } from "@/components/admin/shop-info-form";
import { DeliveryZonesManager } from "@/components/admin/delivery-zones-manager";

/**
 * The seller's control panel for the Telegram assistant.
 *
 * Every field on this page is wired to real behaviour — there is no toggle here
 * that looks like it does something and quietly does nothing. What is
 * deliberately absent (a discount/bargain setting, computed quiet hours) was
 * discussed and dropped for the same reason: a setting nothing reads is worse
 * than no setting.
 */
export default async function AssistantSettingsPage() {
  const t = await getTranslations("settings");
  const supabase = await createClient();

  const [{ data: settings }, { data: shopInfo }, { data: zones }] = await Promise.all([
    supabase.from("assistant_settings").select("*").maybeSingle(),
    supabase.from("shop_info").select("payment_text, hours_text").maybeSingle(),
    supabase.from("delivery_zones").select("*").order("sort_order"),
  ]);

  if (!settings) {
    // The migration seeds exactly one row and nothing deletes it — reaching this
    // means the migration has not been applied, not a state to design a UI for.
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
        {t("migrationMissing")}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900">{t("pageTitle")}</h1>
        <p className="text-sm text-neutral-500">
          {t("pageSubtitleBeforeLink")}{" "}
          <a href="/admin/telegram" className="text-brand-700 hover:underline">
            {t("pageSubtitleLinkText")}
          </a>
          .
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("assistantCardTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <AssistantSettingsForm settings={settings} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("paymentHoursCardTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ShopInfoForm info={shopInfo ?? { payment_text: null, hours_text: null }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("deliveryCardTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <DeliveryZonesManager zones={zones ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
