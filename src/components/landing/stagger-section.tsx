"use client";

import { motion } from "motion/react";

/**
 * The one stagger curve used across the whole app (admin StatCard, landing
 * beats alike): fade + rise, capped delay so a long list still settles well
 * under a second. Reused here rather than re-invented per surface.
 */
export function StaggerItem({ index, children, className }: { index: number; children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.35, delay: Math.min(index, 6) * 0.08, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
