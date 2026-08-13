"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/actions/orders";

export function OrderFulfillForm({
  action,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const t = useTranslations("orders");
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="payment_method">{t("paymentMethodLabel")}</Label>
        <Select id="payment_method" name="payment_method" defaultValue="cash">
          <option value="cash">{t("paymentCash")}</option>
          <option value="card">{t("paymentCard")}</option>
          <option value="other">{t("paymentOther")}</option>
        </Select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? t("saving") : t("markPaid")}
      </Button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
