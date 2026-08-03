"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/actions/orders";

export function OrderFulfillForm({
  action,
}: {
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <form action={formAction} className="flex items-end gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="payment_method">Payment method received</Label>
        <Select id="payment_method" name="payment_method" defaultValue="cash">
          <option value="cash">Cash</option>
          <option value="card">Card</option>
          <option value="other">Other</option>
        </Select>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Mark paid & fulfilled"}
      </Button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
