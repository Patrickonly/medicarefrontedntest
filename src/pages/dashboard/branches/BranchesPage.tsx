import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Building, Building2, Edit, FilterX, Loader2, MapPin, MoreVertical, Plus, RefreshCcw, Search, Trash2,
  CheckCircle2, XCircle, Store, UserCheck, UserX, UserPlus
} from "lucide-react";
import { format } from "date-fns";
import { StatCard } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatCardsSkeleton } from "@/components/shared/StatCardsSkeleton";
import { TableRowsSkeleton } from "@/components/shared/TableRowsSkeleton";

const isActiveStatus = (s?: string) => String(s ?? "").toLowerCase() === "active" || String(s ?? "") === "";

export default function BranchesPage() {
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { userRole, organizationId } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const isSuperAdmin = userRole === "super_admin";

  // Super Admin has no organization of their own, so they must pick which
  // organization's branches to view (there is no "list all branches" route).
  const [viewOrgId, setViewOrgId] = useState("");

  const [branchToDelete, setBranchToDelete] = useState<any>(null);
  const [branchToToggleStatus, setBranchToToggleStatus] = useState<any>(null);

  const { data: organizations = [] } = useQuery({
    queryKey: ["admin_organizations_list"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>("/api/admin/organizations");
      return res.data || [];
    },
    enabled: isSuperAdmin,
  });

  useEffect(() => {
    if (isSuperAdmin && !viewOrgId && organizations.length > 0) {
      setViewOrgId(organizations[0].id);
    }
  }, [isSuperAdmin, viewOrgId, organizations]);

  const { data: branches = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["branches", isSuperAdmin ? viewOrgId : "org"],
    queryFn: async () => {
      const endpoint = isSuperAdmin ? `/api/branches?organizationId=${viewOrgId}` : "/api/branches";
      const res = await api.get<{ success: boolean; data: any[] }>(endpoint, !isSuperAdmin && organizationId ? { organizationId } : undefined);
      return res.data || [];
    },
    enabled: isSuperAdmin ? !!viewOrgId : true,
  });

  const isDataLoading = isLoading || isRefetching;

  const branchEndpoint = isSuperAdmin ? "/api/admin/branches" : "/api/branches";
  const branchHeaders = !isSuperAdmin && organizationId ? { organizationId } : undefined;

  // Inline (single-row) status toggle from the row menu.
  const statusMutation = useMutation({
    mutationFn: async (branch: any) => {
      const newStatus = isActiveStatus(branch.status) ? "inactive" : "active";
      await api.put(branchEndpoint, { ...branch, id: branch.id, status: newStatus }, branchHeaders);
    },
    onSuccess: () => {
      success("Success", "Branch status updated");
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setBranchToToggleStatus(null);
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to update status");
      setBranchToToggleStatus(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`${branchEndpoint}?id=${id}`, branchHeaders);
    },
    onSuccess: () => {
      success("Success", "Branch deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      setBranchToDelete(null);
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to delete branch");
      setBranchToDelete(null);
    },
  });

  const filteredBranches = branches.filter((branch: any) => {
    const matchesSearch =
      branch.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      branch.location?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" ? true : statusFilter === "active" ? isActiveStatus(branch.status) : !isActiveStatus(branch.status);
    return matchesSearch && matchesStatus;
  });

  const totalBranches = branches.length;
  const activeBranches = branches.filter((b: any) => isActiveStatus(b.status)).length;
  const inactiveBranches = totalBranches - activeBranches;
  const distinctLocations = new Set(branches.map((b: any) => String(b.location || "").toLowerCase()).filter(Boolean)).size;

  const currentData = filteredBranches.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredBranches.length / pageSize);

  const orgNameOf = (branch: any) =>
    organizations.find((o: any) => o.id === branch.organizationId || o.id === branch.organization_id)?.name ||
    branch.organizationId || "-";

  const orgInitials = (name?: string) =>
    String(name ?? "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-muted font-sans pb-10">
      <div className="p-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-row justify-between items-center mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-[#1e293b] text-3xl font-bold tracking-tight">Branch Management</h1>
            <p className="text-muted-foreground text-sm mt-1 font-medium">Manage {isSuperAdmin ? "platform-wide branches" : "your organization's branches"}</p>
          </div>

          <div className="flex items-center gap-2 bg-card px-3 py-1.5 rounded-xl border border-border shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-2 ml-1">Quick Actions:</span>
            <Button variant="ghost" size="sm" className="h-8 font-medium text-muted-foreground hover:bg-muted" onClick={() => navigate("/dashboard/organizations")}>
              Organizations
            </Button>
            <Button variant="ghost" size="sm" className="h-8 font-medium text-[#5b3bf7] bg-[#5b3bf7]/10 hover:bg-[#5b3bf7]/20" onClick={() => navigate("/dashboard/branches")}>
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
        {isDataLoading ? <StatCardsSkeleton count={4} /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={Building2}
            label="Total Branches"
            value={totalBranches}
            colorClass="bg-[#0aa9ad] text-white"
          />
          <StatCard
            icon={UserCheck}
            label="Active Branches"
            value={activeBranches}
            colorClass="bg-[#22c55e] text-white"
          />
          <StatCard
            icon={UserX}
            label="Inactive"
            value={inactiveBranches}
            colorClass="bg-[#f59e0b] text-white"
          />
          <StatCard
            icon={MapPin}
            label="Locations"
            value={distinctLocations}
            colorClass="bg-[#6366f1] text-white"
          />
        </div>
        )}

        {/* Toolbar 1 */}
        <div className="flex flex-wrap items-center gap-4 bg-card rounded-t-xl border border-b-0 border-border p-4 shadow-sm">
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search branches..."
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

          {isSuperAdmin && (
            <div className="flex items-center gap-2 border-l border-border pl-4">
              <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">Organization:</span>
              <Select value={viewOrgId} onValueChange={setViewOrgId}>
                <SelectTrigger className="w-[200px] h-10 border-border bg-card text-slate-700 font-medium rounded-lg hover:bg-muted">
                  <SelectValue placeholder="Select an organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org: any) => (
                    <SelectItem key={org.id} value={String(org.id)}>{org.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex items-center gap-2 bg-muted border border-border h-10 px-4 rounded-lg ml-auto">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-bold text-slate-700">Total Branches: {filteredBranches.length}</span>
          </div>
        </div>

        {/* Toolbar 2: Actions */}
        <div className="flex flex-wrap items-center justify-end gap-4 bg-card border border-border p-4 border-t-slate-50 shadow-sm relative z-10">
          <Button
            variant="outline"
            size="sm"
            disabled={isDataLoading}
            className="h-9 px-4 border-border text-slate-700 bg-card hover:bg-[#5b3bf7]/10 hover:text-[#5b3bf7] hover:border-[#5b3bf7]/30 rounded-lg font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
            onClick={() => refetch()}
          >
            <RefreshCcw className={`w-4 h-4 mr-2 ${isDataLoading ? "animate-spin text-[#5b3bf7]" : ""}`} />
            {isDataLoading ? "Refreshing..." : "Refresh"}
          </Button>
          <Button size="sm" className="h-9 px-4 bg-[#5b3bf7] hover:bg-[#4a2ee0] text-white rounded-lg font-medium transition-colors" onClick={() => navigate("/dashboard/branches/add")}>
            <Plus className="mr-2 h-4 w-4" />
            Add Branch
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-9 w-9 border-border text-slate-700 rounded-lg hover:bg-muted transition-colors">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-card border border-border border-t-0 p-5 rounded-b-xl shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">Show entries:</span>
            <Select value={String(pageSize)} onValueChange={(val) => { setPageSize(Number(val)); setPage(1); }}>
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
                    <TableHead className="w-[80px] font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4 pl-4">NO.</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">BRANCH NAME</TableHead>
                    {isSuperAdmin && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">ORGANIZATION</TableHead>}
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">LOCATION</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider w-[150px] py-4">STATUS</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider text-right w-[100px] py-4 pr-6">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRowsSkeleton columns={isSuperAdmin ? ["text", "avatar", "text", "text", "badge", "actions"] : ["text", "avatar", "text", "badge", "actions"]} />
                </TableBody>
              </Table>
            </div>
          ) : currentData.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table className="min-w-[800px]">
                <TableHeader className="bg-background/50">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="w-[80px] font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4 pl-4">NO.</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">BRANCH NAME</TableHead>
                    {isSuperAdmin && <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">ORGANIZATION</TableHead>}
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">LOCATION</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider w-[150px] py-4">STATUS</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider text-right w-[100px] py-4 pr-6">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentData.map((branch: any, idx: number) => (
                    <TableRow key={branch.id} className="border-b border-slate-50 hover:bg-background/80 transition-colors">
                      <TableCell className="text-sm text-muted-foreground font-medium py-3 pl-4">{(page - 1) * pageSize + idx + 1}</TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#0aa9ad]/15 bg-[#0aa9ad]/10 text-xs font-black uppercase text-[#0aa9ad]">
                            {orgInitials(branch.name)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-700">{branch.name}</span>
                            <span className="text-xs text-muted-foreground">{branch.contact_phone || branch.contactPhone || "-"}</span>
                          </div>
                        </div>
                      </TableCell>
                      {isSuperAdmin && <TableCell className="py-3"><span className="text-sm text-muted-foreground font-medium">{orgNameOf(branch)}</span></TableCell>}
                      <TableCell className="py-3"><span className="text-sm text-muted-foreground font-medium">{branch.location || "N/A"}</span></TableCell>
                      <TableCell className="py-3">
                        {isActiveStatus(branch.status) ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#ecfdf5] text-[#10b981] uppercase tracking-wide">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-muted text-muted-foreground uppercase tracking-wide">
                            Inactive
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right py-3 pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => navigate(`/dashboard/branches/edit/${branch.id}`)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setBranchToDelete(branch)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-background/50 rounded-xl border border-dashed border-border mt-2 mb-4 mx-2">
              <div className="bg-card w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-sm border border-border">
                <Building className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">No branches found</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md text-center">We couldn't find any branches matching your current search or filter criteria. Try adjusting them to see more results.</p>
              <Button className="bg-[#5b3bf7] hover:bg-[#4a2ee0] text-white shadow-sm px-6 h-10" onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}>
                <FilterX className="w-4 h-4 mr-2" /> Clear All Filters
              </Button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between mt-5 gap-4">
            <div className="text-sm text-muted-foreground font-medium">
              Showing {(page - 1) * pageSize + (currentData.length > 0 ? 1 : 0)} to {(page - 1) * pageSize + currentData.length} of {filteredBranches.length} entries
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                className="text-muted-foreground text-sm font-medium px-3 hover:text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
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
                      page === pageNum ? "bg-[#5b3bf7] hover:bg-[#4a2ee0] text-white shadow-sm" : "text-muted-foreground hover:bg-muted"
                    }`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}

              {totalPages > 5 && <span className="text-muted-foreground px-1 font-medium">...</span>}

              {totalPages > 5 && (
                <Button
                  variant={page === totalPages ? "default" : "ghost"}
                  className={`w-8 h-8 p-0 rounded-md font-medium transition-colors ${
                    page === totalPages ? "bg-[#5b3bf7] hover:bg-[#4a2ee0] text-white shadow-sm" : "text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => setPage(totalPages)}
                >
                  {totalPages}
                </Button>
              )}

              <Button
                variant="ghost"
                className="text-muted-foreground text-sm font-medium px-3 hover:bg-muted transition-colors disabled:opacity-50"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        {/* Delete Confirmation */}
        <AlertDialog open={!!branchToDelete} onOpenChange={(open) => !open && setBranchToDelete(null)}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Delete "{branchToDelete?.name}"?</AlertDialogTitle>
              <AlertDialogDescription>
                This branch will be permanently removed. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => branchToDelete && deleteMutation.mutate(branchToDelete.id)}
                disabled={deleteMutation.isPending}
                className="rounded-xl bg-red-600 text-white hover:bg-red-700"
              >
                {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!branchToToggleStatus} onOpenChange={(open) => !open && setBranchToToggleStatus(null)}>
          <AlertDialogContent className="rounded-2xl max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-black text-foreground">
                {branchToToggleStatus && isActiveStatus(branchToToggleStatus.status) ? "Suspend Branch" : "Activate Branch"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground font-medium mt-2">
                Are you sure you want to {branchToToggleStatus && isActiveStatus(branchToToggleStatus.status) ? "suspend" : "activate"}{" "}
                <span className="font-bold text-foreground">
                  {branchToToggleStatus?.name}
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
                  if (branchToToggleStatus) statusMutation.mutate(branchToToggleStatus);
                }}
                className={`${
                  branchToToggleStatus && isActiveStatus(branchToToggleStatus.status)
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-emerald-500 hover:bg-emerald-600"
                } text-white rounded-xl font-bold h-11`}
                disabled={statusMutation.isPending}
              >
                {statusMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
                 branchToToggleStatus && isActiveStatus(branchToToggleStatus.status) ? <XCircle className="mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                {statusMutation.isPending ? "Updating..." : "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
