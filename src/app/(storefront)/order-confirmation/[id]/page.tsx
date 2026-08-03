import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { buttonVariants } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";

type OrderStatusItem = { product_name: string; quantity: number; unit_price: number; line_total: number };

export default async function OrderConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_order_status", { p_order_id: id });
  const order = data?.[0];

  if (!order) {
    notFound();
  }

  const items = (order.items as unknown as OrderStatusItem[]) ?? [];

  return (
    <div className="mx-auto max-w-lg space-y-6 text-center">
      <h1 className="text-2xl font-semibold text-neutral-900">Thank you, {order.customer_name}!</h1>
      <p className="text-neutral-600">
        Your order <span className="font-mono">#{order.id.slice(0, 8)}</span> has been placed and is{" "}
        <span className="font-medium">{order.status}</span>. We&apos;ll be in touch to confirm payment and delivery.
      </p>

      <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 p-4 text-left">
        {items.map((item, idx) => (
          <div key={idx} className="flex justify-between py-2 text-sm">
            <span>
              {item.product_name} × {item.quantity}
            </span>
            <span>{formatMoney(item.line_total)}</span>
          </div>
        ))}
        <div className="flex justify-between pt-3 text-base font-semibold">
          <span>Total</span>
          <span>{formatMoney(order.total)}</span>
        </div>
      </div>

      <Link href="/" className={buttonVariants()}>
        Continue shopping
      </Link>
    </div>
  );
}
