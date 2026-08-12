"use client";

import { useTheme } from "@/components/theme-provider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Светлый режим" : "Тёмный режим"}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-divider bg-glass-bg backdrop-blur transition-colors hover:bg-glass-bg-strong ${className}`}
    >
      {isDark ? (
        <span className="h-3.5 w-3.5 rounded-full border-2 border-fg-primary" />
      ) : (
        <span className="h-3.5 w-3.5 rounded-full bg-fg-primary" />
      )}
    </button>
  );
}
