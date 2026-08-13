"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useCart } from "@/lib/cart-context";
import { useStore } from "@/lib/store-context";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn, formatMoney } from "@/lib/utils";
import type { AppLocale } from "@/lib/i18n/locale";

export default function CartPage() {
  const t = useTranslations("cart");
  const locale = useLocale() as AppLocale;
  const { items, updateQuantity, removeItem, subtotal } = useCart();
  const store = useStore();
  const base = `/s/${store.slug}`;

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-neutral-400">
          <ShoppingBag className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-semibold text-neutral-900">{t("emptyTitle")}</h1>
        <p className="text-neutral-500">{t("emptyBody")}</p>
        <Link href={base} className={buttonVariants()}>
          {t("toCatalog")}
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
      <div className="space-y-3 md:col-span-2">
        <h1 className="text-2xl font-bold text-neutral-900">{t("title")}</h1>

        <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white shadow-sm">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <motion.div
                key={item.product_id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-wrap items-center gap-4 overflow-hidden p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-neutral-900">{item.name}</p>
                  <p className="text-sm text-neutral-500">{formatMoney(item.sale_price, locale)}</p>
                </div>
                <div className="flex items-center gap-1.5 rounded-lg border border-neutral-200 p-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <p className="w-24 text-right font-semibold text-neutral-900">
                  {formatMoney(item.sale_price * item.quantity, locale)}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-neutral-400 hover:text-red-600"
                  onClick={() => removeItem(item.product_id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      <div className="h-fit space-y-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between text-lg font-semibold text-neutral-900">
          <span>{t("total")}</span>
          <span>{formatMoney(subtotal, locale)}</span>
        </div>
        <Link href={`${base}/checkout`} className={cn(buttonVariants({ size: "lg" }), "w-full")}>
          {t("checkout")}
        </Link>
        <Link href={base} className="block text-center text-sm text-neutral-500 hover:text-brand-700">
          {t("continueShopping")}
        </Link>
      </div>
    </div>
  );
}
