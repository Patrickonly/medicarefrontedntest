import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, Download, Edit, Building2, MoreVertical,
  Plus, Search, Trash2, FilterX, Loader2, Clock, ShieldAlert,
  FileSpreadsheet, Printer, FileText, File as FileIcon, RefreshCcw,
  Eye,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  format, subDays, startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths,
  isSameDay, isSameWeek, isSameMonth, endOfDay, isWithinInterval
} from "date-fns";
import { TableRowsSkeleton } from "@/components/shared/TableRowsSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/shared/StatCard";
import { useAuth } from "@/hooks/useAuth";

const isActiveStatus = (status?: string) => String(status ?? "").toLowerCase() === "active" || String(status ?? "") === "";

const getInitials = (name: string) => {
  if (!name) return "NA";
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

export default function SuppliersPage() {
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { organizationId } = useAuth();
  
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");

  const [dateRangeFilter, setDateRangeFilter] = useState<"all"|"daily"|"weekly"|"monthly">("all");
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [selectedSingleDate, setSelectedSingleDate] = useState("");
  const [selectedFromDate, setSelectedFromDate] = useState("");
  const [selectedToDate, setSelectedToDate] = useState("");

  const [viewSupplierId, setViewSupplierId] = useState<string|null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<any>(null);
  const [supplierToToggleStatus, setSupplierToToggleStatus] = useState<any>(null);
  const [visibleColumns, setVisibleColumns] = useState({
    no: true, name: true, contact: true, balance: true, status: true, actions: true
  });

  const today = useMemo(() => new Date(), []);
  
  // Generating Monthly Options
  const monthlyOptions = Array.from({ length: 12 }).map((_, i) => {
    const d = subMonths(today, i);
    let label = format(d, "MMMM yyyy");
    if (i === 0) label = "Current - " + label;
    return { value: startOfMonth(d).toISOString(), label };
  });

  // Generating Weekly Options
  const weeklyOptions = Array.from({ length: 15 }).map((_, i) => {
    const d = subWeeks(today, i);
    const start = startOfWeek(d, { weekStartsOn: 1 });
    const end = endOfWeek(d, { weekStartsOn: 1 });
    let label = `Week ${format(start, "w")} - ${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
    if (i === 0) label = `Current Week - ${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
    else if (i === 1) label = `Last Week - ${format(start, "MMM d")} - ${format(end, "MMM d, yyyy")}`;
    return { value: start.toISOString(), label };
  });

  // Generating Daily Options (Grouped by Month)
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

  const { data: suppliers = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["suppliers", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/suppliers");
      const toSafeNumber = (value: unknown): number => {
        const n = Number(value);
        return Number.isFinite(n) ? n : 0;
      };
      return (res || []).map((c: any) => ({
        ...c,
        name: c.full_name || c.name, 
        outstandingBalance: toSafeNumber(c.current_balance ?? c.stats?.outstanding_balance ?? c.outstandingBalance),
        creditLimit: toSafeNumber(c.credit_limit ?? c.creditLimit),
        totalPurchases: toSafeNumber(c.stats?.total_orders),
      }));
    },
    enabled: !!organizationId,
  });

  // There is no single-supplier GET endpoint on the backend, so the "view
  // details" modal reads from the already-loaded list instead of a second
  // fetch (matching how the /api/suppliers collection route works).
  const viewSupplierData = viewSupplierId ? suppliers.find((s: any) => String(s.id) === String(viewSupplierId)) : null;
  const isLoadingViewSupplier = false;

  const isDataLoading = isLoading || isRefetching;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.del(`/api/suppliers?id=${id}`);
    },
    onSuccess: () => {
      success("Success", "Supplier deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setSupplierToDelete(null);
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to delete supplier");
      setSupplierToDelete(null);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (supplier: any) => {
      const newStatus = isActiveStatus(supplier.status) ? "INACTIVE" : "ACTIVE";
      await api.put(`/api/suppliers?id=${supplier.id}`, { status: newStatus });
    },
    onSuccess: () => {
      success("Success", "Supplier status updated");
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      setSupplierToToggleStatus(null);
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to update status");
      setSupplierToToggleStatus(null);
    },
  });

  const handleExportCSV = () => {
    if (!suppliers.length) return;
    const headers = ["Name", "Contact Person", "Phone", "Email", "Payment Terms", "Outstanding Payable", "Status"];
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + filteredSuppliers.map((c: any) => `"${c.name}","${c.phone || ''}","${c.email || ''}",${c.creditLimit},${c.outstandingBalance},${c.totalPurchases},"${c.status || 'ACTIVE'}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `suppliers_export_${format(new Date(), "yyyyMMdd")}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExportExcel = () => {
    if (!suppliers.length) return;
    const headers = ["Name", "Contact Person", "Phone", "Email", "Payment Terms", "Outstanding Payable", "Status"];
    const csvContent = "data:application/vnd.ms-excel;charset=utf-8," 
      + headers.join(",") + "\n"
      + filteredSuppliers.map((c: any) => `"${c.name}","${c.phone || ''}","${c.email || ''}",${c.creditLimit},${c.outstandingBalance},${c.totalPurchases},"${c.status || 'ACTIVE'}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `suppliers_export_${format(new Date(), "yyyyMMdd")}.xls`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const filteredSuppliers = suppliers.filter((c: any) => {
    const matchesSearch = c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          c.phone?.includes(searchTerm);
    const matchesStatus = statusFilter === "all" ? true :
                          statusFilter === "active" ? isActiveStatus(c.status) : !isActiveStatus(c.status);
                          
    let matchesDate = true;
    const dateString = c.created_at || c.createdAt;
    if (dateString && dateRangeFilter !== "all") {
      const dDate = new Date(dateString);
      if (isRangeMode) {
        if (selectedFromDate && selectedToDate) {
          const start = new Date(selectedFromDate);
          let end = new Date(selectedToDate);
          if (dateRangeFilter === 'daily') end = endOfDay(end);
          else if (dateRangeFilter === 'weekly') end = endOfWeek(end, { weekStartsOn: 1 });
          else if (dateRangeFilter === 'monthly') end = endOfMonth(end);
          
          const intervalStart = start <= end ? start : end;
          const intervalEnd = start <= end ? end : start;
          
          try {
            matchesDate = isWithinInterval(dDate, { start: intervalStart, end: intervalEnd });
          } catch (e) {
            matchesDate = true;
          }
        }
      } else {
        if (selectedSingleDate) {
          const targetDate = new Date(selectedSingleDate);
          if (dateRangeFilter === 'daily') {
            matchesDate = isSameDay(dDate, targetDate);
          } else if (dateRangeFilter === 'weekly') {
            matchesDate = isSameWeek(dDate, targetDate, { weekStartsOn: 1 });
          } else if (dateRangeFilter === 'monthly') {
            matchesDate = isSameMonth(dDate, targetDate);
          }
        }
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalPages = Math.ceil(filteredSuppliers.length / parseInt(pageSize));
  const currentData = filteredSuppliers.slice((page - 1) * parseInt(pageSize), page * parseInt(pageSize));

  const totalOutstanding = suppliers.reduce((sum: number, c: any) => sum + (c.outstandingBalance || 0), 0);
  
  return (
    <div className="min-h-screen bg-muted font-sans pb-10">
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Supplier Management</h1>
            <p className="text-muted-foreground mt-1">Manage vendors, purchase orders, and payables.</p>
          </div>
          <Button onClick={() => navigate("/dashboard/suppliers/add")} className="bg-[#0aa9ad] hover:bg-[#07969a] rounded-xl h-10 px-5 shadow-sm">
            <Plus className="w-4 h-4 mr-2" /> Add Supplier
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            icon={Building2}
            label="Total Suppliers"
            value={suppliers.length}
            colorClass="bg-[#0aa9ad] text-white"
          />
          <StatCard
            icon={FileText}
            label="Outstanding Balance"
            value={totalOutstanding}
            format="currency"
            colorClass="bg-[#ef4444] text-white"
          />
          <StatCard
            icon={CheckCircle2}
            label="Active Partnerships"
            value={suppliers.filter((s: any) => isActiveStatus(s.status)).length || suppliers.length}
            format="currency"
            colorClass="bg-[#8b5cf6] text-white"
          />
        </div>

        {/* Toolbar 1 */}
        <div className="flex flex-wrap items-center gap-4 bg-card rounded-t-xl border border-b-0 border-border p-4 shadow-sm">
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search suppliers..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 border-border rounded-lg text-sm bg-background/50 focus:bg-card transition-colors" 
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-10 border-border bg-card text-slate-700 font-medium rounded-lg hover:bg-muted">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

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

          <div className="flex items-center gap-2 bg-muted border border-border h-10 px-4 rounded-lg ml-auto">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-bold text-slate-700">Total: {filteredSuppliers.length}</span>
          </div>
        </div>

        {/* Toolbar 2 */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-card border border-border p-4 border-t-slate-50 shadow-sm relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700 mr-2">Export:</span>
            <Button variant="outline" size="sm" className="h-9 px-3 border-border text-slate-700 hover:bg-muted rounded-lg font-medium transition-colors" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
            <Button variant="outline" size="sm" className="h-9 px-3 border-border text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg font-medium transition-colors" onClick={handleExportExcel}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
            </Button>
            <Button variant="outline" size="sm" className="h-9 px-3 border-border text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg font-medium transition-colors" onClick={handleExportCSV}>
              <FileIcon className="w-4 h-4 mr-2" /> CSV
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={isDataLoading} 
              className="h-9 px-4 border-border text-slate-700 bg-card hover:bg-[#0aa9ad]/10 hover:text-[#0aa9ad] hover:border-[#0aa9ad]/30 rounded-lg font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm" 
              onClick={() => refetch()}
            >
              <RefreshCcw className={`w-4 h-4 mr-2 ${isDataLoading ? 'animate-spin text-[#0aa9ad]' : ''}`} /> 
              {isDataLoading ? "Refreshing..." : "Refresh"}
            </Button>
            <Button size="sm" className="h-9 px-4 bg-[#0aa9ad] hover:bg-[#07969a] text-white rounded-lg font-medium transition-colors" onClick={() => navigate("/dashboard/suppliers/add")}>
              <Plus className="w-4 h-4 mr-2" /> Add Supplier
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 border-border text-slate-700 rounded-lg hover:bg-muted transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl p-2">
                <DropdownMenuItem className="rounded-md cursor-pointer font-medium text-slate-700 py-2 hover:bg-muted" onClick={handleExportCSV}><Download className="w-4 h-4 mr-2 text-muted-foreground" /> Export Table</DropdownMenuItem>
                <DropdownMenuItem className="rounded-md cursor-pointer font-medium text-slate-700 py-2 hover:bg-muted" onClick={() => { setSearchTerm(""); setStatusFilter("all"); setDateRangeFilter("all"); }}><FilterX className="w-4 h-4 mr-2 text-muted-foreground" /> Reset Filters</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-card border border-border border-t-0 p-5 rounded-b-xl shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">Show entries:</span>
            <Select value={pageSize} onValueChange={(val) => { setPageSize(val); setPage(1); }}>
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

          {isDataLoading ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table className="min-w-[800px]">
                <TableHeader className="bg-background/50">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    {visibleColumns.no && <TableHead className="w-[80px] font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4 pl-4">NO.</TableHead>}
                    {visibleColumns.name && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">CUSTOMER</TableHead>}
                    {visibleColumns.contact && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">CONTACT INFO</TableHead>}
   {visibleColumns.balance && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4 text-right">OUTSTANDING PAYABLE</TableHead>}
                    {visibleColumns.status && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider w-[120px] py-4">STATUS</TableHead>}
                    {visibleColumns.actions && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider text-right w-[150px] py-4 pr-6">ACTIONS</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRowsSkeleton columns={["text", "avatar", "text", "text", "text", "text", "badge", "actions"]} />
                </TableBody>
              </Table>
            </div>
          ) : currentData.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table className="min-w-[800px]">
                <TableHeader className="bg-background/50">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    {visibleColumns.no && <TableHead className="w-[80px] font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4 pl-4">NO.</TableHead>}
                    {visibleColumns.name && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">CUSTOMER</TableHead>}
                    {visibleColumns.contact && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">CONTACT INFO</TableHead>}
   {visibleColumns.balance && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4 text-right">OUTSTANDING PAYABLE</TableHead>}
                    {visibleColumns.status && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider w-[120px] py-4">STATUS</TableHead>}
                    {visibleColumns.actions && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider text-right w-[150px] py-4 pr-6">ACTIONS</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentData.map((supplier: any, idx: number) => (
                    <TableRow key={supplier.id || idx} className="border-b border-slate-50 hover:bg-background/80 transition-colors">
                      {visibleColumns.no && <TableCell className="text-sm text-muted-foreground font-medium py-3 pl-4">{(page - 1) * parseInt(pageSize) + idx + 1}</TableCell>}
                      {visibleColumns.name && <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground shrink-0 rounded-full bg-muted/50 hover:bg-[#0aa9ad]/20 hover:text-[#0aa9ad]" onClick={() => setViewSupplierId(supplier.id)}>
                            <Plus className="w-4 h-4" />
                          </Button>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
     {supplier.name}
     <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-600 font-bold border border-slate-200">
       {supplier.supplier_type || "COMPANY"}
     </span>
   </span>
                            <span className="text-xs text-muted-foreground">Rep: {supplier.contactPerson || "N/A"}</span>
                          </div>
                        </div>
                      </TableCell>}
                      {visibleColumns.contact && <TableCell className="py-3">
    <span className="text-sm text-slate-700 font-bold block">{supplier.phone || "N/A"}</span>
    <span className="text-xs text-muted-foreground">{supplier.email || "No email"}</span>
   </TableCell>}
   {visibleColumns.balance && <TableCell className="py-3 text-right">
    <span className="text-sm font-bold text-orange-600">{(supplier.outstandingBalance || 0).toLocaleString()} <span className="text-[10px] text-muted-foreground">RWF</span></span>
   </TableCell>}
                      {visibleColumns.status && <TableCell className="py-3">
                        <div className="flex flex-col gap-1.5 items-start">
     {supplier.approval_status === "APPROVED" && <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-3 h-3"/> Approved</span>}
     {supplier.approval_status === "PENDING" && <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700"><Clock className="w-3 h-3"/> Pending</span>}
     {supplier.approval_status === "REJECTED" && <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700"><ShieldAlert className="w-3 h-3"/> Rejected</span>}
     {supplier.risk_level === "HIGH" && <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100"><ShieldAlert className="w-3 h-3"/> High Risk</span>}
   </div>
                      </TableCell>}
                      {visibleColumns.actions && <TableCell className="text-right py-3 pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="icon" className="h-7 w-7 rounded border-blue-200 text-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-colors shadow-sm" title="Edit" onClick={() => navigate(`/dashboard/suppliers/edit/${supplier.id}`)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className={`h-7 w-7 rounded shadow-sm transition-colors ${isActiveStatus(supplier.status) ? "border-amber-200 text-amber-500 hover:bg-amber-50 hover:text-amber-600" : "border-emerald-200 text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600"}`}
                            title={isActiveStatus(supplier.status) ? "Suspend" : "Activate"}
                            onClick={() => setSupplierToToggleStatus(supplier)}
                          >
                            {isActiveStatus(supplier.status) ? <ShieldAlert className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7 rounded border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm" 
                            title="Delete"
                            onClick={() => setSupplierToDelete(supplier)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-7 w-7 rounded border-emerald-200 text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors shadow-sm" title="Profile" onClick={() => navigate(`/dashboard/suppliers/${supplier.id}/profile`)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-background/50 rounded-xl border border-dashed border-border mt-2 mb-4 mx-2">
              <div className="bg-card w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-sm border border-border">
                <Building2 className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">No suppliers found</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md text-center">We couldn't find any suppliers matching your current search or filter criteria.</p>
              <Button className="bg-[#0aa9ad] hover:bg-[#07969a] text-white shadow-sm px-6 h-10" onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
                setDateRangeFilter("all");
              }}>
                <FilterX className="w-4 h-4 mr-2" /> Clear All Filters
              </Button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between mt-5 gap-4">
            <div className="text-sm text-muted-foreground font-medium">
              Showing {(page - 1) * parseInt(pageSize) + (currentData.length > 0 ? 1 : 0)} to {(page - 1) * parseInt(pageSize) + currentData.length} of {filteredSuppliers.length} entries
            </div>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                className="text-muted-foreground text-sm font-medium px-3 hover:text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              
              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                const pageNum = i + 1;
                return (
                  <Button 
                    key={pageNum}
                    variant={page === pageNum ? "default" : "ghost"}
                    className={`w-8 h-8 p-0 rounded-md font-medium transition-colors ${
                      page === pageNum 
                        ? "bg-[#0aa9ad] text-white shadow-sm" 
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
              
              <Button 
                variant="ghost" 
                className="text-muted-foreground text-sm font-medium px-3 hover:bg-muted transition-colors disabled:opacity-50"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        {/* View Details Modal */}
        <Dialog open={!!viewSupplierId} onOpenChange={(open) => !open && setViewSupplierId(null)}>
          <DialogContent className="sm:max-w-[600px] bg-card border border-border">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-6 h-6 text-[#0aa9ad]" /> Additional Details
              </DialogTitle>
              <DialogDescription>
                Extended supplier details not shown in the primary data table.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-background/50 rounded-xl border border-border p-6 shadow-inner mt-2 min-h-[250px] flex items-center justify-center">
              {isLoadingViewSupplier ? (
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Skeleton className="h-3.5 w-20" />
                      <Skeleton className="h-3.5 w-28" />
                    </div>
                  ))}
                </div>
              ) : viewSupplierData ? (
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-8 max-h-[60vh] overflow-y-auto pr-2 text-base">
                  {Object.entries(viewSupplierData).map(([key, value]) => {
                    const excludedFields = ['id', 'name', 'phone', 'status', 'metadata', 'updatedAt', 'updated_at', 'deletedAt', 'deleted_at', 'organization_id', 'is_deleted'];
                    if (typeof value === 'object' && value !== null) return null; 
                    if (excludedFields.includes(key)) return null; 
                    
                    const formattedKey = key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, c => c.toUpperCase());
                    let displayValue = value === null || value === '' ? 'N/A' : String(value);

                    if (displayValue === 'true') displayValue = 'Yes';
                    if (displayValue === 'false') displayValue = 'No';
                    if (displayValue.includes('T') && displayValue.endsWith('Z')) {
                      try { displayValue = format(new Date(displayValue), "MMM d, yyyy h:mm a"); } catch { /* not a valid date, keep raw value */ }
                    }

                    return (
                      <div key={key} className="break-words py-1.5">
                        <span className="font-bold text-foreground">{formattedKey}:</span> <span className="text-slate-700">{displayValue}</span>
                      </div>
                    );
                  })}
                  {viewSupplierData.metadata && Object.entries(viewSupplierData.metadata).map(([key, value]) => {
                    if (typeof value === 'object') return null;
                    const formattedKey = key.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, c => c.toUpperCase());
                    return (
                      <div key={"meta_"+key} className="break-words py-1.5">
                        <span className="font-bold text-foreground">{formattedKey}:</span> <span className="text-slate-700">{String(value)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground">Failed to load details.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!supplierToDelete} onOpenChange={(open) => !open && setSupplierToDelete(null)}>
          <AlertDialogContent className="rounded-2xl max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-black text-foreground">Delete Supplier</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground font-medium mt-2">
                Are you absolutely sure you want to permanently delete{" "}
                <span className="font-bold text-foreground">
                  {supplierToDelete?.name}
                </span>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6 gap-3 sm:gap-0">
              <AlertDialogCancel className="rounded-xl border-border font-bold h-11 hover:bg-muted">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={(e) => { e.preventDefault(); if (supplierToDelete?.id) deleteMutation.mutate(supplierToDelete.id); }} className="bg-red-600 hover:bg-red-700 rounded-xl font-bold h-11" disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                {deleteMutation.isPending ? "Deleting..." : "Delete Supplier"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!supplierToToggleStatus} onOpenChange={(open) => !open && setSupplierToToggleStatus(null)}>
          <AlertDialogContent className="rounded-2xl max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-black text-foreground">
                {supplierToToggleStatus && isActiveStatus(supplierToToggleStatus.status) ? "Suspend Supplier" : "Activate Supplier"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground font-medium mt-2">
                Are you sure you want to {supplierToToggleStatus && isActiveStatus(supplierToToggleStatus.status) ? "suspend" : "activate"}{" "}
                <span className="font-bold text-foreground">
                  {supplierToToggleStatus?.name}
                </span>?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6 gap-3 sm:gap-0">
              <AlertDialogCancel className="rounded-xl border-border font-bold h-11 hover:bg-muted">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={(e) => { e.preventDefault(); if (supplierToToggleStatus) toggleStatusMutation.mutate(supplierToToggleStatus); }} className={`${supplierToToggleStatus && isActiveStatus(supplierToToggleStatus.status) ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-500 hover:bg-emerald-600"} text-white rounded-xl font-bold h-11`} disabled={toggleStatusMutation.isPending}>
                {toggleStatusMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : supplierToToggleStatus && isActiveStatus(supplierToToggleStatus.status) ? <ShieldAlert className="mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                {toggleStatusMutation.isPending ? "Updating..." : "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}