"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <h1 className="text-xl font-bold text-neutral-900">Что-то пошло не так</h1>
      <p className="text-sm text-neutral-500">
        Не удалось загрузить страницу. Попробуйте ещё раз — если не поможет, зайдите позже.
      </p>
      {error.digest && <p className="font-mono text-xs text-neutral-400">Код ошибки: {error.digest}</p>}
      <div className="flex gap-2">
        <Button type="button" onClick={reset}>
          Попробовать снова
        </Button>
        <Link href="/" className={buttonVariants({ variant: "outline" })}>
          В каталог
        </Link>
      </div>
    </div>
  );
}
