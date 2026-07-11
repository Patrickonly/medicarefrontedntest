import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DataPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  /** When provided, renders a "Show entries" page-size selector. */
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
}

export function DataPagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}: DataPaginationProps) {
  if (totalPages <= 1 && !onPageSizeChange) return null;

  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-3 border-t border-border bg-secondary/20">
      <div className="flex items-center gap-4">
        <p className="text-xs text-muted-foreground">
          Showing <span className="font-medium text-foreground">{start}–{end}</span> of{" "}
          <span className="font-medium text-foreground">{total}</span> results
        </p>
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground whitespace-nowrap">Show entries:</span>
            <Select value={String(pageSize)} onValueChange={(val) => onPageSizeChange(Number(val))}>
              <SelectTrigger className="h-8 w-[70px] text-xs rounded-lg border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
      {totalPages > 1 && (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft size={16} />
        </Button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
          let pageNum: number;
          if (totalPages <= 5) {
            pageNum = i + 1;
          } else if (page <= 3) {
            pageNum = i + 1;
          } else if (page >= totalPages - 2) {
            pageNum = totalPages - 4 + i;
          } else {
            pageNum = page - 2 + i;
          }
          return (
            <Button
              key={pageNum}
              variant={pageNum === page ? "default" : "ghost"}
              size="icon"
              className={`h-8 w-8 text-xs ${pageNum === page ? "bg-primary text-primary-foreground" : ""}`}
              onClick={() => onPageChange(pageNum)}
            >
              {pageNum}
            </Button>
          );
        })}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          <ChevronRight size={16} />
        </Button>
      </div>
      )}
    </div>
  );
}
