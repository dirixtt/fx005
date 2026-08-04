import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/table-skeleton";

export default function OrderDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-4 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))}
        </CardContent>
      </Card>

      <TableSkeleton columns={4} rows={3} />

      <div className="flex items-center justify-between border-t border-neutral-200 pt-3">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-6 w-24" />
      </div>
    </div>
  );
}
