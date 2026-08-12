"use client";

import { motion } from "motion/react";

/**
 * A replayed, not live, exchange — the same slide-in-from-sender-side language
 * as the admin conversation transcript (src/components/admin/conversation-list.tsx),
 * reused here because it's the one motion idiom on this site that's actually
 * about a real product behaviour: this is what a customer's screen looks like.
 */
const EXCHANGE = [
  { from: "customer", text: "Bomber 42 bormi?" },
  { from: "bot", text: "Есть, Бомбер чёрный, 42 — 450 000 сум." },
  { from: "customer", text: "Оформите" },
  { from: "bot", text: "Отлично! Напишите имя и телефон — оформлю заказ." },
] as const;

export function ChatDemo() {
  return (
    <div className="mx-auto max-w-sm space-y-2 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
      {EXCHANGE.map((message, i) => {
        const fromCustomer = message.from === "customer";
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: fromCustomer ? -8 : 8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.25, delay: i * 0.15, ease: "easeOut" }}
            className={fromCustomer ? "flex justify-start" : "flex justify-end"}
          >
            <div
              className={
                fromCustomer
                  ? "max-w-[80%] rounded-2xl rounded-bl-sm bg-neutral-100 px-3 py-2 text-sm text-neutral-900"
                  : "max-w-[80%] rounded-2xl rounded-br-sm bg-brand-600 px-3 py-2 text-sm text-white"
              }
            >
              {message.text}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
