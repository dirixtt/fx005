"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button, buttonVariants } from "@/components/ui/button";

export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("storefront");
  const params = useParams<{ store: string }>();

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <h1 className="text-xl font-bold text-neutral-900">{t("errorTitle")}</h1>
      <p className="text-sm text-neutral-500">{t("errorBody")}</p>
      {error.digest && <p className="font-mono text-xs text-neutral-400">{t("errorCode", { code: error.digest })}</p>}
      <div className="flex gap-2">
        <Button type="button" onClick={reset}>
          {t("tryAgain")}
        </Button>
        <Link href={`/s/${params.store}`} className={buttonVariants({ variant: "outline" })}>
          {t("toCatalog")}
        </Link>
      </div>
    </div>
  );
}
