import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";

export default function OrdersLoading() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-6 w-40" />
      <TableSkeleton columns={5} rows={8} />
    </div>
  );
}
