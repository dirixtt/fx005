import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function Pagination({
  page,
  totalPages,
  makeHref,
}: {
  page: number;
  totalPages: number;
  makeHref: (page: number) => string;
}) {
  const t = useTranslations("storefront");
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 pt-4">
      <Link
        href={makeHref(page - 1)}
        aria-disabled={page <= 1}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-600 transition-colors hover:bg-neutral-50",
          page <= 1 && "pointer-events-none opacity-40",
        )}
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>
      <span className="px-3 text-sm font-medium text-neutral-600">
        {t("pageOf", { page, total: totalPages })}
      </span>
      <Link
        href={makeHref(page + 1)}
        aria-disabled={page >= totalPages}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-300 bg-white text-neutral-600 transition-colors hover:bg-neutral-50",
          page >= totalPages && "pointer-events-none opacity-40",
        )}
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
