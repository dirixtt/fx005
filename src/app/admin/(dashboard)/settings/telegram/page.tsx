import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TelegramLinkCode } from "@/components/admin/telegram-link-code";

/**
 * Where a store links its own Telegram Business account to the bot.
 *
 * One bot account serves every store — Telegram Business Connect is already
 * per-seller-authorization at the protocol level, so the only thing this app
 * has to solve is *which* store an incoming business_connection_id belongs
 * to. That's what the code flow below does; see the webhook route's
 * handleLinkAttempt for the other half.
 */
export default async function TelegramLinkPage() {
  const t = await getTranslations("telegramSettings");
  const supabase = await createClient();

  // RLS already scopes this to the caller's own store — no explicit store_id
  // filter needed for a read.
  const { data: connections } = await supabase
    .from("telegram_connections")
    .select("business_connection_id, is_enabled, can_reply, updated_at");

  const connection = connections?.[0] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900">{t("pageTitle")}</h1>
        <p className="text-sm text-neutral-500">{t("pageSubtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("statusTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Badge variant={connection?.is_enabled && connection.can_reply ? "success" : "secondary"}>
            {connection?.is_enabled && connection.can_reply ? t("connected") : t("notConnected")}
          </Badge>
          {connection && !connection.can_reply && (
            <span className="text-xs text-amber-700">{t("cannotReplyNote")}</span>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("linkAccountTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <TelegramLinkCode />
        </CardContent>
      </Card>
    </div>
  );
}
