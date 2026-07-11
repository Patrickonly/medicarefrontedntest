import { TableCell, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface TableRowsSkeletonProps {
  rows?: number;
  /** Column widths, left to right. "avatar" renders an icon-chip + text pair (for name/title columns). */
  columns?: Array<"avatar" | "text" | "badge" | "actions">;
}

export function TableRowsSkeleton({ rows = 6, columns = ["avatar", "text", "badge", "actions"] }: TableRowsSkeletonProps) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <TableRow key={rowIdx} className="border-b border-slate-50">
          {columns.map((col, colIdx) => (
            <TableCell key={colIdx} className={`py-3 ${colIdx === 0 ? "pl-4" : ""} ${colIdx === columns.length - 1 ? "pr-6" : ""}`}>
              {col === "avatar" && (
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                </div>
              )}
              {col === "text" && <Skeleton className="h-3.5 w-24" />}
              {col === "badge" && <Skeleton className="h-6 w-20 rounded-md" />}
              {col === "actions" && (
                <div className="flex items-center justify-end gap-2">
                  <Skeleton className="h-7 w-7 rounded" />
                  <Skeleton className="h-7 w-7 rounded" />
                </div>
              )}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}
