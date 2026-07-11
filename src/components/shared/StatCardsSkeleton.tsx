import { Skeleton } from "@/components/ui/skeleton";

export function StatCardsSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={className ?? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-muted/50 rounded-xl border border-border shadow-sm p-5 flex gap-4">
          <Skeleton className="h-14 w-14 shrink-0 rounded-2xl" />
          <div className="flex flex-col justify-center gap-2 flex-1">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-6 w-14" />
            <Skeleton className="h-2.5 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
