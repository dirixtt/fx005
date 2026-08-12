"use client";

import { useActionState } from "react";
import { updateShopInfo, type ActionState } from "@/lib/actions/assistant-settings";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Tables } from "@/lib/types/database.types";

export function ShopInfoForm({ info }: { info: Pick<Tables<"shop_info">, "payment_text" | "hours_text"> }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(updateShopInfo, undefined);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="payment_text">Оплата</Label>
        <Textarea
          id="payment_text"
          name="payment_text"
          defaultValue={info.payment_text ?? ""}
          rows={2}
          placeholder="Например: оплата картой или наличными при получении."
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="hours_text">Часы работы</Label>
        <Textarea
          id="hours_text"
          name="hours_text"
          defaultValue={info.hours_text ?? ""}
          rows={2}
          placeholder="Например: отвечаем с 9:00 до 21:00 каждый день."
        />
      </div>
      <p className="text-xs text-neutral-500">
        Бот отправляет этот текст клиенту дословно — пусто здесь означает, что бот промолчит на вопрос
        об оплате или часах и передаст его вам.
      </p>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          Сохранить
        </Button>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      </div>
    </form>
  );
}
