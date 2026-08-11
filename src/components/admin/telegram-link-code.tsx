"use client";

import { useActionState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { generateTelegramLinkCode, type LinkCodeState } from "@/lib/actions/telegram";
import { Button } from "@/components/ui/button";

/**
 * The seller's half of the linking flow: generate a code here, send it to the
 * bot in a plain chat, then connect the same bot in Telegram Business settings.
 * The webhook's handleLinkAttempt is the other half.
 */
export function TelegramLinkCode() {
  const [state, formAction, pending] = useActionState<LinkCodeState, FormData>(
    async () => generateTelegramLinkCode(),
    undefined,
  );

  const result = state && "code" in state ? state : null;
  const error = state && "error" in state ? state.error : null;

  return (
    <div className="space-y-4">
      <ol className="list-decimal space-y-1.5 pl-5 text-sm text-neutral-700">
        <li>Нажмите «Получить код» ниже.</li>
        <li>Откройте обычный чат с ботом в Telegram (не Business) и отправьте код.</li>
        <li>
          Затем в Telegram: Настройки → Telegram Business → Чат-боты — подключите того же бота и
          разрешите ему отвечать.
        </li>
      </ol>

      <form action={formAction}>
        <Button type="submit" disabled={pending}>
          {pending ? "Генерирую…" : "Получить код"}
        </Button>
      </form>

      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={result.code}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="rounded-lg border border-brand-200 bg-brand-50 px-4 py-3"
          >
            <p className="font-mono text-2xl font-bold tracking-widest text-brand-700">{result.code}</p>
            <p className="mt-1 text-xs text-neutral-600">
              Действует 10 минут. Отправьте этот код боту в обычном чате.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
