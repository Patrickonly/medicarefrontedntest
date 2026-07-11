import React, { useEffect, useState } from "react";
import { Search, Download, FileText, FileSpreadsheet, FileSpreadsheetIcon, Loader2, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataPagination } from "./DataPagination";
import { exportToCSV, exportToExcel, exportToPDF } from "@/lib/exportUtils";
import { TableSkeleton } from "./DataStates";

export interface BulkActionOption {
  /** Value sent as `status` for a STATUS bulk action, or omitted for DELETE. */
  status?: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: "default" | "destructive";
  /** Confirmation copy shown before running - required for destructive actions. */
  confirmMessage?: string;
}

interface AdvancedDataTableProps<T> {
  title: string;
  description?: string;
  data: T[];
  exportColumns: { key: keyof T; label: string }[];
  exportFilename?: string;
  renderTable: (paginatedData: T[], selection?: RowSelection) => React.ReactNode;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  searchPlaceholder?: string;
  pageSize?: number;
  /** Shows a "Show entries" page-size selector when true. Defaults to false for backward compatibility. */
  allowPageSizeChange?: boolean;
  isLoading?: boolean;
  /**
   * Enables the checkbox column + bulk-actions toolbar. `getRowId` must
   * return a stable id per row of the *full* `data` array (not just the
   * paginated slice) so selection survives pagination/search.
   */
  getRowId?: (row: T) => string;
  bulkActions?: BulkActionOption[];
  onBulkAction?: (action: BulkActionOption, ids: string[]) => Promise<void> | void;
}

export interface RowSelection {
  selectedIds: Set<string>;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  toggleAll: (ids: string[]) => void;
}

