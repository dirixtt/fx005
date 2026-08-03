"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

const accentStyles = {
  brand: "bg-brand-50 text-brand-600",
  blue: "bg-blue-50 text-blue-600",
  amber: "bg-amber-50 text-amber-600",
  neutral: "bg-neutral-100 text-neutral-500",
} as const;

export function StatCard({
  icon,
  label,
  value,
  href,
  accent = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  href?: string;
  accent?: keyof typeof accentStyles;
}) {
  const content = (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg", accentStyles[accent])}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
        <p className="truncate text-2xl font-bold text-neutral-900">{value}</p>
      </div>
    </motion.div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}
