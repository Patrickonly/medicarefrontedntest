import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { StatCard } from "@/components/shared/StatCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup,
} from "@/components/ui/select";
import {
  Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, Clock, DollarSign, Loader2, Plus, Search, RefreshCcw, Edit, Trash2, MoreHorizontal, Printer, FileSpreadsheet, File as FileIcon, FilterX, MoreVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  format, subDays, subWeeks, subMonths,
  startOfWeek, endOfWeek, startOfMonth,
  isSameDay, isSameWeek, isSameMonth, endOfDay, endOfMonth, isWithinInterval,
} from "date-fns";

export default function ShiftManagementPage() {
  const { success, error } = useToast();
  const { organizationId, user } = useAuth();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isClosingDialog, setIsClosingDialog] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [shiftToEdit, setShiftToEdit] = useState<any>(null);
  const [editOpeningCash, setEditOpeningCash] = useState("");
  const [editClosingCash, setEditClosingCash] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [activeShift, setActiveShift] = useState<any>(null);
  const [startingCash, setStartingCash] = useState("");
  const [closingCash, setClosingCash] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");
  const [selectedShifts, setSelectedShifts] = useState<string[]>([]);

  // ── Date Filter State (copied from CustomersPage) ──
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
  const { data: shifts = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["shifts", organizationId],
    queryFn: async () => {
      const res = await api.get<any>("/api/shifts");
      // The API returns { shifts: [...] } or an array
      const all = Array.isArray(res) ? res : (res?.shifts || res?.data || []);
      all.sort((a: any, b: any) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime());
      return all;
    },
    enabled: !!organizationId,
  });

  const isDataLoading = isLoading || isRefetching;

  const openShiftMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post("/api/shifts/open", data);
      return res.data;
    },
    onSuccess: () => {
      success("Success", "Shift opened successfully.");
      setIsDialogOpen(false);
      setStartingCash("");
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to open shift.");
    }
  });

  const closeShiftMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.post("/api/shifts/close", { shift_id: id, ...data });
      return res.data;
    },
    onSuccess: () => {
      success("Success", "Shift closed successfully.");
      setIsClosingDialog(false);
      setActiveShift(null);
      setClosingCash("");
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to close shift.");
    }
  });

  const handleOpenShift = () => {
    if (!startingCash) {
      error("Error", "Starting cash is required.");
      return;
    }
    openShiftMutation.mutate({
      user_id: user?.id,
      opening_balance: Number(startingCash)
    });
  };

    const editShiftMutation = useMutation({
    mutationFn: async (data: any) => {
      await api.patch(`/api/shifts/${shiftToEdit.id}`, data);
    },
    onSuccess: () => {
      success("Shift updated", "The shift has been successfully updated.");
      setIsEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
    onError: (err: any) => {
      error("Update failed", err?.message || "Could not update the shift.");
    }
  });

  const deleteShiftMutation = useMutation({
    mutationFn: async (id: string | number) => {
      await api.delete(`/api/shifts/${id}`);
    },
    onSuccess: () => {
      success("Shift deleted", "The shift has been successfully deleted.");
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
    onError: (err: any) => {
      error("Delete failed", err?.message || "Could not delete the shift.");
    }
  });

  const handleEditSubmit = () => {
    editShiftMutation.mutate({
      opening_balance: Number(editOpeningCash),
      closing_balance: editClosingCash !== "" ? Number(editClosingCash) : undefined,
      status: editStatus
    });
  };

  const handleDelete = (id: string | number) => {
    if (window.confirm("Are you sure you want to delete this shift? This action cannot be undone.")) {
      deleteShiftMutation.mutate(id);
    }
  };

  const handleCloseShift = () => {
    if (!closingCash) {
      error("Error", "Closing cash is required.");
      return;
    }
    closeShiftMutation.mutate({
      id: activeShift.id,
      data: { closing_balance: Number(closingCash) }
    });
  };

  // ── Client-side Filtering ──
  const filteredShifts = shifts.filter((shift: any) => {
    // 1. Search by user
    const openedName = shift.opened_by?.username || "";
    const closedName = shift.closed_by?.username || "";
    const matchesSearch =
      openedName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      closedName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(shift.id).includes(searchTerm);
    if (!matchesSearch) return false;

    // 2. Date filter
    if (dateRangeFilter === "all") return true;
    const shiftDate = new Date(shift.opened_at || 0);

    if (isRangeMode) {
      if (selectedFromDate && selectedToDate) {
        const start = new Date(selectedFromDate);
        let end = new Date(selectedToDate);
        if (dateRangeFilter === 'daily') end = endOfDay(end);
        else if (dateRangeFilter === 'weekly') end = endOfWeek(end, { weekStartsOn: 1 });
        else if (dateRangeFilter === 'monthly') end = endOfMonth(end);
        const intervalStart = start <= end ? start : end;
        const intervalEnd = start <= end ? end : start;
        try { return isWithinInterval(shiftDate, { start: intervalStart, end: intervalEnd }); }
        catch { return true; }
      }
    } else {
      if (selectedSingleDate) {
        const targetDate = new Date(selectedSingleDate);
        if (dateRangeFilter === 'daily') return isSameDay(shiftDate, targetDate);
        if (dateRangeFilter === 'weekly') return isSameWeek(shiftDate, targetDate, { weekStartsOn: 1 });
        if (dateRangeFilter === 'monthly') return isSameMonth(shiftDate, targetDate);
      }
    }
    return true;
  });

  // ── Pagination ──
  const PAGE_SIZE = Number(pageSize);
  const totalPages = Math.max(1, Math.ceil(filteredShifts.length / PAGE_SIZE));
  const paginatedShifts = filteredShifts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  if (currentPage > totalPages && totalPages > 0) {
    setCurrentPage(1);
  }

  // ── Bulk Selection ──
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = paginatedShifts.map((s: any) => s.id?.toString()).filter(Boolean);
      setSelectedShifts(allIds);
    } else {
      setSelectedShifts([]);
    }
  };

  const handleSelectOne = (checked: boolean, id: string) => {
    if (checked) {
      setSelectedShifts(prev => [...prev, id]);
    } else {
      setSelectedShifts(prev => prev.filter(sId => sId !== id));
    }
  };

  const isAllCurrentPageSelected = useMemo(() => {
    if (paginatedShifts.length === 0) return false;
    return paginatedShifts.every((s: any) => selectedShifts.includes(s.id?.toString()));
  }, [paginatedShifts, selectedShifts]);

  const deleteMultipleMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => api.delete(`/api/shifts/${id}`)));
    },
    onSuccess: () => {
      success("Shifts deleted", "The selected shifts have been successfully deleted.");
      setSelectedShifts([]);
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
    },
    onError: (err: any) => {
      error("Delete failed", err?.message || "Could not delete the shifts.");
    }
  });

  const hasOpenShift = shifts.some((s: any) => s.status === "OPEN");

  return (
    <div className="min-h-screen bg-muted font-sans pb-10">
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Shift Management</h1>
            <p className="text-muted-foreground mt-1">Open and close cashier shifts.</p>
          </div>
          {!isLoading && !hasOpenShift && (
            <Button onClick={() => setIsDialogOpen(true)} className="bg-[#0aa9ad] hover:bg-[#07969a] rounded-xl h-10 px-5">
              <Plus className="w-4 h-4 mr-2" /> Open Shift
            </Button>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard icon={Clock} label="Total Shifts" value={shifts.length} colorClass="bg-[#0aa9ad] text-white" />
          <StatCard icon={CheckCircle} label="Active Shift" value={hasOpenShift ? "Yes" : "No"} colorClass="bg-[#8b5cf6] text-white" />
          <StatCard icon={DollarSign} label="Discrepancies" value={shifts.filter((s: any) => s.status === "DISCREPANCY").length} colorClass="bg-[#ef4444] text-white" />
        </div>

        {/* ── Toolbar (copied from CustomersPage style) ── */}
        <div className="flex flex-wrap items-center gap-4 bg-card rounded-t-xl border border-b-0 border-border p-4 shadow-sm">
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by cashier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 border-border rounded-lg text-sm bg-background/50 focus:bg-card transition-colors"
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
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-bold text-slate-700">Total: {filteredShifts.length}</span>
            </div>

            {selectedShifts.length > 0 && (
              <Button
                variant="destructive"
                className="h-10 px-4 font-bold rounded-xl"
                disabled={deleteMultipleMutation.isPending}
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete ${selectedShifts.length} shifts?`)) {
                    deleteMultipleMutation.mutate(selectedShifts);
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected ({selectedShifts.length})
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

        {/* ── Shift History Table ── */}
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

          <div className="overflow-x-auto rounded-lg border border-border">
            <Table className="min-w-[800px]">
              <TableHeader className="bg-background/50">
                <TableRow>
                  <TableHead className="w-[40px] pl-4"><Checkbox checked={isAllCurrentPageSelected} onCheckedChange={handleSelectAll} className="rounded-sm bg-white" /></TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500">Start Time</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500">End Time</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500">Opened By</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500">Closed By</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500">Starting Cash</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500">Closing Cash</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500">Status</TableHead>
                  <TableHead className="font-bold text-[11px] uppercase tracking-wider text-slate-500 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : paginatedShifts.map((shift: any) => (
                  <TableRow key={shift.id} className={`hover:bg-muted/30 transition-colors ${selectedShifts.includes(shift.id?.toString()) ? "bg-primary/5" : ""}`}>
                    <TableCell className="pl-4">
                      <Checkbox checked={selectedShifts.includes(shift.id?.toString())} onCheckedChange={(c: boolean) => handleSelectOne(c, shift.id?.toString())} className="rounded-sm bg-white" />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{new Date(shift.opened_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                        <span className="text-xs text-muted-foreground">{new Date(shift.opened_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {shift.closed_at ? (
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">{new Date(shift.closed_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}</span>
                          <span className="text-xs text-muted-foreground">{new Date(shift.closed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#0aa9ad]/10 flex items-center justify-center text-[#0aa9ad] font-bold text-xs uppercase">
                          {shift.opened_by?.username?.[0] || 'U'}
                        </div>
                        <span className="font-medium text-slate-700 text-sm">{shift.opened_by?.username || 'Unknown'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {shift.closed_by?.username ? (
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs uppercase">
                            {shift.closed_by.username[0]}
                          </div>
                          <span className="font-medium text-slate-700 text-sm">{shift.closed_by.username}</span>
                        </div>
                      ) : <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell className="font-semibold">{Number(shift.opening_balance).toLocaleString()} RWF</TableCell>
                    <TableCell className="font-semibold">{shift.closing_balance != null ? `${Number(shift.closing_balance).toLocaleString()} RWF` : "-"}</TableCell>
                    <TableCell>
                      {shift.status === "OPEN" ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Open</Badge>
                      ) : shift.status === "DISCREPANCY" ? (
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200">Discrepancy</Badge>
                      ) : (
                        <Badge className="bg-muted text-muted-foreground border-border">Closed</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {shift.status === "OPEN" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-orange-600 border-orange-200 hover:bg-orange-50"
                            onClick={() => { setActiveShift(shift); setIsClosingDialog(true); }}
                          >
                            <CheckCircle className="w-4 h-4 mr-2" /> Close Shift
                          </Button>
                        )}
                        {user?.role?.name === "ADMIN" || true ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setShiftToEdit(shift);
                                  setEditOpeningCash(shift.opening_balance?.toString() || "");
                                  setEditClosingCash(shift.closing_balance?.toString() || "");
                                  setEditStatus(shift.status);
                                  setIsEditDialogOpen(true);
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-rose-600 focus:text-rose-600"
                                onClick={() => handleDelete(shift.id)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && filteredShifts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                      No shifts found matching your criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* ── Pagination ── */}
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

        {/* ── Open Shift Dialog ── */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="rounded-[24px] max-w-md p-0 overflow-hidden border-0 shadow-2xl">
            <div className="bg-gradient-to-br from-[#0aa9ad] to-[#07969a] p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-white opacity-10 rounded-full blur-3xl"></div>
              <DialogHeader className="relative z-10">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 border border-white/30 shadow-inner">
                  <Clock className="w-7 h-7 text-white" />
                </div>
                <DialogTitle className="text-2xl font-bold tracking-tight">Open New Shift</DialogTitle>
                <p className="text-emerald-50 mt-1.5 text-sm font-medium">Verify your starting cash before opening the register.</p>
              </DialogHeader>
            </div>
            <div className="p-8 space-y-6 bg-white">
              <div className="space-y-3">
                <Label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Starting Cash (RWF)</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-slate-400" />
                  </div>
                  <Input
                    type="number"
                    value={startingCash}
                    onChange={(e) => setStartingCash(e.target.value)}
                    placeholder="0.00"
                    className="pl-12 h-14 bg-slate-50 border-slate-200 rounded-xl text-lg font-bold shadow-sm focus:border-[#0aa9ad] focus:ring-[#0aa9ad] transition-all"
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="px-8 pb-8 bg-white border-t-0 sm:justify-end gap-3">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl h-12 px-6 font-semibold border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Cancel</Button>
              <Button onClick={handleOpenShift} className="bg-[#0aa9ad] hover:bg-[#07969a] rounded-xl h-12 px-8 font-semibold shadow-md shadow-[#0aa9ad]/20 transition-all" disabled={openShiftMutation.isPending}>
                {openShiftMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm & Open"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Close Shift Dialog ── */}
        <Dialog open={isClosingDialog} onOpenChange={setIsClosingDialog}>
          <DialogContent className="rounded-[24px] max-w-md p-0 overflow-hidden border-0 shadow-2xl">
            <div className="bg-gradient-to-br from-orange-500 to-red-500 p-8 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 bg-white opacity-10 rounded-full blur-3xl"></div>
              <DialogHeader className="relative z-10">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center mb-4 border border-white/30 shadow-inner">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
                <DialogTitle className="text-2xl font-bold tracking-tight">Close Shift</DialogTitle>
                <p className="text-orange-50 mt-1.5 text-sm font-medium">Count your drawer and enter the final cash amount.</p>
              </DialogHeader>
            </div>
            <div className="p-8 space-y-6 bg-white">
              <div className="space-y-3">
                <Label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Closing Cash (RWF)</Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <DollarSign className="h-5 w-5 text-slate-400" />
                  </div>
                  <Input
                    type="number"
                    value={closingCash}
                    onChange={(e) => setClosingCash(e.target.value)}
                    placeholder="0.00"
                    className="pl-12 h-14 bg-slate-50 border-slate-200 rounded-xl text-lg font-bold shadow-sm focus:border-orange-500 focus:ring-orange-500 transition-all"
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="px-8 pb-8 bg-white border-t-0 sm:justify-end gap-3">
              <Button variant="outline" onClick={() => setIsClosingDialog(false)} className="rounded-xl h-12 px-6 font-semibold border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">Cancel</Button>
              <Button onClick={handleCloseShift} className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-xl h-12 px-8 font-semibold shadow-md shadow-orange-500/20 transition-all" disabled={closeShiftMutation.isPending}>
                {closeShiftMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirm & Close"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    
      {/* ── Edit Shift Dialog ── */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Opening Cash</Label>
              <Input
                type="number"
                value={editOpeningCash}
                onChange={(e) => setEditOpeningCash(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Closing Cash</Label>
              <Input
                type="number"
                value={editClosingCash}
                onChange={(e) => setEditClosingCash(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">OPEN</SelectItem>
                  <SelectItem value="CLOSED">CLOSED</SelectItem>
                  <SelectItem value="DISCREPANCY">DISCREPANCY</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button
              className="bg-[#0aa9ad] hover:bg-[#07969a] text-white"
              onClick={handleEditSubmit}
              disabled={editShiftMutation.isPending}
            >
              {editShiftMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
</div>
  );
}
