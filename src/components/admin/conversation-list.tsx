"use client";

import { motion } from "motion/react";
import { Badge } from "@/components/ui/badge";

/**
 * Messages grouped by chat, newest conversation first.
 *
 * Rendered as a transcript rather than a table on purpose: the seller's question
 * is "did the bot say something sensible here?", and that is only answerable by
 * reading the exchange in order.
 */

export type ConversationMessage = {
  id: string;
  chat_id: number;
  direction: string;
  text: string | null;
  intent: string | null;
  created_at: string;
};

const INTENT_LABELS: Record<string, string> = {
  check_availability: "наличие",
  ask_price: "цена",
  place_order: "заказ",
  other: "передано вам",
};

const time = (value: string) =>
  new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export function ConversationList({ messages }: { messages: ConversationMessage[] }) {
  if (messages.length === 0) {
    return (
      <p className="rounded-xl border border-neutral-200 py-12 text-center text-sm text-neutral-500">
        Сообщений пока нет. Напишите продавцу со второго аккаунта — сообщение появится здесь.
      </p>
    );
  }

  // The query already returns newest-first, so the first appearance of a chat id
  // fixes that conversation's position in the list.
  const order: number[] = [];
  const byChat = new Map<number, ConversationMessage[]>();
  for (const message of messages) {
    if (!byChat.has(message.chat_id)) {
      byChat.set(message.chat_id, []);
      order.push(message.chat_id);
    }
    byChat.get(message.chat_id)!.push(message);
  }

  return (
    <div className="space-y-4">
      {order.map((chatId, chatIndex) => {
        // Reversed back to reading order within a conversation.
        const thread = [...(byChat.get(chatId) ?? [])].reverse();
        const waiting = thread[thread.length - 1]?.direction === "in";

        return (
          <motion.div
            key={chatId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            // Capped so a long list still finishes settling in well under a
            // second — frequency of use argues for subtle here, not a show.
            transition={{ duration: 0.3, delay: Math.min(chatIndex, 8) * 0.035, ease: "easeOut" }}
            className="rounded-xl border border-neutral-200 p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="font-mono text-xs text-neutral-500">#{chatId}</span>
              {waiting && (
                <motion.span
                  animate={{ opacity: [1, 0.55, 1] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Badge variant="warning">Ждёт ответа</Badge>
                </motion.span>
              )}
            </div>

            <div className="space-y-2">
              {thread.map((message, messageIndex) => {
                const fromCustomer = message.direction === "in";
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, x: fromCustomer ? -8 : 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      duration: 0.22,
                      delay: Math.min(messageIndex, 6) * 0.02,
                      ease: "easeOut",
                    }}
                    className={fromCustomer ? "flex flex-col items-start" : "flex flex-col items-end"}
                  >
                    <div
                      className={
                        fromCustomer
                          ? "max-w-[85%] rounded-2xl rounded-bl-sm bg-neutral-100 px-3 py-2 text-sm whitespace-pre-wrap text-neutral-900"
                          : "max-w-[85%] rounded-2xl rounded-br-sm bg-brand-600 px-3 py-2 text-sm whitespace-pre-wrap text-white"
                      }
                    >
                      {message.text ?? <span className="opacity-60">без текста</span>}
                    </div>
                    <span className="mt-0.5 text-[11px] text-neutral-400">
                      {time(message.created_at)}
                      {message.intent && ` · ${INTENT_LABELS[message.intent] ?? message.intent}`}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
