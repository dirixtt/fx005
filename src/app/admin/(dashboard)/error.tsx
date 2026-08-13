"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, buttonVariants } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-700">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <h1 className="text-xl font-bold tracking-tight text-neutral-900">{t("adminErrorTitle")}</h1>
      <p className="text-sm text-neutral-500">{t("adminErrorBody")}</p>
      {error.digest && <p className="font-mono text-xs text-neutral-400">{t("errorCode", { code: error.digest })}</p>}
      <div className="flex gap-2">
        <Button type="button" onClick={reset}>
          {t("refresh")}
        </Button>
        <Link href="/admin" className={buttonVariants({ variant: "outline" })}>
          {t("toDashboard")}
        </Link>
      </div>
    </div>
  );
}
