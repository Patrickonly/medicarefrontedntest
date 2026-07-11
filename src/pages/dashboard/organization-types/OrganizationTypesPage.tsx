import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Tags, Plus, Edit, Trash2, Loader2, CheckCircle2, XCircle, Building2,
  Search, RefreshCcw, MoreVertical, FilterX, Layers, UserX, UserCheck
} from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
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
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatCardsSkeleton } from "@/components/shared/StatCardsSkeleton";
import { TableRowsSkeleton } from "@/components/shared/TableRowsSkeleton";

interface OrganizationType {
  id: string;
  name: string;
  description?: string | null;
  status: "active" | "inactive";
}

const emptyForm = { name: "", description: "", status: "active" as "active" | "inactive" };

export default function OrganizationTypesPage() {
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [typeToDelete, setTypeToDelete] = useState<OrganizationType | null>(null);
  const [typeToToggleStatus, setTypeToToggleStatus] = useState<OrganizationType | null>(null);

  const { data: types = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["admin-organization-types"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: OrganizationType[] }>("/api/organization-types");
      return res.data || [];
    },
  });

  const isDataLoading = isLoading || isRefetching;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/api/organization-types?id=${id}`),
    onSuccess: () => {
      success("Success", "Organization type deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-organization-types"] });
      setTypeToDelete(null);
    },
    onError: (err: any) => error("Error", err?.message || "Failed to delete organization type"),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "inactive" }) =>
      api.put(`/api/organization-types?id=${id}`, { status }),
    onSuccess: () => {
      success("Success", "Status updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-organization-types"] });
      setTypeToToggleStatus(null);
    },
    onError: (err: any) => {
      error("Error", err?.message || "Failed to update status");
      setTypeToToggleStatus(null);
    },
  });

  const filteredTypes = types.filter((t) => {
    const matchesSearch =
      t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" ? true : statusFilter === "active" ? t.status === "active" : t.status !== "active";
    return matchesSearch && matchesStatus;
  });

  const totalTypes = types.length;
  const activeTypes = types.filter((t) => t.status === "active").length;
  const inactiveTypes = totalTypes - activeTypes;

  const currentData = filteredTypes.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredTypes.length / pageSize);

  return (
    <div className="min-h-screen bg-muted font-sans pb-10">
      <div className="p-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-row justify-between items-center mb-6 gap-4">
          <div>
            <h1 className="text-[#1e293b] text-3xl font-bold tracking-tight">Organization Types</h1>
            <p className="text-muted-foreground text-sm mt-1 font-medium">Manage the business types available during organization registration</p>
          </div>

          <div className="flex items-center gap-2 bg-card px-3 py-1.5 rounded-xl border border-border shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-2 ml-1">Quick Actions:</span>
            <Button variant="ghost" size="sm" className="h-8 font-medium text-muted-foreground hover:bg-muted" onClick={() => navigate("/dashboard/organizations")}>
              Organizations
            </Button>
            <Button variant="ghost" size="sm" className="h-8 font-medium text-muted-foreground hover:bg-muted" onClick={() => navigate("/dashboard/branches")}>
              Branches
            </Button>
            <Button variant="ghost" size="sm" className="h-8 font-medium text-muted-foreground hover:bg-muted" onClick={() => navigate("/dashboard/users")}>
              Users
            </Button>
            <Button variant="ghost" size="sm" className="h-8 font-medium text-[#5b3bf7] bg-[#5b3bf7]/10 hover:bg-[#5b3bf7]/20" onClick={() => navigate("/dashboard/organization-types")}>
              Types
            </Button>
          </div>
        </div>

        {isDataLoading ? <StatCardsSkeleton count={4} /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={Layers}
            label="Total Types"
            value={totalTypes}
            colorClass="bg-[#0aa9ad] text-white"
          />
          <StatCard
            icon={UserCheck}
            label="Active Types"
            value={activeTypes}
            colorClass="bg-[#22c55e] text-white"
          />
          <StatCard
            icon={UserX}
            label="Inactive"
            value={inactiveTypes}
            colorClass="bg-[#f59e0b] text-white"
          />
          <StatCard
            icon={Layers}
            label="Documented"
            value={types.filter((t) => !!t.description).length}
            colorClass="bg-[#6366f1] text-white"
          />
        </div>
        )}

        {/* Toolbar 1 */}
        <div className="flex flex-wrap items-center gap-4 bg-card rounded-t-xl border border-b-0 border-border p-4 shadow-sm">
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search organization types..."
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

          <div className="flex items-center gap-2 bg-muted border border-border h-10 px-4 rounded-lg ml-auto">
            <Tags className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-bold text-slate-700">Total Types: {filteredTypes.length}</span>
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
          <Button size="sm" className="h-9 px-4 bg-[#5b3bf7] hover:bg-[#4a2ee0] text-white rounded-lg font-medium transition-colors" onClick={() => navigate("/dashboard/organization-types/add")}>
            <Plus className="w-4 h-4 mr-2" /> Add Type
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9 border-border text-slate-700 rounded-lg hover:bg-muted transition-colors">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl p-2">
              <DropdownMenuItem className="rounded-md cursor-pointer font-medium text-slate-700 py-2 hover:bg-muted" onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}>
                <FilterX className="w-4 h-4 mr-2 text-muted-foreground" /> Reset Filters
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
              <Table className="min-w-[700px]">
                <TableHeader className="bg-background/50">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="w-[80px] font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4 pl-4">NO.</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">NAME</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">DESCRIPTION</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider w-[180px] py-4">STATUS</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider text-right w-[120px] py-4 pr-6">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRowsSkeleton columns={["text", "avatar", "text", "badge", "actions"]} />
                </TableBody>
              </Table>
            </div>
          ) : currentData.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table className="min-w-[700px]">
                <TableHeader className="bg-background/50">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="w-[80px] font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4 pl-4">NO.</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">NAME</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">DESCRIPTION</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider w-[180px] py-4">STATUS</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider text-right w-[120px] py-4 pr-6">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentData.map((type, idx) => (
                    <TableRow key={type.id} className="border-b border-slate-50 hover:bg-background/80 transition-colors">
                      <TableCell className="text-sm text-muted-foreground font-medium py-3 pl-4">{(page - 1) * pageSize + idx + 1}</TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#0aa9ad]/15 bg-[#0aa9ad]/10 text-[#0aa9ad]">
                            <Tags className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-sm font-semibold text-slate-700">{type.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className="text-sm text-muted-foreground font-medium max-w-[360px] truncate block">{type.description || "N/A"}</span>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={type.status === "active"}
                            disabled={statusMutation.isPending}
                            onCheckedChange={(checked) => statusMutation.mutate({ id: type.id, status: checked ? "active" : "inactive" })}
                          />
                          {type.status === "active" ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#ecfdf5] text-[#10b981] uppercase tracking-wide">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-muted text-muted-foreground uppercase tracking-wide">
                              Inactive
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-3 pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className={`h-7 w-7 rounded shadow-sm transition-colors ${type.status === "active" ? "border-amber-200 text-amber-500 hover:bg-amber-50 hover:text-amber-600" : "border-emerald-200 text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600"}`}
                            title={type.status === "active" ? "Suspend" : "Activate"}
                            onClick={() => setTypeToToggleStatus(type)}
                          >
                            {type.status === "active" ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                          </Button>
                          <Button variant="outline" size="icon" className="h-7 w-7 rounded border-blue-200 text-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-colors shadow-sm" title="Edit" onClick={() => navigate(`/dashboard/organization-types/edit/${type.id}`)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-7 w-7 rounded border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm" title="Delete" onClick={() => setTypeToDelete(type)}>
                            <Trash2 className="h-3.5 w-3.5" />
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
                <Tags className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">No organization types found</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md text-center">We couldn't find any organization types matching your current search or filter criteria. Try adjusting them to see more results.</p>
              <Button className="bg-[#5b3bf7] hover:bg-[#4a2ee0] text-white shadow-sm px-6 h-10" onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}>
                <FilterX className="w-4 h-4 mr-2" /> Clear All Filters
              </Button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between mt-5 gap-4">
            <div className="text-sm text-muted-foreground font-medium">
              Showing {(page - 1) * pageSize + (currentData.length > 0 ? 1 : 0)} to {(page - 1) * pageSize + currentData.length} of {filteredTypes.length} entries
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

        {/* Removed Create/Edit Dialog */}

        {/* Single-row Delete Confirmation */}
        <AlertDialog open={!!typeToDelete} onOpenChange={(open) => !open && setTypeToDelete(null)}>
          <AlertDialogContent className="rounded-2xl max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-black text-foreground">Delete Organization Type</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground font-medium mt-2">
                Are you absolutely sure you want to permanently delete{" "}
                <span className="font-bold text-foreground">
                  {typeToDelete?.name}
                </span>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6 gap-3 sm:gap-0">
              <AlertDialogCancel className="rounded-xl border-border font-bold h-11 hover:bg-muted">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  if (typeToDelete) deleteMutation.mutate(typeToDelete.id);
                }}
                disabled={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700 rounded-xl font-bold h-11"
              >
                {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                {deleteMutation.isPending ? "Deleting..." : "Delete Type"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Status Toggle Confirmation */}
        <AlertDialog open={!!typeToToggleStatus} onOpenChange={(open) => !open && setTypeToToggleStatus(null)}>
          <AlertDialogContent className="rounded-2xl max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-black text-foreground">
                {typeToToggleStatus?.status === "active" ? "Suspend Type" : "Activate Type"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground font-medium mt-2">
                Are you sure you want to {typeToToggleStatus?.status === "active" ? "suspend" : "activate"}{" "}
                <span className="font-bold text-foreground">
                  {typeToToggleStatus?.name}
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
                  if (typeToToggleStatus) {
                    statusMutation.mutate({ 
                      id: typeToToggleStatus.id, 
                      status: typeToToggleStatus.status === "active" ? "inactive" : "active" 
                    });
                  }
                }}
                className={`${
                  typeToToggleStatus?.status === "active"
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-emerald-500 hover:bg-emerald-600"
                } text-white rounded-xl font-bold h-11`}
                disabled={statusMutation.isPending}
              >
                {statusMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
                 typeToToggleStatus?.status === "active" ? <UserX className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />}
                {statusMutation.isPending ? "Updating..." : "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
