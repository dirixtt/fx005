"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCart } from "@/lib/cart-context";
import { useStore } from "@/lib/store-context";

export function CartLink() {
  const { itemCount } = useCart();
  const store = useStore();

  return (
    <Link
      href={`/s/${store.slug}/cart`}
      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-700 transition-colors hover:bg-neutral-100"
    >
      <ShoppingCart className="h-5 w-5" />
      <AnimatePresence>
        {itemCount > 0 && (
          <motion.span
            key={itemCount}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 20 }}
            className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white"
          >
            {itemCount}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}
