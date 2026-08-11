"use client";

import { motion } from "motion/react";

/** Same fade+rise entrance used across the rest of the storefront and admin. */
export function ProductReveal({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="grid grid-cols-1 gap-10 md:grid-cols-2"
    >
      {children}
    </motion.div>
  );
}
