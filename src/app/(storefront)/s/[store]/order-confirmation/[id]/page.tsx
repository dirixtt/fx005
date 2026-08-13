import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { resolveStore } from "@/lib/stores/resolve-store";
import { buttonVariants } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";
import type { AppLocale } from "@/lib/i18n/locale";

type OrderStatusItem = { product_name: string; quantity: number; unit_price: number; line_total: number };

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ store: string; id: string }>;
}) {
  const t = await getTranslations("checkout");
  const locale = (await getLocale()) as AppLocale;
  const { store: storeSlug, id } = await params;
  const store = await resolveStore(storeSlug);
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_order_status", { p_store_id: store.id, p_order_id: id });
  const order = data?.[0];

  if (!order) {
    notFound();
  }

  const items = (order.items as unknown as OrderStatusItem[]) ?? [];

  return (
    <div className="mx-auto max-w-lg space-y-6 py-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-600">
        <CheckCircle2 className="h-9 w-9" />
      </div>
      <h1 className="text-2xl font-bold text-neutral-900">{t("thankYou", { name: order.customer_name })}</h1>
      <p className="text-neutral-600">
        {t.rich("confirmationBody", {
          orderIdShort: order.id.slice(0, 8),
          statusLabel: order.status === "pending" ? t("statusPending") : order.status,
          id: (chunks) => <span className="font-mono">{chunks}</span>,
          status: (chunks) => <span className="font-medium">{chunks}</span>,
        })}
      </p>

      <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white p-5 text-left shadow-sm">
        {items.map((item, idx) => (
          <div key={idx} className="flex justify-between py-2 text-sm">
            <span>
              {item.product_name} × {item.quantity}
            </span>
            <span className="font-medium">{formatMoney(item.line_total, locale)}</span>
          </div>
        ))}
        <div className="flex justify-between pt-3 text-base font-bold text-neutral-900">
          <span>{t("total")}</span>
          <span>{formatMoney(order.total, locale)}</span>
        </div>
      </div>

      <Link href={`/s/${store.slug}`} className={buttonVariants({ size: "lg" })}>
        {t("continueShopping")}
      </Link>
    </div>
  );
}
