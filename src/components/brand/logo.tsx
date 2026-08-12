import { cn } from "@/lib/utils";

/**
 * The Javob mark: a rounded gradient badge with a small accent dot at its
 * corner, matching the Javob Glass UI design. The dot's border uses --bg-app
 * (not a fixed white) so it cuts cleanly against either theme's background.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Javob"
      className={cn("relative inline-block shrink-0", className)}
      style={{ background: "var(--accent-orange-grad)", borderRadius: "29%" }}
    >
      <span
        className="absolute rounded-full border-2"
        style={{
          right: "-12%",
          bottom: "-12%",
          width: "40%",
          height: "40%",
          background: "var(--accent-blue)",
          borderColor: "var(--bg-app)",
        }}
      />
    </span>
  );
}

/**
 * Mark plus wordmark. The type is real text rather than traced outlines so it
 * stays selectable, accessible, and crisp at any size.
 */
export function LogoLockup({
  className,
  showTagline = false,
}: {
  className?: string;
  showTagline?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="h-9 w-9 shrink-0" />
      <span className="flex flex-col leading-none">
        <span className="text-lg font-bold tracking-tight">Javob</span>
        {showTagline && (
          <span className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.2em] opacity-70">
            Telegram-ассистент
          </span>
        )}
      </span>
    </span>
  );
}
