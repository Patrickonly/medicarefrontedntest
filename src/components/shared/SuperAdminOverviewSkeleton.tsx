import { Skeleton } from "@/components/ui/skeleton";

export function SuperAdminOverviewSkeleton() {
  return (
    <div className="relative mx-auto min-h-full w-full space-y-6 overflow-hidden bg-background p-4 font-sans sm:p-6 lg:p-8">
      <div className="rounded-[2rem] border border-border/80 bg-card/80 p-6 shadow-[0_16px_45px_-24px_rgba(15,23,42,0.2)] backdrop-blur-xl sm:p-8">
        <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="space-y-3">
            <Skeleton className="h-6 w-40 rounded-full" />
            <Skeleton className="h-9 w-72" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-11 w-36 rounded-2xl" />
            <Skeleton className="h-11 w-40 rounded-2xl" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-[1.35rem] border border-border/70 bg-card/95 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <Skeleton className="h-12 w-12 rounded-2xl" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="mt-5 space-y-2">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col rounded-[1.8rem] border border-border/80 bg-card/85 p-7 shadow-sm lg:col-span-1">
          <div className="mb-8 space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-44" />
          </div>
          <Skeleton className="h-[300px] w-full rounded-2xl" />
        </div>

        <div className="flex flex-col overflow-hidden rounded-[1.8rem] border border-border/80 bg-card/85 shadow-sm lg:col-span-2">
          <div className="flex flex-col justify-between gap-4 border-b border-border bg-card/60 p-7 sm:flex-row sm:items-center">
            <div className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-56" />
            </div>
            <Skeleton className="h-10 w-[220px] rounded-2xl" />
          </div>
          <div className="p-7 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 shrink-0 rounded-2xl" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
                <Skeleton className="h-6 w-20 rounded-lg" />
                <Skeleton className="h-6 w-16 rounded-xl" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-[1.8rem] border border-border/80 bg-card/85 p-7 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-52" />
              </div>
              <Skeleton className="h-11 w-11 rounded-2xl" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
