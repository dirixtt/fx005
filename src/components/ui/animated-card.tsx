"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * Same entrance as StatCard — fade + slight rise, staggered by position — for
 * server-rendered pages that lay out a row of Cards instead of StatCards. Kept
 * as a thin wrapper rather than duplicated inline per page, so a row of cards
 * always animates the same way wherever it appears.
 */
export function AnimatedCard({
  index = 0,
  className,
  children,
}: {
  index?: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 6) * 0.06, ease: "easeOut" }}
      className={cn("rounded-xl border border-neutral-200 bg-white shadow-sm", className)}
    >
      {children}
    </motion.div>
  );
}
