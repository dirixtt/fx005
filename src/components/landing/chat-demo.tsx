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
  { from: "bot", text: "Есть, бомбер чёрный, 42 — 450 000 сум." },
  { from: "customer", text: "Оформите" },
  { from: "bot", text: "Отлично! Имя и телефон — и оформлю заказ." },
] as const;

export function ChatDemo() {
  return (
    <div className="mx-auto max-w-sm space-y-2.5 rounded-[26px] border border-glass-border bg-glass-bg-strong p-5 shadow-[0_24px_60px_var(--shadow-color)] backdrop-blur-xl">
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
                  ? "max-w-[80%] rounded-2xl rounded-bl-sm bg-tint-neutral px-3.5 py-2.5 text-sm text-fg-primary"
                  : "max-w-[80%] rounded-2xl rounded-br-sm px-3.5 py-2.5 text-sm text-white"
              }
              style={fromCustomer ? undefined : { background: "var(--accent-orange-grad)" }}
            >
              {message.text}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
