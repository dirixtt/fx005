import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";

export default function CustomersLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-32" />

      <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <Skeleton className="h-9 w-full max-w-sm" />
      </div>

      <TableSkeleton columns={3} rows={8} />
    </div>
  );
}
