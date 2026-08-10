"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "motion/react";
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
        <h1 className="text-2xl font-bold text-neutral-900">Оформление заказа</h1>
        <p className="text-neutral-500">Корзина пуста.</p>
        <Link href="/" className={buttonVariants()}>
          В каталог
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
    <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
      <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
        <h1 className="mb-5 text-2xl font-bold tracking-tight text-neutral-900">Оформление заказа</h1>
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div className="space-y-1.5">
            <Label htmlFor="name">Имя и фамилия</Label>
            <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Телефон</Label>
            <Input id="phone" required value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email (необязательно)</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="address">Адрес доставки (необязательно)</Label>
            <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? "Оформляем..." : `Оформить заказ · ${formatMoney(subtotal)}`}
          </Button>
          <p className="text-xs text-neutral-500">
            Оплата при получении/доставке — мы свяжемся с вами для подтверждения.
          </p>
        </form>
      </motion.div>

      <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500">Ваш заказ</h2>
        <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          {items.map((item) => (
            <div key={item.product_id} className="flex justify-between py-2 text-sm">
              <span>
                {item.name} × {item.quantity}
              </span>
              <span className="font-medium">{formatMoney(item.sale_price * item.quantity)}</span>
            </div>
          ))}
          <div className="flex justify-between pt-3 text-base font-bold text-neutral-900">
            <span>Итого</span>
            <span>{formatMoney(subtotal)}</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
