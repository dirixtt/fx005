import { Skeleton } from "@/components/ui/skeleton";

export default function EditProductLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-6 w-64" />
      </div>

      <div className="max-w-2xl space-y-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-9 w-full" />
          </div>
        ))}
        <Skeleton className="h-9 w-32 rounded-lg" />
      </div>
    </div>
  );
}
