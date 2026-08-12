"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <h1 className="text-xl font-bold tracking-tight text-neutral-900">Не удалось загрузить раздел</h1>
      <p className="text-sm text-neutral-500">
        Возможно, база данных недоступна или истекла сессия. Попробуйте обновить — если
        не поможет, войдите заново.
      </p>
      {error.digest && <p className="font-mono text-xs text-neutral-400">Код ошибки: {error.digest}</p>}
      <div className="flex gap-2">
        <Button type="button" onClick={reset}>
          Обновить
        </Button>
        <Link href="/admin" className={buttonVariants({ variant: "outline" })}>
          На дашборд
        </Link>
      </div>
    </div>
  );
}
