import { Skeleton } from "@/components/ui/skeleton";

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-card border border-border rounded-2xl p-5 shadow-sm ${className}`}>{children}</div>;
}

/**
 * Mirrors DashboardHome/SuperAdminOverview's real layout (header, stat cards,
 * chart rows, footer stats) so the page never flashes to a blank/white panel
 * while the first dashboard fetch is in flight.
 */
export function DashboardOverviewSkeleton() {
  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <div className="flex items-start gap-4">
              <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-6 w-14" />
                <Skeleton className="h-2.5 w-24" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-3 w-40 mb-6" />
          <Skeleton className="h-[250px] w-full rounded-xl" />
        </Card>
        <Card>
          <Skeleton className="h-4 w-36 mb-6" />
          <div className="space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Revenue and Dept Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-[250px] w-full rounded-xl" />
        </Card>
        <Card>
          <div className="flex items-center justify-between mb-6">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-12" />
          </div>
          <div className="space-y-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <Skeleton className="h-4 w-40 mb-6" />
          <div className="flex items-center justify-between h-[200px]">
            <Skeleton className="h-[180px] w-[180px] rounded-full shrink-0" />
            <div className="flex-1 pl-6 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-3 w-3 rounded-full" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-2.5 w-20 ml-5" />
                </div>
              ))}
            </div>
          </div>
        </Card>
        <Card>
          <Skeleton className="h-4 w-44 mb-6" />
          <Skeleton className="h-[200px] w-full rounded-xl" />
        </Card>
      </div>

      {/* Footer Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="flex items-center gap-4 p-4">
            <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-4 w-10" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
