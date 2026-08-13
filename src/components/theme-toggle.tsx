"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const t = useTranslations("common");
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? t("switchToLight") : t("switchToDark")}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-divider bg-glass-bg backdrop-blur transition-colors hover:bg-glass-bg-strong",
        className,
      )}
    >
      {isDark ? (
        <span className="h-3.5 w-3.5 rounded-full border-2 border-fg-primary" />
      ) : (
        <span className="h-3.5 w-3.5 rounded-full bg-fg-primary" />
      )}
    </button>
  );
}
