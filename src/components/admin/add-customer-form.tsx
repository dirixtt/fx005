"use client";

import { useActionState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createCustomer } from "@/lib/actions/customers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function AddCustomerForm() {
  const t = useTranslations("customers");
  const [state, formAction, pending] = useActionState(createCustomer, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state && !state.error) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-4 sm:items-end">
      <div className="space-y-1.5">
        <Label htmlFor="full_name">{t("nameLabel")}</Label>
        <Input id="full_name" name="full_name" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">{t("phoneLabel")}</Label>
        <Input id="phone" name="phone" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">{t("emailLabel")}</Label>
        <Input id="email" name="email" type="email" />
      </div>
      <Button type="submit" disabled={pending}>
        {t("addCustomer")}
      </Button>
      {state?.error && <p className="sm:col-span-4 text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