export function AdvancedDataTable<T extends Record<string, any>>({
  title,
  description,
  data,
  exportColumns,
  exportFilename = "export",
  renderTable,
  searchTerm,
  onSearchChange,
  searchPlaceholder = "Search...",
  pageSize: pageSizeProp = 10,
  allowPageSizeChange = false,
  isLoading = false,
  getRowId,
  bulkActions,
  onBulkAction,
}: AdvancedDataTableProps<T>) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(pageSizeProp);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmingAction, setConfirmingAction] = useState<BulkActionOption | null>(null);
  const [isRunningBulkAction, setIsRunningBulkAction] = useState(false);

  const bulkSelectionEnabled = !!getRowId && !!bulkActions?.length && !!onBulkAction;

  // Selection is keyed by id, so it naturally survives pagination; just drop
  // ids that no longer exist in `data` (e.g. after a search narrows results
  // or a row gets deleted elsewhere) so the toolbar count stays accurate.
  useEffect(() => {
    if (!bulkSelectionEnabled) return;
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const validIds = new Set(data.map((row) => getRowId!(row)));
      const next = new Set([...prev].filter((id) => validIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [data, bulkSelectionEnabled, getRowId]);

  const rowSelection: RowSelection | undefined = bulkSelectionEnabled
    ? {
        selectedIds,
        isSelected: (id) => selectedIds.has(id),
        toggle: (id) =>
          setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
          }),
        toggleAll: (ids) =>
          setSelectedIds((prev) => {
            const allSelected = ids.length > 0 && ids.every((id) => prev.has(id));
            return allSelected ? new Set() : new Set(ids);
          }),
      }
    : undefined;

  const handleExportCSV = () => {
    exportToCSV(data, exportFilename, exportColumns);
  };

  const handleExportPDF = () => {
    exportToPDF(data, exportFilename, title, exportColumns);
  };

  const handleExportExcel = () => {
    exportToExcel(data, exportFilename, exportColumns);
  };

  const runBulkAction = async (action: BulkActionOption) => {
    if (!onBulkAction) return;
    setIsRunningBulkAction(true);
    try {
      await onBulkAction(action, [...selectedIds]);
      setSelectedIds(new Set());
    } finally {
      setIsRunningBulkAction(false);
      setConfirmingAction(null);
    }
  };

  const handleBulkActionClick = (action: BulkActionOption) => {
    if (action.confirmMessage) {
      setConfirmingAction(action);
    } else {
      runBulkAction(action);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // Pagination logic
  const totalPages = Math.ceil(data.length / pageSize);
  
  // Ensure page is within bounds when data changes
  const validPage = Math.max(1, Math.min(page, totalPages || 1));
  if (validPage !== page) {
    setPage(validPage);
  }

  const paginatedData = data.slice((validPage - 1) * pageSize, validPage * pageSize);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden flex flex-col w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 border-b border-border bg-background/50">
        <div>
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {onSearchChange && (
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={searchPlaceholder}
                value={searchTerm || ""}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  setPage(1); // Reset to first page on search
                }}
                className="pl-9 rounded-xl border-border bg-card focus-visible:ring-[#0aa9ad] w-full shadow-sm"
              />
            </div>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full sm:w-auto rounded-xl border-border bg-card hover:bg-muted shadow-sm text-slate-700 font-bold transition-colors">
                <Download className="mr-2 h-4 w-4" /> Export Data
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl p-2 z-[100]">
              <DropdownMenuItem onClick={handleExportPDF} className="rounded-lg cursor-pointer font-bold text-slate-700 p-2">
                <FileText className="mr-2 h-4 w-4 text-rose-500" /> PDF Document
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportExcel} className="rounded-lg cursor-pointer font-bold text-slate-700 p-2">
                <FileSpreadsheetIcon className="mr-2 h-4 w-4 text-blue-600" /> Excel Spreadsheet
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCSV} className="rounded-lg cursor-pointer font-bold text-slate-700 p-2">
                <FileSpreadsheet className="mr-2 h-4 w-4 text-emerald-500" /> CSV Spreadsheet
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {bulkSelectionEnabled && selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-[#eefbfb] px-5 py-3">
          <div className="flex items-center gap-2 text-sm font-bold text-[#07969a]">
            <span>{selectedIds.size} selected</span>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="rounded-full p-1 text-[#07969a]/70 hover:bg-card/60 hover:text-[#07969a]"
              aria-label="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {bulkActions!.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  size="sm"
                  variant={action.variant === "destructive" ? "outline" : "outline"}
                  className={`rounded-lg font-bold ${
                    action.variant === "destructive"
                      ? "border-red-200 text-red-600 hover:bg-red-50 bg-card"
                      : "border-border bg-card hover:bg-muted"
                  }`}
                  onClick={() => handleBulkActionClick(action)}
                  disabled={isRunningBulkAction}
                >
                  {isRunningBulkAction && confirmingAction === null ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : Icon ? (
                    <Icon className="mr-1.5 h-3.5 w-3.5" />
                  ) : null}
                  {action.label}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {allowPageSizeChange && (
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border bg-background/50">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Show entries:</span>
          <Select value={String(pageSize)} onValueChange={(val) => { setPageSize(Number(val)); setPage(1); }}>
            <SelectTrigger className="h-8 w-[70px] text-xs rounded-lg border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((size) => (
                <SelectItem key={size} value={String(size)}>{size}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="flex-1 w-full overflow-x-auto">
        {isLoading ? (
           <TableSkeleton rows={8} />
        ) : (
           renderTable(paginatedData, rowSelection)
        )}
      </div>

      {confirmingAction && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl">
            <h3 className="text-lg font-bold text-foreground">Confirm action</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {confirmingAction.confirmMessage} ({selectedIds.size} item{selectedIds.size === 1 ? "" : "s"})
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => setConfirmingAction(null)}
                disabled={isRunningBulkAction}
              >
                Cancel
              </Button>
              <Button
                className={`rounded-xl ${
                  confirmingAction.variant === "destructive"
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-[#0aa9ad] hover:bg-[#07969a] text-white"
                }`}
                onClick={() => runBulkAction(confirmingAction)}
                disabled={isRunningBulkAction}
              >
                {isRunningBulkAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      {!isLoading && data.length > 0 && (
        <DataPagination
          page={validPage}
          totalPages={totalPages}
          total={data.length}
          pageSize={pageSize}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
