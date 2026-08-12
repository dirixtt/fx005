"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/ui/button";
import { cn, formatMoney } from "@/lib/utils";
import { defaultVariant, variantLabel, type VariantLike } from "@/lib/variants";

type Product = { id: string; name: string; slug: string; image_url: string | null };

/**
 * Size picker plus the buy button.
 *
 * They are one component because the price shown must always be the price of the
 * size actually selected — splitting them invites a layout where the heading
 * still advertises the cheapest size after the shopper picked a dearer one.
 */
export function AddToCartButton({
  product,
  variants,
}: {
  product: Product;
  variants: VariantLike[];
}) {
  const { addItem } = useCart();
  const [selectedId, setSelectedId] = useState(() => defaultVariant(variants)?.id ?? null);
  const [added, setAdded] = useState(false);

  const selected = variants.find((v) => v.id === selectedId) ?? null;

  // A single unnamed variant is what every product backfilled from the old
  // catalogue looks like. Showing a picker with one blank chip would be noise.
  const hasChoices = variants.length > 1 || variants.some((v) => v.size || v.color);

  return (
    <div className="space-y-4">
      {hasChoices && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-neutral-700">Размер</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((variant) => {
              const soldOut = variant.stock_quantity <= 0;
              return (
                <button
                  key={variant.id}
                  type="button"
                  disabled={soldOut}
                  onClick={() => setSelectedId(variant.id)}
                  aria-pressed={variant.id === selectedId}
                  className={cn(
                    "min-h-11 min-w-11 rounded-lg border px-3 py-1.5 text-sm font-medium",
                    // Feedback lands on pointer-down, not on release: waiting for
                    // the click to acknowledge a tap is what makes a UI feel dead.
                    "transition-[transform,background-color,border-color] duration-100 ease-out",
                    "active:scale-[0.96] disabled:active:scale-100",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2",
                    variant.id === selectedId
                      ? "border-brand-600 bg-brand-50 text-brand-700"
                      : "border-neutral-300 text-neutral-700 hover:border-brand-300",
                    // Sold-out sizes stay visible rather than disappearing, so the
                    // shopper can see the size exists and is simply gone.
                    soldOut && "cursor-not-allowed border-neutral-200 text-neutral-300 line-through",
                  )}
                >
                  {variantLabel(variant)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {selected ? (
        <div className="space-y-2">
          {/* Keyed on the variant so the figure cross-fades when a size is picked:
              the price is the answer to that tap, and swapping it silently makes
              the two look unrelated. MotionConfig drops this under reduced motion. */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={selected.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="text-3xl font-bold tracking-tight text-brand-700"
            >
              {formatMoney(selected.sale_price)}
            </motion.p>
          </AnimatePresence>
          <p className="text-sm text-neutral-500">В наличии: {selected.stock_quantity} шт.</p>
          <Button
            type="button"
            size="lg"
            className="w-full sm:w-auto"
            onClick={() => {
              addItem({
                variant_id: selected.id,
                product_id: product.id,
                name: product.name,
                slug: product.slug,
                variant_label: variantLabel(selected),
                sale_price: selected.sale_price,
                image_url: product.image_url,
              });
              setAdded(true);
              setTimeout(() => setAdded(false), 1500);
            }}
          >
            {added ? (
              <>
                <Check className="h-4 w-4" /> Добавлено
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" /> В корзину
              </>
            )}
          </Button>
        </div>
      ) : (
        <p className="inline-block rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
          Нет в наличии
        </p>
      )}
    </div>
  );
}
