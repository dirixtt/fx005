import { cn } from "@/lib/utils";

/**
 * The FX005 mark: an X whose ascending stroke breaks out into an arrow.
 *
 * Drawn with `currentColor` rather than a baked-in fill so one file serves
 * every placement — navy on the light storefront header, white on the near-black
 * admin sidebar — without shipping two assets that can drift apart.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 128 128"
      fill="none"
      role="img"
      aria-label="FX005"
      className={cn("h-full w-full", className)}
    >
      <g stroke="currentColor" strokeWidth="15" strokeLinecap="square">
        {/* ascending stroke, continuing past the crossing into the arrow */}
        <path d="M26 102 L86 42" />
        {/* descending stroke, lower right */}
        <path d="M76 76 L104 104" />
      </g>
      <path d="M108 20 L96 56 L72 32 Z" fill="currentColor" />
      {/* upper-left arm is outlined, not filled — the counterform in the original */}
      <path
        d="M22 24 H44 L70 50 L58 62 Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

/**
 * Mark plus wordmark. The type is real text rather than traced outlines so it
 * stays selectable, accessible, and crisp at any size.
 */
export function LogoLockup({
  className,
  showTagline = true,
}: {
  className?: string;
  showTagline?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="h-9 w-9 shrink-0" />
      <span className="flex flex-col leading-none">
        <span className="text-lg font-bold tracking-tight">FX005</span>
        {showTagline && (
          <span className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.2em] opacity-70">
            Checkout CRM
          </span>
        )}
      </span>
    </span>
  );
}
