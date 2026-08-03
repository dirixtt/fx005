"use client";

import { useActionState, useRef, useEffect } from "react";
import { createCategory } from "@/lib/actions/categories";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AddCategoryForm() {
  const [state, formAction, pending] = useActionState(createCategory, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state?.error) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-wrap items-end gap-2">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-neutral-700" htmlFor="category-name">
          Новая категория
        </label>
        <Input id="category-name" name="name" placeholder="например, Отвёртки" className="w-48" />
      </div>
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        Добавить
      </Button>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
