"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn, formatMoney } from "@/lib/utils";

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-neutral-900">Your cart</h1>
        <p className="text-neutral-500">Your cart is empty.</p>
        <Link href="/" className={buttonVariants()}>
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-neutral-900">Your cart</h1>

      <div className="divide-y divide-neutral-100">
        {items.map((item) => (
          <div key={item.product_id} className="flex items-center justify-between gap-4 py-4">
            <div className="flex-1">
              <p className="font-medium text-neutral-900">{item.name}</p>
              <p className="text-sm text-neutral-500">{formatMoney(item.sale_price)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
              >
                -
              </Button>
              <span className="w-6 text-center">{item.quantity}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
              >
                +
              </Button>
            </div>
            <p className="w-20 text-right font-medium">{formatMoney(item.sale_price * item.quantity)}</p>
            <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(item.product_id)}>
              Remove
            </Button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-neutral-200 pt-4 text-lg font-semibold">
        <span>Subtotal</span>
        <span>{formatMoney(subtotal)}</span>
      </div>

      <Link href="/checkout" className={cn(buttonVariants(), "w-full")}>
        Checkout
      </Link>
    </div>
  );
}
