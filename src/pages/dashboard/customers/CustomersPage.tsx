import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  AlertCircle, CalendarIcon, CheckCircle2, ChevronDown, Download, Edit, Building2, MoreHorizontal, MoreVertical,
  Plus, Search, Store, Trash2, FilterX, Building, Loader2, Tags, Settings, Phone, Mail, Clock, ShieldAlert,
  UserCheck, UserX, UserPlus, FileSpreadsheet, LayoutGrid, Server,
  Printer, FileText, File as FileIcon, RefreshCcw, ChevronLeft, ChevronRight,
  Upload, Eye, UserSquare2, BellRing, CreditCard
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
import { PageTransition } from "@/components/ui/page-transition";
import { useAuth } from "@/hooks/useAuth";

const isActiveStatus = (status?: string) => String(status ?? "").toLowerCase() === "active" || String(status ?? "") === "";

const getInitials = (name: string) => {
  if (!name) return "NA";
  return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
};

export default function CustomersPage() {
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

  const [viewCustomerId, setViewCustomerId] = useState<string|null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<any>(null);
  const [customerToToggleStatus, setCustomerToToggleStatus] = useState<any>(null);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [visibleColumns, setVisibleColumns] = useState({
    no: true, checkbox: true, name: true, phone: true, creditLimit: true, balance: true, available: true, status: true, actions: true
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

  const { data: customers = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["customers", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/customers");
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
        overdueCount: toSafeNumber(c.stats?.overdue_sales_count),
        overdueAmount: toSafeNumber(c.stats?.overdue_amount),
      }));
    },
    enabled: !!organizationId,
  });

  const [isRemindAllOpen, setIsRemindAllOpen] = useState(false);
  const [remindAllResult, setRemindAllResult] = useState<any>(null);
  const [reminderPreview, setReminderPreview] = useState<any>(null);

  const remindMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const res = await api.post<{ success: boolean; message: string; data: any }>(`/api/customers/${customerId}/remind`, {});
      return res;
    },
    onSuccess: (res) => {
      success("Reminder Sent", res.message || "Reminder sent to customer.");
      setReminderPreview(null);
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to send reminder.");
    },
  });

  const remindAllMutation = useMutation({
    mutationFn: async (params: { onlyOverdue: boolean; customerIds?: string[] }) => {
      const payload: any = {};
      if (params.onlyOverdue) payload.only_overdue = true;
      if (params.customerIds && params.customerIds.length > 0) payload.customer_ids = params.customerIds;
      const res = await api.post<{ success: boolean; data: any }>("/api/customers/remind", payload);
      return res.data;
    },
    onSuccess: (data) => {
      setRemindAllResult(data);
      success("Reminders Sent", `${data.reminded} of ${data.total_with_balance} customer${data.total_with_balance === 1 ? "" : "s"} reminded.`);
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to send bulk reminders.");
    },
  });

  const { data: viewCustomerData, isLoading: isLoadingViewCustomer } = useQuery({
    queryKey: ["customer", viewCustomerId],
    queryFn: async () => {
      if (!viewCustomerId) return null;
      const res = await api.get<any>(`/api/customers/${viewCustomerId}`);
      return res.data || res;
    },
    enabled: !!viewCustomerId,
  });

  const isDataLoading = isLoading || isRefetching;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.del(`/api/customers/${id}`);
    },
    onSuccess: () => {
      success("Success", "Customer deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setCustomerToDelete(null);
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to delete customer");
      setCustomerToDelete(null);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (customer: any) => {
      const newStatus = isActiveStatus(customer.status) ? "INACTIVE" : "ACTIVE";
      await api.put(`/api/customers/${customer.id}`, { status: newStatus });
    },
    onSuccess: () => {
      success("Success", "Customer status updated");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setCustomerToToggleStatus(null);
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to update status");
      setCustomerToToggleStatus(null);
    },
  });

  const handleExportCSV = () => {
    if (!customers.length) return;
    const headers = ["Name", "Phone", "Email", "Credit Limit", "Outstanding Balance", "Total Purchases", "Status"];
    const csvContent = "data:text/csv;charset=utf-8," 
      + headers.join(",") + "\n"
      + filteredCustomers.map((c: any) => `"${c.name}","${c.phone || ''}","${c.email || ''}",${c.creditLimit},${c.outstandingBalance},${c.totalPurchases},"${c.status || 'ACTIVE'}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `customers_export_${format(new Date(), "yyyyMMdd")}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExportExcel = () => {
    if (!customers.length) return;
    const headers = ["Name", "Phone", "Email", "Credit Limit", "Outstanding Balance", "Total Purchases", "Status"];
    const csvContent = "data:application/vnd.ms-excel;charset=utf-8," 
      + headers.join(",") + "\n"
      + filteredCustomers.map((c: any) => `"${c.name}","${c.phone || ''}","${c.email || ''}",${c.creditLimit},${c.outstandingBalance},${c.totalPurchases},"${c.status || 'ACTIVE'}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `customers_export_${format(new Date(), "yyyyMMdd")}.xls`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const filteredCustomers = customers.filter((c: any) => {
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

  const totalPages = Math.ceil(filteredCustomers.length / parseInt(pageSize));
  const currentData = filteredCustomers.slice((page - 1) * parseInt(pageSize), page * parseInt(pageSize));

  const totalOutstanding = customers.reduce((sum: number, c: any) => sum + (c.outstandingBalance || 0), 0);
  const totalCreditLimit = customers.reduce((sum: number, c: any) => sum + (c.creditLimit || 0), 0);

  return (
    <PageTransition className="min-h-screen bg-muted font-sans pb-10">
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Customers</h1>
            <p className="text-muted-foreground mt-1">Manage your customers, view detailed profiles, and handle credit.</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate("/dashboard/agrovet/credit")} variant="outline" className="h-10 px-4 rounded-xl border-border bg-card hover:bg-muted text-foreground shadow-sm">
              <CreditCard className="mr-2 h-4 w-4" /> Manage Credits
            </Button>
            <Button onClick={() => navigate("/dashboard/customers/add")} className="bg-[#0aa9ad] hover:bg-[#07969a] rounded-xl h-10 px-5 shadow-sm">
              <Plus className="mr-2 h-4 w-4" /> Add Customer
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            icon={UserSquare2}
            label="Total Customers"
            value={customers.length}
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
            icon={UserCheck}
            label="Active Credit Limit"
            value={totalCreditLimit}
            format="currency"
            colorClass="bg-[#8b5cf6] text-white"
          />
        </div>

        {/* Toolbar 1 */}
        <div className="flex flex-wrap items-center gap-4 bg-card rounded-t-xl border border-b-0 border-border p-4 shadow-sm">
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search customers..." 
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
            <span className="text-sm font-bold text-slate-700">Total: {filteredCustomers.length}</span>
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
            <Button size="sm" className="h-9 px-4 bg-[#0aa9ad] hover:bg-[#07969a] text-white rounded-lg font-medium transition-colors" onClick={() => navigate("/dashboard/customers/add")}>
              <Plus className="w-4 h-4 mr-2" /> Add Customer
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-9 px-4 border-amber-300 text-amber-700 hover:bg-amber-50 rounded-lg font-medium transition-colors"
              disabled={remindAllMutation.isPending}
              onClick={() => { setRemindAllResult(null); setIsRemindAllOpen(true); }}
            >
              {remindAllMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BellRing className="w-4 h-4 mr-2" />}
              Remind Debtors
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
                    {visibleColumns.checkbox && (
                      <TableHead className="w-[40px] px-4 py-4">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-300 text-[#0aa9ad] focus:ring-[#0aa9ad]"
                          checked={currentData.length > 0 && selectedCustomerIds.length === currentData.length}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedCustomerIds(currentData.map((c: any) => c.id));
                            else setSelectedCustomerIds([]);
                          }}
                        />
                      </TableHead>
                    )}
                    {visibleColumns.no && <TableHead className="w-[80px] font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4 pl-4">NO.</TableHead>}
                    {visibleColumns.name && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">CUSTOMER</TableHead>}
                    {visibleColumns.phone && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">PHONE</TableHead>}
                    {visibleColumns.creditLimit && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4 text-right">CREDIT LIMIT</TableHead>}
                    {visibleColumns.balance && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4 text-right">USED (BALANCE)</TableHead>}
                    {visibleColumns.available && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4 text-right">REMAINING</TableHead>}
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
                    {visibleColumns.checkbox && (
                      <TableHead className="w-[40px] px-4 py-4">
                        <input 
                          type="checkbox" 
                          className="w-4 h-4 rounded border-slate-300 text-[#0aa9ad] focus:ring-[#0aa9ad]"
                          checked={currentData.length > 0 && currentData.every((c: any) => selectedCustomerIds.includes(c.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              const newIds = new Set([...selectedCustomerIds, ...currentData.map((c: any) => c.id)]);
                              setSelectedCustomerIds(Array.from(newIds));
                            } else {
                              const currentIds = currentData.map((c: any) => c.id);
                              setSelectedCustomerIds(selectedCustomerIds.filter(id => !currentIds.includes(id)));
                            }
                          }}
                        />
                      </TableHead>
                    )}
                    {visibleColumns.no && <TableHead className="w-[80px] font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4 pl-4">NO.</TableHead>}
                    {visibleColumns.name && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">CUSTOMER</TableHead>}
                    {visibleColumns.phone && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">PHONE</TableHead>}
                    {visibleColumns.creditLimit && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4 text-right">CREDIT LIMIT</TableHead>}
                    {visibleColumns.balance && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4 text-right">USED (BALANCE)</TableHead>}
                    {visibleColumns.available && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4 text-right">REMAINING</TableHead>}
                    {visibleColumns.status && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider w-[120px] py-4">STATUS</TableHead>}
                    {visibleColumns.actions && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider text-right w-[150px] py-4 pr-6">ACTIONS</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentData.map((customer: any, idx: number) => (
                    <TableRow key={customer.id || idx} className="border-b border-slate-50 hover:bg-background/80 transition-colors">
                      {visibleColumns.checkbox && (
                        <TableCell className="px-4 py-3">
                          <input 
                            type="checkbox" 
                            className="w-4 h-4 rounded border-slate-300 text-[#0aa9ad] focus:ring-[#0aa9ad]"
                            checked={selectedCustomerIds.includes(customer.id)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedCustomerIds([...selectedCustomerIds, customer.id]);
                              else setSelectedCustomerIds(selectedCustomerIds.filter(id => id !== customer.id));
                            }}
                          />
                        </TableCell>
                      )}
                      {visibleColumns.no && <TableCell className="text-sm text-muted-foreground font-medium py-3 pl-4">{(page - 1) * parseInt(pageSize) + idx + 1}</TableCell>}
                      {visibleColumns.name && <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground shrink-0 rounded-full bg-muted/50 hover:bg-[#0aa9ad]/20 hover:text-[#0aa9ad]" onClick={() => setViewCustomerId(customer.id)}>
                            <Plus className="w-4 h-4" />
                          </Button>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-700">{customer.name}</span>
                            <span className="text-xs text-muted-foreground">{customer.email || "No email"}</span>
                          </div>
                        </div>
                      </TableCell>}
                      {visibleColumns.phone && <TableCell className="py-3">
                        <span className="text-sm text-muted-foreground font-medium">{customer.phone || "N/A"}</span>
                      </TableCell>}
                      {visibleColumns.creditLimit && <TableCell className="py-3 text-right">
                        <span className="text-sm font-medium text-slate-700">{(customer.creditLimit || 0).toLocaleString()} <span className="text-[10px] text-muted-foreground">RWF</span></span>
                      </TableCell>}
                      {visibleColumns.balance && <TableCell className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-sm font-bold text-orange-600">{(customer.outstandingBalance || 0).toLocaleString()} <span className="text-[10px] text-muted-foreground">RWF</span></span>
                          {customer.overdueCount > 0 && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-red-100 text-red-700 uppercase tracking-wide" title={`${customer.overdueCount} overdue sale${customer.overdueCount === 1 ? "" : "s"}`}>
                              Overdue
                            </span>
                          )}
                        </div>
                      </TableCell>}
                      {visibleColumns.available && <TableCell className="py-3 text-right">
                        <span className="text-sm font-bold text-emerald-600">{Math.max(0, (customer.creditLimit || 0) - (customer.outstandingBalance || 0)).toLocaleString()} <span className="text-[10px] text-muted-foreground">RWF</span></span>
                      </TableCell>}
                      {visibleColumns.status && <TableCell className="py-3">
                        {isActiveStatus(customer.status) ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#ecfdf5] text-[#10b981] uppercase tracking-wide">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-muted text-muted-foreground uppercase tracking-wide">
                            Inactive
                          </span>
                        )}
                      </TableCell>}
                      {visibleColumns.actions && <TableCell className="text-right py-3 pr-6">
                        <div className="flex items-center justify-end gap-2">
                          {customer.outstandingBalance > 0 && (
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 rounded border-amber-200 text-amber-600 hover:bg-amber-50 hover:text-amber-700 transition-colors shadow-sm"
                              title="Remind to Pay"
                              onClick={() => setReminderPreview(customer)}
                            >
                              <BellRing className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 px-2 rounded border-[#0aa9ad]/30 text-[#0aa9ad] hover:bg-[#0aa9ad]/10 hover:text-[#07969a] transition-colors shadow-sm font-medium text-xs flex items-center gap-1" 
                            title="View Credits & Profile" 
                            onClick={() => navigate(`/dashboard/customers/${customer.id}/profile`)}
                          >
                            <CreditCard className="h-3 w-3" /> Credits
                          </Button>
                          <Button variant="outline" size="icon" className="h-7 w-7 rounded border-blue-200 text-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-colors shadow-sm" title="Edit" onClick={() => navigate(`/dashboard/customers/edit/${customer.id}`)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className={`h-7 w-7 rounded shadow-sm transition-colors ${isActiveStatus(customer.status) ? "border-amber-200 text-amber-500 hover:bg-amber-50 hover:text-amber-600" : "border-emerald-200 text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600"}`}
                            title={isActiveStatus(customer.status) ? "Suspend" : "Activate"}
                            onClick={() => setCustomerToToggleStatus(customer)}
                          >
                            {isActiveStatus(customer.status) ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7 rounded border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm" 
                            title="Delete"
                            onClick={() => setCustomerToDelete(customer)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-7 w-7 rounded border-emerald-200 text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors shadow-sm" title="Profile" onClick={() => navigate(`/dashboard/customers/${customer.id}/profile`)}>
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
                <UserSquare2 className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">No customers found</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md text-center">We couldn't find any customers matching your current search or filter criteria.</p>
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
              Showing {(page - 1) * parseInt(pageSize) + (currentData.length > 0 ? 1 : 0)} to {(page - 1) * parseInt(pageSize) + currentData.length} of {filteredCustomers.length} entries
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
        <Dialog open={!!viewCustomerId} onOpenChange={(open) => !open && setViewCustomerId(null)}>
          <DialogContent className="sm:max-w-[600px] bg-card border border-border">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
                <UserSquare2 className="w-6 h-6 text-[#0aa9ad]" /> Additional Details
              </DialogTitle>
              <DialogDescription>
                Extended customer details not shown in the primary data table.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-background/50 rounded-xl border border-border p-6 shadow-inner mt-2 min-h-[250px] flex items-center justify-center">
              {isLoadingViewCustomer ? (
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Skeleton className="h-3.5 w-20" />
                      <Skeleton className="h-3.5 w-28" />
                    </div>
                  ))}
                </div>
              ) : viewCustomerData ? (
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-8 max-h-[60vh] overflow-y-auto pr-2 text-base">
                  {Object.entries(viewCustomerData).map(([key, value]) => {
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
                  {viewCustomerData.metadata && Object.entries(viewCustomerData.metadata).map(([key, value]) => {
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

        {/* Remind All Debtors Dialog */}
        <Dialog open={isRemindAllOpen} onOpenChange={(open) => { setIsRemindAllOpen(open); if (!open) setRemindAllResult(null); }}>
          <DialogContent className="sm:max-w-[500px] bg-card border border-border">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                <BellRing className="w-5 h-5 text-amber-600" /> Remind Debtors
              </DialogTitle>
              <DialogDescription>
                Sends an SMS/email reminder to every customer with an outstanding balance.
              </DialogDescription>
            </DialogHeader>

            {!remindAllResult ? (
              <div className="py-4 flex flex-col gap-3">
                {selectedCustomerIds.length > 0 && (
                  <Button
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                    disabled={remindAllMutation.isPending}
                    onClick={() => remindAllMutation.mutate({ onlyOverdue: false, customerIds: selectedCustomerIds })}
                  >
                    {remindAllMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                    Remind Selected Customers ({selectedCustomerIds.length})
                  </Button>
                )}
                <Button
                  className="w-full h-11 bg-[#0aa9ad] hover:bg-[#07969a] text-white rounded-xl font-bold"
                  disabled={remindAllMutation.isPending}
                  onClick={() => remindAllMutation.mutate({ onlyOverdue: false })}
                >
                  {remindAllMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Remind All With a Balance
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-11 border-amber-300 text-amber-700 hover:bg-amber-50 rounded-xl font-bold"
                  disabled={remindAllMutation.isPending}
                  onClick={() => remindAllMutation.mutate({ onlyOverdue: true })}
                >
                  {remindAllMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Remind Only Overdue Customers
                </Button>
              </div>
            ) : (
              <div className="py-2 space-y-3">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-muted rounded-xl p-3">
                    <p className="text-2xl font-black text-foreground">{remindAllResult.total_with_balance}</p>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">With Balance</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3">
                    <p className="text-2xl font-black text-emerald-700">{remindAllResult.reminded}</p>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Reminded</p>
                  </div>
                  <div className="bg-muted rounded-xl p-3">
                    <p className="text-2xl font-black text-muted-foreground">{remindAllResult.skipped}</p>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Skipped</p>
                  </div>
                </div>
                {Array.isArray(remindAllResult.results) && remindAllResult.results.length > 0 && (
                  <div className="max-h-[280px] overflow-y-auto rounded-xl border border-border divide-y divide-border">
                    {remindAllResult.results.map((r: any, i: number) => (
                      <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                        <span className="font-medium text-foreground">{r.name || r.customer_name || `Customer #${r.id ?? i + 1}`}</span>
                        <span className={`text-[11px] font-bold uppercase tracking-wide ${r.status === "sent" ? "text-emerald-600" : "text-muted-foreground"}`}>
                          {r.status === "sent" ? "Sent" : (r.reason || "Skipped")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="ghost" onClick={() => { setIsRemindAllOpen(false); setRemindAllResult(null); }}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!customerToDelete} onOpenChange={(open) => !open && setCustomerToDelete(null)}>
          <AlertDialogContent className="rounded-2xl max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-black text-foreground">Delete Customer</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground font-medium mt-2">
                Are you absolutely sure you want to permanently delete{" "}
                <span className="font-bold text-foreground">
                  {customerToDelete?.name}
                </span>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6 gap-3 sm:gap-0">
              <AlertDialogCancel className="rounded-xl border-border font-bold h-11 hover:bg-muted">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={(e) => { e.preventDefault(); if (customerToDelete?.id) deleteMutation.mutate(customerToDelete.id); }} className="bg-red-600 hover:bg-red-700 rounded-xl font-bold h-11" disabled={deleteMutation.isPending}>
                {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                {deleteMutation.isPending ? "Deleting..." : "Delete Customer"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!customerToToggleStatus} onOpenChange={(open) => !open && setCustomerToToggleStatus(null)}>
          <AlertDialogContent className="rounded-2xl max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-black text-foreground">
                {customerToToggleStatus && isActiveStatus(customerToToggleStatus.status) ? "Suspend Customer" : "Activate Customer"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground font-medium mt-2">
                Are you sure you want to {customerToToggleStatus && isActiveStatus(customerToToggleStatus.status) ? "suspend" : "activate"}{" "}
                <span className="font-bold text-foreground">
                  {customerToToggleStatus?.name}
                </span>?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6 gap-3 sm:gap-0">
              <AlertDialogCancel className="rounded-xl border-border font-bold h-11 hover:bg-muted">Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={(e) => { e.preventDefault(); if (customerToToggleStatus) toggleStatusMutation.mutate(customerToToggleStatus); }} className={`${customerToToggleStatus && isActiveStatus(customerToToggleStatus.status) ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-500 hover:bg-emerald-600"} text-white rounded-xl font-bold h-11`} disabled={toggleStatusMutation.isPending}>
                {toggleStatusMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : customerToToggleStatus && isActiveStatus(customerToToggleStatus.status) ? <UserX className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />}
                {toggleStatusMutation.isPending ? "Updating..." : "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
      {/* Reminder Preview Modal */}
      <Dialog open={!!reminderPreview} onOpenChange={(open) => !open && setReminderPreview(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BellRing className="w-5 h-5 text-amber-500" />
              Preview Reminder
            </DialogTitle>
            <DialogDescription>
              Review the message before sending it to the customer.
            </DialogDescription>
          </DialogHeader>
          {reminderPreview && (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 leading-relaxed">
                Dear {reminderPreview.name}, this is a friendly reminder from our shop: your outstanding balance is {reminderPreview.outstandingBalance.toLocaleString()} RWF. Please visit us or contact us to arrange payment. Thank you.
              </div>
              {!reminderPreview.phone && !reminderPreview.email && (
                <div className="p-3 bg-red-50 text-red-700 rounded text-sm flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>This customer has no phone number or email address on file. The reminder cannot be sent.</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={() => setReminderPreview(null)}>Cancel</Button>
            <Button
              className="bg-[#0aa9ad] hover:bg-[#07969a] text-white"
              disabled={!reminderPreview || (!reminderPreview.phone && !reminderPreview.email) || remindMutation.isPending}
              onClick={() => remindMutation.mutate(reminderPreview.id)}
            >
              {remindMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BellRing className="w-4 h-4 mr-2" />}
              {reminderPreview?.phone ? `Send SMS to ${reminderPreview.phone}` : reminderPreview?.email ? `Send Email to ${reminderPreview.email}` : "Send Reminder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}