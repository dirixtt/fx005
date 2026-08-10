import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConversationList } from "@/components/admin/conversation-list";

/**
 * What the bot is doing, in one screen.
 *
 * The point is not analytics — it is trust. A seller who cannot see what an
 * automated assistant said to their customers will, correctly, turn it off. Every
 * message is here, with what the classifier made of it, so a wrong answer is
 * visible in seconds instead of arriving as a complaint.
 */

const MESSAGE_LIMIT = 300;

export default async function TelegramPage() {
  const supabase = await createClient();

  const [{ data: messages }, { data: connections }] = await Promise.all([
    supabase
      .from("telegram_messages")
      .select("id, chat_id, direction, text, intent, created_at")
      .order("created_at", { ascending: false })
      .limit(MESSAGE_LIMIT),
    supabase
      .from("telegram_connections")
      .select("business_connection_id, is_enabled, can_reply, updated_at"),
  ]);

  const connection = connections?.[0] ?? null;
  const inbound = messages?.filter((m) => m.direction === "in") ?? [];
  const answered = inbound.filter((m) => m.intent && m.intent !== "other").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-neutral-900">Диалоги в Telegram</h1>
        <p className="text-sm text-neutral-500">
          Последние {MESSAGE_LIMIT} сообщений · сначала новые
        </p>
      </div>

      {!connection && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Бот ещё не подключён. В Telegram: Настройки → Telegram Business → Чат-боты,
          добавьте бота и разрешите ему отвечать.
        </p>
      )}

      {connection && !connection.can_reply && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Бот подключён, но не может отвечать. В настройках Telegram Business
          разрешите боту отправлять сообщения — иначе он только слушает.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle>Подключение</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={connection?.is_enabled ? "success" : "secondary"}>
              {connection?.is_enabled ? "Активно" : "Нет"}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Вопросов клиентов</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-neutral-900">{inbound.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Понял бот</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-brand-700">{answered}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Передано вам</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-neutral-900">
            {inbound.length - answered}
          </CardContent>
        </Card>
      </div>

      <ConversationList messages={messages ?? []} />
    </div>
  );
}
