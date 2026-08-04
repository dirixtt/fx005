"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { ActionState } from "@/lib/actions/orders";

export function OrderCancelForm({
  action,
}: {
  // Bound server action; the form state React threads through is unused here.
  action: () => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-1.5">
      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? "Отменяем..." : "Отменить заказ и вернуть на склад"}
      </Button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
