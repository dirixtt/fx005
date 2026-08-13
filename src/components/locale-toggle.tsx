"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { setLocale } from "@/lib/actions/locale";
import type { AppLocale } from "@/lib/i18n/locale";
import { cn } from "@/lib/utils";

/** Shows the language you'll switch TO, mirroring the RU/UZ toggle convention. */
export function LocaleToggle({ className = "" }: { className?: string }) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations("common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const next: AppLocale = locale === "ru" ? "uz" : "ru";

  function handleClick() {
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-label={t("switchLanguage")}
      className={cn(
        "flex h-9 shrink-0 items-center justify-center rounded-full border border-divider bg-glass-bg px-3.5 text-[13px] font-semibold text-fg-primary backdrop-blur transition-colors hover:bg-glass-bg-strong disabled:opacity-60",
        className,
      )}
    >
      {next.toUpperCase()}
    </button>
  );
}
