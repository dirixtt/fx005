"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { createClient } from "@/lib/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/utils";

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (items.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold text-neutral-900">Checkout</h1>
        <p className="text-neutral-500">Your cart is empty.</p>
        <Link href="/" className={buttonVariants()}>
          Continue shopping
        </Link>
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const { data, error } = await supabase.rpc("checkout_order", {
      p_items: items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
      p_customer_name: name,
      p_customer_phone: phone,
      p_customer_email: email || undefined,
      p_shipping_address: address || undefined,
    });

    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    clear();
    router.push(`/order-confirmation/${data}`);
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
      <div>
        <h1 className="mb-4 text-2xl font-semibold text-neutral-900">Checkout</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" required value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email (optional)</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Shipping address (optional)</Label>
            <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Placing order..." : `Place order · ${formatMoney(subtotal)}`}
          </Button>
          <p className="text-xs text-neutral-500">
            Payment is collected on pickup/delivery — we&apos;ll contact you to confirm.
          </p>
        </form>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium text-neutral-700">Order summary</h2>
        <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 p-4">
          {items.map((item) => (
            <div key={item.product_id} className="flex justify-between py-2 text-sm">
              <span>
                {item.name} × {item.quantity}
              </span>
              <span>{formatMoney(item.sale_price * item.quantity)}</span>
            </div>
          ))}
          <div className="flex justify-between pt-3 text-base font-semibold">
            <span>Total</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
