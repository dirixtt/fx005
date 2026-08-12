"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const accentStyles = {
  brand: "bg-tint-orange text-accent-orange",
  blue: "bg-tint-blue text-accent-blue",
  amber: "bg-tint-orange text-accent-orange",
  neutral: "bg-tint-neutral text-fg-tertiary",
} as const;

export function StatCard({
  icon,
  label,
  value,
  href,
  accent = "neutral",
  index = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  href?: string;
  accent?: keyof typeof accentStyles;
  /** Position in a row of stat cards — turns simultaneous entrances into a stagger. */
  index?: number;
}) {
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 6) * 0.06, ease: "easeOut" }}
      className="flex items-center gap-3.5 rounded-[18px] border border-glass-border bg-glass-bg p-5 shadow-[0_6px_22px_var(--shadow-color)] backdrop-blur-xl transition-shadow hover:shadow-[0_10px_28px_var(--shadow-color)]"
    >
      <div className={cn("flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl", accentStyles[accent])}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.04em] text-fg-tertiary">{label}</p>
        <p className="truncate text-[26px] font-bold text-fg-primary">{value}</p>
      </div>
    </motion.div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
