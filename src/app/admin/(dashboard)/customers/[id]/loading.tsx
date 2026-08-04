import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/table-skeleton";

export default function CustomerDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-56" />
      </div>

      <Card>
        <CardContent className="flex gap-8 pt-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-10" />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        <Skeleton className="h-3 w-32" />
        <TableSkeleton columns={4} rows={5} />
      </div>
    </div>
  );
}
