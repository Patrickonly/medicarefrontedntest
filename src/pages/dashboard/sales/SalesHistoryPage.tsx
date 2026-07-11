import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Loader2, Search, AlertCircle, ShoppingBag, Receipt, Trash2, RefreshCcw, Download, FilterX, MoreVertical, FileSpreadsheet, File as FileIcon, Printer, Building2 } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup,
} from "@/components/ui/select";
import { formatCurrency } from "@/hooks/use-data";
import {
  format, subDays, subWeeks, subMonths,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, endOfDay,
  isSameDay, isSameWeek, isSameMonth, isWithinInterval,
} from "date-fns";
import { toast } from "sonner";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { PageTransition } from "@/components/ui/page-transition";
import { TableRowsSkeleton } from "@/components/shared/TableRowsSkeleton";

export default function SalesHistoryPage() {
  const { organizationId } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");
  const [visibleColumns, setVisibleColumns] = useState({ select: true, invoice: true, date: true, customer: true, products: true, method: true, total: true, actions: true });
  const [selectedSales, setSelectedSales] = useState<string[]>([]);

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedSaleForPayment, setSelectedSaleForPayment] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  // ── Date Filter State (same as CustomersPage) ──
  const [dateRangeFilter, setDateRangeFilter] = useState<"all"|"daily"|"weekly"|"monthly">("all");
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [selectedSingleDate, setSelectedSingleDate] = useState("");
  const [selectedFromDate, setSelectedFromDate] = useState("");
  const [selectedToDate, setSelectedToDate] = useState("");

  const today = useMemo(() => new Date(), []);

  // ── Generate Date Options ──
  const monthlyOptions = Array.from({ length: 12 }).map((_, i) => {
    const d = subMonths(today, i);
    let label = format(d, "MMMM yyyy");
    if (i === 0) label = "Current - " + label;
    return { value: startOfMonth(d).toISOString(), label };
  });

  const weeklyOptions = Array.from({ length: 15 }).map((_, i) => {
    const d = subWeeks(today, i);
    const start = startOfWeek(d, { weekStartsOn: 1 });
    const end = endOfWeek(d, { weekStartsOn: 1 });
    let label = `Week ${format(start, "w")} - ${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
    if (i === 0) label = `Current Week - ${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
    else if (i === 1) label = `Last Week - ${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
    return { value: start.toISOString(), label };
  });

  const dailyOptionsGrouped: Record<string, { value: string; label: string }[]> = {};
  for (let i = 0; i < 30; i++) {
    const d = subDays(today, i);
    const monthGroup = format(d, "MMMM yyyy");
    let label = format(d, "EEE - dd-MMMM-yyyy");
    if (i === 0) label = "Today, " + label;
    else if (i === 1) label = "Yesterday, " + label;
    if (!dailyOptionsGrouped[monthGroup]) dailyOptionsGrouped[monthGroup] = [];
    dailyOptionsGrouped[monthGroup].push({ value: d.toISOString(), label });
  }

  if (!selectedSingleDate && monthlyOptions.length > 0) {
    setSelectedSingleDate(monthlyOptions[0].value);
    setSelectedFromDate(monthlyOptions[0].value);
    setSelectedToDate(monthlyOptions[0].value);
  }

  // ── Data Fetching ──
  const endpoint = "/api/sales";

  const { data: rawSales = [], isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ["sales-history", organizationId],
    queryFn: async () => {
      const res = await api.get<{ data?: any[] } | any[]>(endpoint);
      return Array.isArray(res) ? res : (res?.data || []);
    },
    enabled: !!organizationId,
  });

  const isDataLoading = isLoading || isRefetching;

  const deleteMutation = useMutation({
    mutationFn: async (saleId: string | number) => {
      await api.delete(`/api/sales/${saleId}`);
    },
    onSuccess: () => {
      toast.success("Sale deleted", { description: "The sale has been successfully removed." });
      queryClient.invalidateQueries({ queryKey: ["sales-history"] });
    },
    onError: (err: any) => {
      toast.error("Failed to delete", { description: err?.message || "Could not delete this sale." });
    }
  });

  const deleteMultipleMutation = useMutation({
    mutationFn: async (saleIds: string[]) => {
      await Promise.all(saleIds.map(id => api.delete(`/api/sales/${id}`)));
    },
    onSuccess: () => {
      toast.success("Sales deleted", { description: "The selected sales have been successfully removed." });
      setSelectedSales([]);
      queryClient.invalidateQueries({ queryKey: ["sales-history"] });
    },
    onError: (err: any) => {
      toast.error("Bulk delete failed", { description: err?.message || "Could not delete all selected sales." });
    }
  });

  const payMutation = useMutation({
    mutationFn: async (data: { id: string; amount: number; payment_method: string }) => {
      await api.post(`/api/sales/${data.id}/pay`, { amount: data.amount, payment_method: data.payment_method });
    },
    onSuccess: () => {
      toast.success("Payment Recorded", { description: "The payment has been successfully recorded." });
      setIsPaymentDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["sales-history"] });
    },
    onError: (err: any) => {
      toast.error("Payment Failed", { description: err?.message || "Could not record the payment." });
    }
  });

  const salesList = Array.isArray(rawSales) ? rawSales : [];

  // ── Filter Logic ──
  const filteredSales = salesList.filter((sale: any) => {
    // 1. Search
    const invoiceNumber = (sale.invoiceNumber || sale.invoice_number || "").toLowerCase();
    const customerName = (sale.customer_name || sale.customerName || "Walk-in").toLowerCase();
    const matchesSearch =
      invoiceNumber.includes(searchTerm.toLowerCase()) ||
      customerName.includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;

    // 2. Date filter
    if (dateRangeFilter === "all") return true;
    const saleDate = new Date(sale.timestamp || sale.created_at || sale.date || 0);

    if (isRangeMode) {
      if (selectedFromDate && selectedToDate) {
        const start = new Date(selectedFromDate);
        let end = new Date(selectedToDate);
        if (dateRangeFilter === 'daily') end = endOfDay(end);
        else if (dateRangeFilter === 'weekly') end = endOfWeek(end, { weekStartsOn: 1 });
        else if (dateRangeFilter === 'monthly') end = endOfMonth(end);
        const intervalStart = start <= end ? start : end;
        const intervalEnd = start <= end ? end : start;
        try { return isWithinInterval(saleDate, { start: intervalStart, end: intervalEnd }); }
        catch { return true; }
      }
    } else {
      if (selectedSingleDate) {
        const targetDate = new Date(selectedSingleDate);
        if (dateRangeFilter === 'daily') return isSameDay(saleDate, targetDate);
        if (dateRangeFilter === 'weekly') return isSameWeek(saleDate, targetDate, { weekStartsOn: 1 });
        if (dateRangeFilter === 'monthly') return isSameMonth(saleDate, targetDate);
      }
    }
    return true;
  }).sort((a: any, b: any) =>
    new Date(b.timestamp || b.created_at || b.date || 0).getTime() -
    new Date(a.timestamp || a.created_at || a.date || 0).getTime()
  );

  const totalFilteredRevenue = filteredSales.reduce((sum, s) => sum + Number(s.totalAmount ?? s.total_amount ?? s.total ?? 0), 0);

  // ── Pagination ──
  const parsedPageSize = parseInt(pageSize) || 10;
  const totalPages = Math.max(1, Math.ceil(filteredSales.length / parsedPageSize));
  const paginatedSales = filteredSales.slice((currentPage - 1) * parsedPageSize, currentPage * parsedPageSize);

  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }

  // ── Bulk Selection ──
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = paginatedSales.map((s: any) => s.id?.toString()).filter(Boolean);
      setSelectedSales(allIds);
    } else {
      setSelectedSales([]);
    }
  };

  const handleSelectOne = (checked: boolean, id: string) => {
    if (checked) {
      setSelectedSales(prev => [...prev, id]);
    } else {
      setSelectedSales(prev => prev.filter(sId => sId !== id));
    }
  };

  const isAllCurrentPageSelected = useMemo(() => {
    if (paginatedSales.length === 0) return false;
    return paginatedSales.every((s: any) => selectedSales.includes(s.id?.toString()));
  }, [paginatedSales, selectedSales]);

  if (isLoading) {
    // Handled below in the table structure
  }

  if (isError) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[400px] bg-background w-full rounded-2xl">
        <div className="text-rose-500 mb-4 bg-rose-500/10 p-4 rounded-full">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-lg font-bold text-foreground">Failed to load sales</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">There was a problem retrieving the sales history.</p>
      </div>
    );
  }

  return (
    <PageTransition className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Receipt className="w-8 h-8 text-primary" />
            Sales History
          </h1>
          <p className="text-muted-foreground mt-1">
            View and track all completed sales transactions.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/dashboard/pos">
            <Button className="bg-[#0aa9ad] hover:bg-[#0aa9ad]/90 text-white font-bold h-12 px-6 rounded-xl shadow-lg shadow-[#0aa9ad]/20 transition-all">
              <Plus className="w-5 h-5 mr-2" />
              New Sale
            </Button>
          </Link>
          <div className="bg-primary/10 px-6 py-3 rounded-2xl border border-primary/20">
            <p className="text-sm font-semibold text-primary mb-1 uppercase tracking-wider">Filtered Revenue</p>
            <p className="text-2xl font-bold text-foreground">{formatCurrency(totalFilteredRevenue)}</p>
          </div>
        </div>
      </div>

      {/* ── Toolbar (copied from CustomersPage style) ── */}
      <div className="flex flex-wrap items-center gap-4 bg-card rounded-t-xl border border-b-0 border-border p-4 shadow-sm">
        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by invoice or customer..."
            className="pl-9 h-10 border-border rounded-lg text-sm bg-background/50 focus:bg-card transition-colors"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 border-l border-border pl-4">
          <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">Date Range:</span>

          <Select value={dateRangeFilter} onValueChange={(val: "all"|"daily"|"weekly"|"monthly") => {
            setDateRangeFilter(val);
            if (val !== "all") {
              const topVal = val === "daily" ? dailyOptionsGrouped[Object.keys(dailyOptionsGrouped)[0]][0].value : val === "weekly" ? weeklyOptions[0].value : monthlyOptions[0].value;
              setSelectedSingleDate(topVal);
            }
          }}>
            <SelectTrigger className="w-[110px] bg-[#5b3bf7] hover:bg-[#4a2ee0] text-white border-0 h-9 rounded-lg font-medium shadow-sm transition-colors focus:ring-0">
              <SelectValue placeholder="Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>

          {dateRangeFilter !== 'all' && (
            <div className="flex bg-muted p-0.5 rounded-lg border border-border">
              <button
                onClick={() => setIsRangeMode(false)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${!isRangeMode ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-slate-700'}`}
              >
                {dateRangeFilter === 'monthly' ? 'Monthly' : dateRangeFilter === 'weekly' ? 'Weekly' : 'Daily'}
              </button>
              <button
                onClick={() => setIsRangeMode(true)}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${isRangeMode ? (dateRangeFilter === 'monthly' ? 'bg-[#ea580c] text-white' : dateRangeFilter === 'weekly' ? 'bg-[#10b981] text-white' : 'bg-[#5b3bf7] text-white') : 'text-muted-foreground hover:text-slate-700'}`}
              >
                Range
              </button>
            </div>
          )}

          {dateRangeFilter !== 'all' && (
            isRangeMode ? (
              <div className="flex items-center gap-1.5">
                <span className={`text-xs font-bold flex items-center ${dateRangeFilter === 'monthly' ? 'text-[#ea580c]' : 'text-muted-foreground'}`}>From:</span>
                <Select value={selectedFromDate} onValueChange={setSelectedFromDate}>
                  <SelectTrigger className="w-[150px] h-9 border-border bg-card text-black font-bold rounded-md text-xs">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {dateRangeFilter === 'monthly' && monthlyOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    {dateRangeFilter === 'weekly' && weeklyOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    {dateRangeFilter === 'daily' && Object.entries(dailyOptionsGrouped).map(([month, days]) => (
                      <SelectGroup key={month}>
                        <div className="px-2 py-1.5 text-xs font-bold text-foreground">{month}</div>
                        {days.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>

                <span className="text-xs font-bold text-muted-foreground">To:</span>
                <Select value={selectedToDate} onValueChange={setSelectedToDate}>
                  <SelectTrigger className="w-[150px] h-9 border-border bg-card text-black font-bold rounded-md text-xs">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {dateRangeFilter === 'monthly' && monthlyOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    {dateRangeFilter === 'weekly' && weeklyOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    {dateRangeFilter === 'daily' && Object.entries(dailyOptionsGrouped).map(([month, days]) => (
                      <SelectGroup key={month}>
                        <div className="px-2 py-1.5 text-xs font-bold text-foreground">{month}</div>
                        {days.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <Select value={selectedSingleDate} onValueChange={setSelectedSingleDate}>
                <SelectTrigger className="w-[200px] h-9 border-border bg-card text-black font-bold rounded-md text-xs">
                  <SelectValue placeholder="Select value" />
                </SelectTrigger>
                <SelectContent>
                  {dateRangeFilter === 'monthly' && monthlyOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  {dateRangeFilter === 'weekly' && weeklyOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  {dateRangeFilter === 'daily' && Object.entries(dailyOptionsGrouped).map(([month, days]) => (
                    <SelectGroup key={month}>
                      <div className="px-2 py-1.5 text-xs font-bold text-foreground">{month}</div>
                      {days.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
            )
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center gap-2 bg-muted border border-border h-10 px-4 rounded-lg">
            <Receipt className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-bold text-slate-700">Total: {filteredSales.length}</span>
          </div>

          {selectedSales.length > 0 && (
            <Button
              variant="destructive"
              className="h-10 px-4 font-bold rounded-xl"
              disabled={deleteMultipleMutation.isPending}
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete ${selectedSales.length} sales? Stock will be restored.`)) {
                  deleteMultipleMutation.mutate(selectedSales);
                }
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Selected ({selectedSales.length})
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            disabled={isDataLoading}
            className="h-10 px-4 border-border text-slate-700 bg-card hover:bg-[#0aa9ad]/10 hover:text-[#0aa9ad] hover:border-[#0aa9ad]/30 rounded-lg font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
            onClick={() => refetch()}
          >
            <RefreshCcw className={`w-4 h-4 mr-2 ${isDataLoading ? 'animate-spin text-[#0aa9ad]' : ''}`} />
            {isDataLoading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>
      </div>

      
      {/* Toolbar 2 (Export & Actions) */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-card border border-border p-4 border-t-slate-50 shadow-sm relative z-10">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700 mr-2">Export:</span>
          <Button variant="outline" size="sm" className="h-9 px-3 border-border text-slate-700 hover:bg-muted rounded-lg font-medium transition-colors" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
          <Button variant="outline" size="sm" className="h-9 px-3 border-border text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg font-medium transition-colors">
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
          </Button>
          <Button variant="outline" size="sm" className="h-9 px-3 border-border text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg font-medium transition-colors">
            <FileIcon className="w-4 h-4 mr-2" /> CSV
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 border-border text-slate-700 rounded-lg hover:bg-muted transition-colors">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl p-2">
              <DropdownMenuItem className="rounded-md cursor-pointer font-medium text-slate-700 py-2 hover:bg-muted" onClick={() => { setSearchTerm(""); setDateRangeFilter("all"); }}><FilterX className="w-4 h-4 mr-2 text-muted-foreground" /> Reset Filters</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-card border border-border border-t-0 p-5 rounded-b-xl shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">Show entries:</span>
          <Select value={pageSize} onValueChange={(val) => { setPageSize(val); setCurrentPage(1); }}>
            <SelectTrigger className="h-8 w-[70px] text-xs rounded-lg border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10</SelectItem>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table className="min-w-[800px]">
              <TableHeader className="bg-background/50">
                <TableRow className="border-b border-border hover:bg-transparent">
                  {visibleColumns.select && <TableHead className="w-[50px] pl-4"><Checkbox disabled /></TableHead>}
                  {visibleColumns.invoice && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">INVOICE / REF</TableHead>}
                  {visibleColumns.date && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">DATE & TIME</TableHead>}
                  {visibleColumns.customer && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">CUSTOMER</TableHead>}
                  {visibleColumns.products && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">PRODUCTS</TableHead>}
                  {visibleColumns.method && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">PAYMENT METHOD</TableHead>}
                  {visibleColumns.total && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4 text-right">TOTAL AMOUNT</TableHead>}
                  {visibleColumns.actions && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider text-right w-[150px] py-4 pr-6">ACTIONS</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRowsSkeleton columns={["checkbox", "text", "text", "text", "text", "badge", "text", "actions"]} />
              </TableBody>
            </Table>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
              <ShoppingBag className="w-8 h-8 text-muted-foreground opacity-50" />
            </div>
            <h3 className="text-lg font-bold text-foreground">No sales found</h3>
            <p className="text-muted-foreground mt-2 max-w-sm mx-auto">
              {searchTerm || dateRangeFilter !== 'all'
                ? "No sales match your current filters. Try adjusting your search."
                : "No sales have been recorded yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table className="min-w-[800px]">
              <TableHeader className="bg-background/50">
                <TableRow className="border-b border-border hover:bg-transparent">
                  {visibleColumns.select && (
                    <TableHead className="w-[50px] pl-4">
                      <Checkbox
                        checked={isAllCurrentPageSelected}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all"
                      />
                    </TableHead>
                  )}
                  {visibleColumns.invoice && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">INVOICE / REF</TableHead>}
                  {visibleColumns.date && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">DATE & TIME</TableHead>}
                  {visibleColumns.customer && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">CUSTOMER</TableHead>}
                  {visibleColumns.products && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">PRODUCTS</TableHead>}
                  {visibleColumns.method && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">PAYMENT METHOD</TableHead>}
                  {visibleColumns.total && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4 text-right">TOTAL AMOUNT</TableHead>}
                  {visibleColumns.actions && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider text-right w-[150px] py-4 pr-6">ACTIONS</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSales.map((sale: any, index: number) => {
                  const rawAmount = Number(sale.totalAmount ?? sale.total_amount ?? sale.total ?? 0);
                  const displayDate = new Date(sale.timestamp || sale.created_at || sale.date || 0);
                  const saleId = sale.id?.toString();
                  const isSelected = selectedSales.includes(saleId);

                  return (
                    <TableRow key={sale.id || `sale-${index}`} className={`transition-colors ${isSelected ? "bg-primary/5" : "hover:bg-muted/30"}`}>
                      {visibleColumns.select && (
                        <TableCell className="pl-4">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectOne(checked as boolean, saleId)}
                            aria-label="Select row"
                          />
                        </TableCell>
                      )}
                      {visibleColumns.invoice && (
                        <TableCell>
                          <span className="font-bold text-primary">
                            {sale.invoiceNumber || sale.invoice_number || sale.client_ref || `#INV-${String(index+1).padStart(4, '0')}`}
                          </span>
                        </TableCell>
                      )}
                      {visibleColumns.date && (
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium text-foreground">
                              {displayDate.toLocaleDateString(undefined, { dateStyle: 'medium' })}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {displayDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </TableCell>
                      )}
                      {visibleColumns.customer && (
                        <TableCell>
                          <span className="text-sm font-medium">
                            {sale.customer_name || sale.customerName || sale.customer?.name || "Walk-in"}
                          </span>
                        </TableCell>
                      )}
                      {visibleColumns.products && (
                        <TableCell>
                          {(() => {
                            const items = Array.isArray(sale.items) ? sale.items : [];
                            if (items.length === 0) {
                              return <span className="text-xs text-muted-foreground">—</span>;
                            }
                            return (
                              <div className="flex flex-col gap-1.5 min-w-[200px]">
                                {items.map((it: any, idx: number) => {
                                  if (idx > 2) return null;
                                  const name = it.product?.name || it.productName || it.product_name || "Unknown item";
                                  const qty = it.quantity || 1;
                                  const price = Number(it.unit_price || it.price || 0);
                                  const subtotal = Number(it.subtotal || (qty * price) || 0);
                                  return (
                                    <div key={idx} className="text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 border-b border-border/40 last:border-0 pb-1.5 last:pb-0">
                                      <span className="font-semibold text-foreground truncate max-w-[150px]" title={name}>{name}</span>
                                      <span className="text-muted-foreground whitespace-nowrap">
                                        {qty} <span className="text-[10px]">x</span> {formatCurrency(price)} <span className="text-[10px]">=</span> <span className="font-bold text-[#0aa9ad]">{formatCurrency(subtotal)}</span>
                                      </span>
                                    </div>
                                  );
                                })}
                                {items.length > 3 && (
                                  <span className="text-[10px] font-bold text-muted-foreground bg-muted/80 px-2 py-1 rounded-full w-fit mt-0.5">
                                    +{items.length - 3} more items
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </TableCell>
                      )}
                      {visibleColumns.method && (
                        <TableCell>
                          {(Number(sale.remaining_balance) > 0 || (sale.paymentMethod || sale.payment_method) === "CREDIT") && Number(sale.amount_paid || 0) < Number(sale.total_amount || sale.total || 0) ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200">
                              {sale.paymentMethod || sale.payment_method || "CREDIT"} (UNPAID)
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              {sale.paymentMethod || sale.payment_method || "CASH"}
                            </span>
                          )}
                        </TableCell>
                      )}
                      {visibleColumns.total && (
                        <TableCell className="text-right">
                          <span className="font-bold text-foreground">
                            {formatCurrency(rawAmount)}
                          </span>
                        </TableCell>
                      )}
                      {visibleColumns.actions && (
                        <TableCell className="text-right pr-6">
                          <div className="flex justify-end items-center gap-2">
                            {(Number(sale.remaining_balance) > 0 || ((sale.paymentMethod || sale.payment_method) === "CREDIT" && Number(sale.amount_paid || 0) < Number(sale.total_amount || sale.total || 0))) && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs font-bold bg-[#0aa9ad]/10 text-[#0aa9ad] hover:bg-[#0aa9ad]/20 hover:text-[#07969a] border-none px-3"
                                onClick={() => {
                                  setSelectedSaleForPayment(sale);
                                  setPaymentAmount(sale.remaining_balance?.toString() || sale.total_amount?.toString() || "");
                                  setIsPaymentDialogOpen(true);
                                }}
                              >
                                Pay
                              </Button>
                            )}
                            <button
                              onClick={() => {
                                if (window.confirm("Are you sure you want to delete this sale? The quantities will be returned to stock.")) {
                                  deleteMutation.mutate(sale.id);
                                }
                              }}
                              disabled={deleteMutation.isPending}
                              className="p-1.5 rounded-full text-rose-500 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                              title="Delete Sale"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

{/* PAGINATION CONTROLS */}
      {totalPages > 1 && (
        <Pagination className="justify-end mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
            <PaginationItem>
              <div className="flex items-center px-4 text-sm font-medium">
                Page {currentPage} of {totalPages}
              </div>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Payment Modal */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <div className="py-4 space-y-4">
            <h2 className="text-xl font-bold">Record Payment</h2>
            <p className="text-sm text-muted-foreground">
              Remaining Balance: <strong className="text-rose-600 font-bold">{formatCurrency(selectedSaleForPayment?.remaining_balance || selectedSaleForPayment?.total_amount || selectedSaleForPayment?.total || 0)}</strong>
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Amount (RWF)</label>
              <Input
                type="number"
                value={paymentAmount}
                onChange={e => setPaymentAmount(e.target.value)}
                placeholder="Enter amount"
                className="h-10 border-border"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Method</label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="h-10 border-border bg-card">
                  <SelectValue placeholder="Select Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="MoMo">Mobile Money</SelectItem>
                  <SelectItem value="Bank">Bank Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" className="border-border text-muted-foreground hover:bg-muted" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-[#0aa9ad] hover:bg-[#0aa9ad]/90 text-white font-bold"
              disabled={payMutation.isPending || !paymentAmount || Number(paymentAmount) <= 0}
              onClick={() => {
                if (selectedSaleForPayment) {
                  payMutation.mutate({
                    id: selectedSaleForPayment.id,
                    amount: Number(paymentAmount),
                    payment_method: paymentMethod.toUpperCase()
                  });
                }
              }}
            >
              {payMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Confirm Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
