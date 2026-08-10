"use client";

import { useActionState } from "react";
import { updateAssistantSettings, type ActionState } from "@/lib/actions/assistant-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/lib/types/database.types";

type Settings = Tables<"assistant_settings">;

const CAPABILITIES: Array<{ name: keyof Settings; label: string; hint: string }> = [
  { name: "can_answer_availability", label: "Наличие и размеры", hint: "«42 bormi», «есть чёрный?»" },
  { name: "can_answer_price", label: "Цена", hint: "«сколько стоит», «narxi qancha»" },
  { name: "can_answer_order_status", label: "Статус заказа", hint: "«где мой заказ»" },
  { name: "can_answer_shop_info", label: "Доставка/оплата/часы", hint: "требует заполненных данных ниже" },
  {
    name: "can_match_photos",
    label: "Поиск по фото",
    hint: "фото без подписи — самая ненадёжная функция, включайте последней",
  },
  { name: "can_place_orders", label: "Оформление заказа", hint: "списывает остаток и создаёт заявку — включайте, только когда доверяете ответам выше" },
];

export function AssistantSettingsForm({ settings }: { settings: Settings }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateAssistantSettings, undefined);

  return (
    <form action={formAction} className="space-y-5">
      <label className="flex items-center gap-3 rounded-lg border border-neutral-200 p-3">
        <input type="checkbox" name="enabled" defaultChecked={settings.enabled} className="h-4 w-4" />
        <span>
          <span className="block text-sm font-medium text-neutral-900">Ассистент включён</span>
          <span className="block text-xs text-neutral-500">
            Выключено — бот не отвечает никому и не тратит запросы к ИИ, вы отвечаете сами как раньше.
          </span>
        </span>
      </label>

      <div className="space-y-2">
        <p className="text-sm font-medium text-neutral-700">Что отвечает сам</p>
        {CAPABILITIES.map((cap) => (
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
          <Label htmlFor="reminder_minutes">Напомнить через, мин</Label>
          <Input
            id="reminder_minutes"
            name="reminder_minutes"
            type="number"
            min={1}
            defaultValue={settings.reminder_minutes}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="language_mode">Язык ответов</Label>
          <Select id="language_mode" name="language_mode" defaultValue={settings.language_mode}>
            <option value="auto">Автоматически (по языку клиента)</option>
            <option value="ru">Всегда русский</option>
            <option value="uz">Всегда узбекский</option>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="signature">Подпись (добавляется в конец каждого ответа)</Label>
        <Textarea id="signature" name="signature" defaultValue={settings.signature ?? ""} rows={2} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="extra_instructions">Доп. инструкции для распознавания</Label>
        <Textarea
          id="extra_instructions"
          name="extra_instructions"
          defaultValue={settings.extra_instructions ?? ""}
          rows={3}
          placeholder="Например: клиенты называют кроссовки словом «кеды». Артикулы у нас четырёхзначные."
        />
        <p className="text-xs text-neutral-500">
          Влияет только на то, что бот понимает — не на то, что он говорит. Цену и наличие он всегда
          берёт из базы, это правило это поле изменить не может.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          Сохранить
        </Button>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      </div>
    </form>
  );
}
