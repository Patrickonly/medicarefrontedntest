import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarIcon, CheckCircle2, ChevronDown, Download, Edit, Building2, MoreHorizontal, MoreVertical,
  Plus, Search, Store, Trash2, FilterX, Building, Loader2, Tags, Settings, Phone, Mail, Clock, ShieldAlert,
  UserCheck, UserX, UserPlus, FileSpreadsheet, LayoutGrid, Server,
  Printer, FileText, File as FileIcon, RefreshCcw, ChevronLeft, ChevronRight,
  Upload, Eye, Crown
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
import { StatCardsSkeleton } from "@/components/shared/StatCardsSkeleton";
import { TableRowsSkeleton } from "@/components/shared/TableRowsSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/shared/StatCard";

const isActiveStatus = (status?: string) => String(status ?? "").toLowerCase() === "active" || String(status ?? "") === "";

const Sparkline = ({ color }: { color: string }) => (
  <svg className={`w-full h-10 ${color}`} viewBox="0 0 100 20" preserveAspectRatio="none">
    <path d="M0,15 Q10,5 20,10 T40,10 T60,15 T80,5 T100,10 L100,20 L0,20 Z" fill="currentColor" fillOpacity="0.1" />
    <path d="M0,15 Q10,5 20,10 T40,10 T60,15 T80,5 T100,10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export default function OrganizationsPage() {
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");

  const [dateRangeFilter, setDateRangeFilter] = useState<"all"|"daily"|"weekly"|"monthly">("all");
  const [isRangeMode, setIsRangeMode] = useState(false);
  const [selectedSingleDate, setSelectedSingleDate] = useState("");
  const [selectedFromDate, setSelectedFromDate] = useState("");
  const [selectedToDate, setSelectedToDate] = useState("");

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [viewOrgId, setViewOrgId] = useState<string|null>(null);
  const [orgToDelete, setOrgToDelete] = useState<any>(null);
  const [orgToToggleStatus, setOrgToToggleStatus] = useState<any>(null);
  const [visibleColumns, setVisibleColumns] = useState({
    no: true, name: true, phone: true, status: true, actions: true
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

  // Set default selections if empty
  if (!selectedSingleDate && monthlyOptions.length > 0) {
    setSelectedSingleDate(monthlyOptions[0].value);
    setSelectedFromDate(monthlyOptions[0].value);
    setSelectedToDate(monthlyOptions[0].value);
  }

  const { data: organizations = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin_organizations"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>("/api/admin/organizations");
      return res.data || [];
    },
  });

  const { data: viewOrgData, isLoading: isLoadingViewOrg } = useQuery({
    queryKey: ["admin_organization", viewOrgId],
    queryFn: async () => {
      if (!viewOrgId) return null;
      const res = await api.get<{ success: boolean; data: any }>(`/api/admin/organizations?id=${viewOrgId}`);
      return Array.isArray(res.data) ? res.data[0] : res.data;
    },
    enabled: !!viewOrgId,
  });

  const isDataLoading = isLoading || isRefetching;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/admin/organizations?id=${id}`);
    },
    onSuccess: () => {
      success("Success", "Organization deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin_organizations"] });
      setOrgToDelete(null);
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to delete organization");
      setOrgToDelete(null);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (org: any) => {
      const newStatus = isActiveStatus(org.status) ? "inactive" : "active";
      await api.put(`/api/admin/organizations`, { id: org.id, status: newStatus, action: "UPDATE_STATUS" });
    },
    onSuccess: () => {
      success("Success", "Organization status updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin_organizations"] });
      setOrgToToggleStatus(null);
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to update status");
      setOrgToToggleStatus(null);
    }
  });

  const handleExportCSV = () => {
    const headers = ["Organization Name", "Phone Number", "Status"];
    const rows = filteredOrgs.map((org: any) => [
      `"${org.name || ""}"`,
      `"${org.phone || ""}"`,
      `"${isActiveStatus(org.status) ? "Active" : "Inactive"}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `organizations_export_${format(new Date(), "yyyyMMdd")}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExportExcel = () => {
    const headers = ["Organization Name", "Phone Number", "Status"];
    const rows = filteredOrgs.map((org: any) => [
      `"${org.name || ""}"`,
      `"${org.phone || ""}"`,
      `"${isActiveStatus(org.status) ? "Active" : "Inactive"}"`
    ]);
    const csvContent = "data:application/vnd.ms-excel;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `organizations_export_${format(new Date(), "yyyyMMdd")}.xls`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleDownloadTemplate = () => {
    const headers = ["Organization Name", "Phone Number", "Email", "Status"];
    const csvContent = "data:application/vnd.ms-excel;charset=utf-8," + headers.join(",") + "\n\"Example Clinic\",\"+1234567890\",\"contact@example.com\",\"Active\"";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "organization_import_template.xls");
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const filteredOrgs = organizations.filter((org: any) => {
    const matchesSearch = org.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          org.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          org.phone?.includes(searchTerm);
    const matchesStatus = statusFilter === "all" ? true :
                          statusFilter === "active" ? isActiveStatus(org.status) : !isActiveStatus(org.status);
                          
    let matchesDate = true;
    const orgDateString = org.createdAt || org.created_at || org.date_at;
    if (orgDateString && dateRangeFilter !== "all") {
      const orgDate = new Date(orgDateString);
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
            matchesDate = isWithinInterval(orgDate, { start: intervalStart, end: intervalEnd });
          } catch (e) {
            matchesDate = true;
          }
        }
      } else {
        if (selectedSingleDate) {
          const targetDate = new Date(selectedSingleDate);
          if (dateRangeFilter === 'daily') {
            matchesDate = isSameDay(orgDate, targetDate);
          } else if (dateRangeFilter === 'weekly') {
            matchesDate = isSameWeek(orgDate, targetDate, { weekStartsOn: 1 });
          } else if (dateRangeFilter === 'monthly') {
            matchesDate = isSameMonth(orgDate, targetDate);
          }
        }
      }
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const totalOrgs = organizations.length;
  const activeOrgs = organizations.filter((o: any) => isActiveStatus(o.status)).length;
  const inactiveOrgs = totalOrgs - activeOrgs;
  const distinctTypes = new Set(organizations.map((o: any) => String(o.type || "healthcare").toLowerCase())).size;
  const pendingOrgs = organizations.filter((o: any) => String(o.status ?? "").toLowerCase() === "pending").length;

  const currentData = filteredOrgs.slice((page - 1) * parseInt(pageSize), page * parseInt(pageSize));
  const totalPages = Math.ceil(filteredOrgs.length / parseInt(pageSize));

  const orgInitials = (name?: string) =>
    String(name ?? "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-muted font-sans pb-10">
      <div className="p-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-row justify-between items-center mb-6 gap-4">
          <div>
            <h1 className="text-[#1e293b] text-3xl font-bold tracking-tight">Organization Management</h1>
            <p className="text-muted-foreground text-sm mt-1 font-medium">Manage your tenant organizations, branches, and types</p>
          </div>

          <div className="flex items-center gap-2 bg-card px-3 py-1.5 rounded-xl border border-border shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-2 ml-1">Quick Actions:</span>
            <Button variant="ghost" size="sm" className="h-8 font-medium text-[#5b3bf7] bg-[#5b3bf7]/10 hover:bg-[#5b3bf7]/20" onClick={() => navigate("/dashboard/organizations")}>
              Organizations
            </Button>
            <Button variant="ghost" size="sm" className="h-8 font-medium text-muted-foreground hover:bg-muted" onClick={() => navigate("/dashboard/branches")}>
              Branches
            </Button>
            <Button variant="ghost" size="sm" className="h-8 font-medium text-muted-foreground hover:bg-muted" onClick={() => navigate("/dashboard/users")}>
              Users
            </Button>
            <Button variant="ghost" size="sm" className="h-8 font-medium text-muted-foreground hover:bg-muted" onClick={() => navigate("/dashboard/organization-types")}>
              Types
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        {isDataLoading ? <StatCardsSkeleton count={5} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6" /> : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <StatCard
            icon={Building2}
            label="Total Orgs"
            value={totalOrgs}
            colorClass="bg-[#0aa9ad] text-white"
          />
          <StatCard
            icon={UserPlus}
            label="Active Orgs"
            value={activeOrgs}
            colorClass="bg-[#22c55e] text-white"
          />
          <StatCard
            icon={UserX}
            label="Inactive/Suspended"
            value={inactiveOrgs}
            colorClass="bg-[#f59e0b] text-white"
          />
          <StatCard
            icon={LayoutGrid}
            label="Distinct Types"
            value={distinctTypes}
            colorClass="bg-[#6366f1] text-white"
          />
          <StatCard
            icon={Clock}
            label="Pending Setup"
            value={pendingOrgs}
            colorClass="bg-[#ec4899] text-white"
          />
        </div>
        )}

        {/* Toolbar 1 (100% matched to image) */}
        <div className="flex flex-wrap items-center gap-4 bg-card rounded-t-xl border border-b-0 border-border p-4 shadow-sm">
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search organizations..." 
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

            {/* Selection Dropdowns matching design */}
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
            <span className="text-sm font-bold text-slate-700">Total Orgs: {filteredOrgs.length}</span>
          </div>
        </div>

        {/* Toolbar 2: Exports & Actions (100% matched to image) */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-card border border-border p-4 border-t-slate-50 shadow-sm relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700 mr-2">Export:</span>
            <Button variant="outline" size="sm" className="h-9 px-3 border-border text-slate-700 hover:bg-muted rounded-lg font-medium transition-colors" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
            <Button variant="outline" size="sm" className="h-9 px-3 border-border text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg font-medium transition-colors" onClick={() => window.print()}>
              <FileText className="w-4 h-4 mr-2" /> PDF
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
              className="h-9 px-4 border-border text-slate-700 bg-card hover:bg-[#5b3bf7]/10 hover:text-[#5b3bf7] hover:border-[#5b3bf7]/30 rounded-lg font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm" 
              onClick={() => refetch()}
            >
              <RefreshCcw className={`w-4 h-4 mr-2 ${isDataLoading ? 'animate-spin text-[#5b3bf7]' : ''}`} /> 
              {isDataLoading ? "Refreshing..." : "Refresh"}
            </Button>
            <Button size="sm" className="h-9 px-4 bg-[#5b3bf7] hover:bg-[#4a2ee0] text-white rounded-lg font-medium transition-colors" onClick={() => navigate("/dashboard/organizations/add")}>
              <Plus className="w-4 h-4 mr-2" /> Add Organization
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 border-border text-slate-700 rounded-lg hover:bg-muted transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl p-2">
                <DropdownMenuItem className="rounded-md cursor-pointer font-medium text-slate-700 py-2 hover:bg-muted" onClick={handleExportCSV}><Download className="w-4 h-4 mr-2 text-muted-foreground" /> Export Table</DropdownMenuItem>
                <DropdownMenuItem className="rounded-md cursor-pointer font-medium text-slate-700 py-2 hover:bg-muted" onClick={() => setIsImportModalOpen(true)}><Upload className="w-4 h-4 mr-2 text-muted-foreground" /> Import Orgs</DropdownMenuItem>
                <DropdownMenuItem className="rounded-md cursor-pointer font-medium text-slate-700 py-2 hover:bg-muted" onClick={(e) => { e.preventDefault(); setVisibleColumns(prev => ({...prev, phone: !prev.phone}))}}><Eye className="w-4 h-4 mr-2 text-muted-foreground" /> Toggle Phone Col</DropdownMenuItem>
                <DropdownMenuItem className="rounded-md cursor-pointer font-medium text-slate-700 py-2 hover:bg-muted" onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}><FilterX className="w-4 h-4 mr-2 text-muted-foreground" /> Reset Filters</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Data Table (100% matched to image) */}
        <div className="bg-card border border-border border-t-0 p-5 rounded-b-xl shadow-sm">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
            <div className="flex items-center gap-2">
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
            <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
              Search:
              <Input
                placeholder="Search organizations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 w-[200px] border-border rounded-md bg-background/50 focus:bg-card transition-colors"
              />
            </div>
          </div>

          {isDataLoading ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table className="min-w-[800px]">
                <TableHeader className="bg-background/50">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    {visibleColumns.no && <TableHead className="w-[80px] font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4 pl-4">NO.</TableHead>}
                    {visibleColumns.name && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">ORGANIZATION NAME</TableHead>}
                    {visibleColumns.phone && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">PHONE NUMBER</TableHead>}
                    {visibleColumns.status && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider w-[150px] py-4">STATUS</TableHead>}
                    {visibleColumns.actions && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider text-right w-[150px] py-4 pr-6">ACTIONS</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRowsSkeleton columns={["text", "avatar", "text", "badge", "actions"]} />
                </TableBody>
              </Table>
            </div>
          ) : currentData.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table className="min-w-[800px]">
                <TableHeader className="bg-background/50">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    {visibleColumns.no && <TableHead className="w-[80px] font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4 pl-4">NO.</TableHead>}
                    {visibleColumns.name && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">ORGANIZATION NAME</TableHead>}
                    {visibleColumns.phone && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">PHONE NUMBER</TableHead>}
                    {visibleColumns.status && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider w-[150px] py-4">STATUS</TableHead>}
                    {visibleColumns.actions && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider text-right w-[150px] py-4 pr-6">ACTIONS</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentData.map((org: any, idx: number) => (
                    <TableRow key={org.id || idx} className="border-b border-slate-50 hover:bg-background/80 transition-colors">
                      {visibleColumns.no && <TableCell className="text-sm text-muted-foreground font-medium py-3 pl-4">{(page - 1) * parseInt(pageSize) + idx + 1}</TableCell>}
                      {visibleColumns.name && <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          {org.logo_url ? (
                            <img
                              src={org.logo_url}
                              alt={`${org.name} logo`}
                              className="h-8 w-8 shrink-0 rounded-lg border border-[#0aa9ad]/15 object-cover"
                            />
                          ) : (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#0aa9ad]/15 bg-[#0aa9ad]/10 text-xs font-black uppercase text-[#0aa9ad]">
                              {orgInitials(org.name)}
                            </div>
                          )}
                          <span className="text-sm font-semibold text-slate-700">{org.name}</span>
                        </div>
                      </TableCell>}
                      {visibleColumns.phone && <TableCell className="py-3">
                        <span className="text-sm text-muted-foreground font-medium">{org.phone || "N/A"}</span>
                      </TableCell>}
                      {visibleColumns.status && <TableCell className="py-3">
                        {isActiveStatus(org.status) ? (
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
                          <Button variant="outline" size="icon" className="h-7 w-7 rounded border-blue-200 text-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-colors shadow-sm" title="Edit" onClick={() => navigate(`/dashboard/organizations/edit/${org.id}`)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className={`h-7 w-7 rounded shadow-sm transition-colors ${isActiveStatus(org.status) ? "border-amber-200 text-amber-500 hover:bg-amber-50 hover:text-amber-600" : "border-emerald-200 text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600"}`}
                            title={isActiveStatus(org.status) ? "Suspend" : "Activate"}
                            onClick={() => setOrgToToggleStatus(org)}
                          >
                            {isActiveStatus(org.status) ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-7 w-7 rounded border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm" 
                            title="Delete"
                            onClick={() => setOrgToDelete(org)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-7 w-7 rounded border-emerald-200 text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors shadow-sm" title="View Details" onClick={() => setViewOrgId(org.id)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7 rounded border-purple-200 text-purple-500 hover:bg-purple-50 hover:text-purple-600 transition-colors shadow-sm"
                            title="View Subscription"
                            onClick={() => navigate(`/dashboard/organization-subscriptions?organizationId=${org.id}`)}
                          >
                            <Crown className="h-3.5 w-3.5" />
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
              <h3 className="text-xl font-bold text-slate-700 mb-2">No organizations found</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md text-center">We couldn't find any organizations matching your current search or filter criteria. Try adjusting them to see more results.</p>
              <Button className="bg-[#5b3bf7] hover:bg-[#4a2ee0] text-white shadow-sm px-6 h-10" onClick={() => {
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
              Showing {(page - 1) * parseInt(pageSize) + (currentData.length > 0 ? 1 : 0)} to {(page - 1) * parseInt(pageSize) + currentData.length} of {filteredOrgs.length} entries
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
                        ? "bg-[#5b3bf7] hover:bg-[#4a2ee0] text-white shadow-sm" 
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}
              
              {totalPages > 5 && <span className="text-muted-foreground px-1 font-medium">...</span>}
              
              {totalPages > 5 && (
                <Button 
                  variant={page === totalPages ? "default" : "ghost"}
                  className={`w-8 h-8 p-0 rounded-md font-medium transition-colors ${
                    page === totalPages 
                      ? "bg-[#5b3bf7] hover:bg-[#4a2ee0] text-white shadow-sm" 
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => setPage(totalPages)}
                >
                  {totalPages}
                </Button>
              )}

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
        {/* End of content */}

        {/* Import Modal */}
        <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Import Organizations</DialogTitle>
              <DialogDescription>
                Upload an Excel or CSV file to import organizations in bulk. Make sure to use the correct template.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-border rounded-lg bg-muted hover:bg-muted transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-sm font-medium text-muted-foreground">Click or drag file to upload</p>
                <p className="text-xs text-muted-foreground">.xls, .xlsx, .csv up to 10MB</p>
              </div>
            </div>
            <DialogFooter className="flex items-center justify-between sm:justify-between w-full">
              <Button variant="outline" onClick={handleDownloadTemplate} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                <Download className="w-4 h-4 mr-2" /> Get Excel Template
              </Button>
              <Button onClick={() => setIsImportModalOpen(false)} className="bg-[#5b3bf7] hover:bg-[#4a2ee0] text-white">
                Import
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Details Modal */}
        <Dialog open={!!viewOrgId} onOpenChange={(open) => !open && setViewOrgId(null)}>
          <DialogContent className="sm:max-w-[600px] bg-card border border-border">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-6 h-6 text-[#5b3bf7]" /> Additional Organization Details
              </DialogTitle>
              <DialogDescription>
                Extended organization details not shown in the primary data table.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-background/50 rounded-xl border border-border p-6 shadow-inner mt-2 min-h-[250px] flex items-center justify-center">
              {isLoadingViewOrg ? (
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-8">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Skeleton className="h-3.5 w-20" />
                      <Skeleton className="h-3.5 w-28" />
                    </div>
                  ))}
                </div>
              ) : viewOrgData ? (
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-8 max-h-[60vh] overflow-y-auto pr-2 text-base">
                  {Object.entries(viewOrgData).map(([key, value]) => {
                    const excludedFields = ['id', 'name', 'phone', 'status', 'updatedAt', 'updated_at', 'deletedAt', 'deleted_at', 'organization_type_id', 'organizationTypeId', 'deleted_by_id', 'deletedById', 'is_deleted', 'isDeleted', 'restore_allowed', 'restoreAllowed', 'is_approved', 'isApproved', 'lifecycle_status', 'lifecycleStatus'];
                    if (typeof value === 'object' && value !== null) return null; // Exclude nested objects for clean UI
                    if (excludedFields.includes(key)) return null; // Exclude redundant or internal fields
                    
                    let formattedKey = key
                      .replace(/_/g, ' ')
                      .replace(/([a-z])([A-Z])/g, '$1 $2')
                      .replace(/\b\w/g, c => c.toUpperCase());
                      
                    if (formattedKey.toLowerCase() === 'is approved') formattedKey = 'Approved';
                    if (formattedKey.toLowerCase() === 'is deleted') formattedKey = 'Deleted';

                    let displayValue = value === null || value === '' ? 'N/A' : String(value);
                    
                    // Prettify booleans
                    if (displayValue === 'true') displayValue = 'Yes';
                    if (displayValue === 'false') displayValue = 'No';

                    // Prettify ISO dates
                    if (displayValue.includes('T') && displayValue.endsWith('Z')) {
                      try {
                        displayValue = format(new Date(displayValue), "MMM d, yyyy h:mm a");
                      } catch(e) { /* ignore */ }
                    }

                    return (
                      <div key={key} className="break-words py-1.5">
                        <span className="font-bold text-foreground">{formattedKey}:</span> <span className="text-slate-700">{displayValue}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground">Failed to load organization details.</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!orgToDelete} onOpenChange={(open) => !open && setOrgToDelete(null)}>
          <AlertDialogContent className="rounded-2xl max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-black text-foreground">Delete Organization</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground font-medium mt-2">
                Are you absolutely sure you want to permanently delete{" "}
                <span className="font-bold text-foreground">
                  {orgToDelete?.name}
                </span>? This action cannot be undone and will delete all associated data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6 gap-3 sm:gap-0">
              <AlertDialogCancel className="rounded-xl border-border font-bold h-11 hover:bg-muted">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  if (orgToDelete?.id) deleteMutation.mutate(orgToDelete.id);
                }}
                className="bg-red-600 hover:bg-red-700 rounded-xl font-bold h-11"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                {deleteMutation.isPending ? "Deleting..." : "Delete Organization"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!orgToToggleStatus} onOpenChange={(open) => !open && setOrgToToggleStatus(null)}>
          <AlertDialogContent className="rounded-2xl max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-black text-foreground">
                {orgToToggleStatus && isActiveStatus(orgToToggleStatus.status) ? "Suspend Organization" : "Activate Organization"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground font-medium mt-2">
                Are you sure you want to {orgToToggleStatus && isActiveStatus(orgToToggleStatus.status) ? "suspend" : "activate"}{" "}
                <span className="font-bold text-foreground">
                  {orgToToggleStatus?.name}
                </span>?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6 gap-3 sm:gap-0">
              <AlertDialogCancel className="rounded-xl border-border font-bold h-11 hover:bg-muted">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  if (orgToToggleStatus) toggleStatusMutation.mutate(orgToToggleStatus);
                }}
                className={`${
                  orgToToggleStatus && isActiveStatus(orgToToggleStatus.status)
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-emerald-500 hover:bg-emerald-600"
                } text-white rounded-xl font-bold h-11`}
                disabled={toggleStatusMutation.isPending}
              >
                {toggleStatusMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
                 orgToToggleStatus && isActiveStatus(orgToToggleStatus.status) ? <UserX className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />}
                {toggleStatusMutation.isPending ? "Updating..." : "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
