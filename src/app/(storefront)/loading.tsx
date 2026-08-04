import { Skeleton } from "@/components/ui/skeleton";

export default function StorefrontLoading() {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-2xl bg-ink-950 px-6 py-8 sm:px-10 sm:py-12">
        <Skeleton className="h-3 w-40 bg-white/10" />
        <Skeleton className="mt-3 h-7 w-64 bg-white/10 sm:h-8" />
        <Skeleton className="mt-3 h-4 w-52 bg-white/10" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
            <Skeleton className="aspect-square w-full rounded-none" />
            <div className="space-y-2 p-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
