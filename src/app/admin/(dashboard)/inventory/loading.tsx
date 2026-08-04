import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";

export default function InventoryLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-9 w-40 rounded-lg" />
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <Skeleton className="h-9 w-full max-w-sm" />
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </div>

      <Skeleton className="h-9 w-full max-w-md" />

      <TableSkeleton columns={9} rows={8} />
    </div>
  );
}
