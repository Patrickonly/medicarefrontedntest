import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { fetchRoleOptions, getRoleLabel } from "@/lib/roleDirectory";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Search, UserCheck, UserX, ShieldAlert, Edit, Trash2, FilterX, Tags, Users, ShieldCheck, UserCog, MoreVertical, RefreshCcw, Building2 } from "lucide-react";
import { format } from "date-fns";
import { StatCard } from "@/components/shared/StatCard";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { StatCardsSkeleton } from "@/components/shared/StatCardsSkeleton";
import { TableRowsSkeleton } from "@/components/shared/TableRowsSkeleton";

export default function UsersPage() {
  const { success, error } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAgrovetOrg } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [userToToggleStatus, setUserToToggleStatus] = useState<any>(null);

  const { data: users = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>("/api/users");
      return res.data || [];
    },
  });

  const isDataLoading = isLoading || isRefetching;

  const { data: roleOptions = [] } = useQuery({
    queryKey: ["roleOptions"],
    queryFn: fetchRoleOptions,
  });

  const roleNameById = useMemo(() => {
    const map = new Map<string, string>();
    roleOptions.forEach((r) => map.set(String(r.id), r.name));
    return map;
  }, [roleOptions]);

  const resolveRoleName = (u: any): string => {
    const roleId = u.role_id ?? u.roleId ?? u.role?.id;
    if (roleId !== undefined && roleId !== null && roleNameById.has(String(roleId))) {
      return (roleNameById.get(String(roleId)) as string) ?? u.role?.name ?? u.role ?? "";
    }
    return u.role?.name || u.role || "";
  };

  // Backend status is the Prisma UserStatus enum ("ACTIVE" | "INACTIVE" | "SUSPENDED" |
  // "PENDING_ONBOARDING"), but older records/flows may send lowercase or a boolean
  // flag instead - normalize case so the badge reflects the real status either way.
  // No status at all defaults to Active (matches UserService.createUser).
  const isActiveUser = (u: any) => {
    if (u.status !== undefined && u.status !== null && u.status !== "") {
      return String(u.status).toUpperCase() === "ACTIVE";
    }
    return u.is_active ?? u.isActive ?? true;
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/users?id=${id}`);
    },
    onSuccess: () => {
      success("Success", "User deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setUserToDelete(null);
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to delete user");
      setUserToDelete(null);
    }
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async (u: any) => {
      const userId = u?.id;
      if (!userId) {
        throw new Error("Cannot update status: this user record has no id.");
      }
      const newStatus = isActiveUser(u) ? "inactive" : "active";
      await api.put(`/api/users`, { id: userId, status: newStatus, action: "UPDATE_STATUS" });
      return newStatus;
    },
    onSuccess: (newStatus) => {
      success("Success", `User is now ${newStatus === "active" ? "Active" : "Inactive"}.`);
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to update status");
    }
  });

  const handleDeleteUser = () => {
    if (!userToDelete) return;
    deleteMutation.mutate(userToDelete.id);
  };

  const fullNameOf = (u: any) => `${u.firstName || u.first_name || ""} ${u.lastName || u.last_name || ""}`.trim();

  const filteredUsers = users.filter((u: any) => {
    const roleName = resolveRoleName(u);
    const matchesSearch =
      fullNameOf(u).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (roleName && roleName.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" ? true : statusFilter === "active" ? isActiveUser(u) : !isActiveUser(u);
    return matchesSearch && matchesStatus;
  });

  // Calculate Summary Metrics
  const totalUsers = users.length;
  const activeUsers = users.filter(isActiveUser).length;
  const inactiveUsers = totalUsers - activeUsers;
  const adminUsers = users.filter((u) => {
    const roleSlug = resolveRoleName(u).toLowerCase();
    return roleSlug.includes("admin") || roleSlug.includes("owner");
  }).length;

  const currentData = filteredUsers.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredUsers.length / pageSize);

  const getRoleBadge = (role: string) => {
    const label = getRoleLabel(role);
    const slug = role?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    switch (slug) {
      case "org_owner":
      case "super_admin":
      case "admin":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-100 text-purple-700 uppercase tracking-wide"><ShieldAlert size={12} /> {label}</span>;
      case "accountant":
      case "finance_manager":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-100 text-blue-700 uppercase tracking-wide"><ShieldCheck size={12} /> {label}</span>;
      case "cashier_agro":
      case "cashier_vet":
      case "cashier":
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#ecfdf5] text-[#10b981] uppercase tracking-wide"><UserCog size={12} /> {label}</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-muted text-muted-foreground uppercase tracking-wide">{label || "User"}</span>;
    }
  };

  const orgInitials = (name?: string) =>
    String(name ?? "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

  return (
    <div className="min-h-screen bg-muted font-sans pb-10">
      <div className="p-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-row justify-between items-center mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-[#1e293b] text-3xl font-bold tracking-tight">User Management</h1>
            <p className="text-muted-foreground text-sm mt-1 font-medium">Manage staff access and permissions</p>
          </div>

          <div className="flex items-center gap-2 bg-card px-3 py-1.5 rounded-xl border border-border shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-2 ml-1">Quick Actions:</span>
            <Button variant="ghost" size="sm" className="h-8 font-medium text-muted-foreground hover:bg-muted" onClick={() => navigate("/dashboard/organizations")}>
              Organizations
            </Button>
            <Button variant="ghost" size="sm" className="h-8 font-medium text-muted-foreground hover:bg-muted" onClick={() => navigate("/dashboard/branches")}>
              Branches
            </Button>
            <Button variant="ghost" size="sm" className="h-8 font-medium text-[#5b3bf7] bg-[#5b3bf7]/10 hover:bg-[#5b3bf7]/20" onClick={() => navigate("/dashboard/users")}>
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
            icon={Users}
            label="Total Staff"
            value={totalUsers}
            colorClass="bg-[#0aa9ad] text-white"
          />
          <StatCard
            icon={UserCheck}
            label="Active Accounts"
            value={activeUsers}
            colorClass="bg-[#22c55e] text-white"
          />
          <StatCard
            icon={UserX}
            label="Inactive/Suspended"
            value={inactiveUsers}
            colorClass="bg-[#f59e0b] text-white"
          />
          <StatCard
            icon={ShieldAlert}
            label="Administrators"
            value={adminUsers}
            colorClass="bg-[#6366f1] text-white"
          />
        </div>
        )}

        {/* Toolbar 1 */}
        <div className="flex flex-wrap items-center gap-4 bg-card rounded-t-xl border border-b-0 border-border p-4 shadow-sm">
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or role..."
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
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-bold text-slate-700">Total Staff: {filteredUsers.length}</span>
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
          <Button size="sm" className="h-9 px-4 bg-[#5b3bf7] hover:bg-[#4a2ee0] text-white rounded-lg font-medium transition-colors" onClick={() => navigate("/dashboard/users/add")}>
            <Plus className="w-4 h-4 mr-2" /> Add New User
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
              <Table className="min-w-[800px]">
                <TableHeader className="bg-background/50">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="w-[80px] font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4 pl-4">NO.</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">USER</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">ROLE</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider w-[150px] py-4">STATUS</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider text-right w-[100px] py-4 pr-6">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRowsSkeleton columns={["text", "avatar", "badge", "badge", "actions"]} />
                </TableBody>
              </Table>
            </div>
          ) : currentData.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table className="min-w-[800px]">
                <TableHeader className="bg-background/50">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="w-[80px] font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4 pl-4">NO.</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">USER</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">ROLE</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider w-[150px] py-4">STATUS</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider text-right w-[100px] py-4 pr-6">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentData.map((u: any, idx: number) => {
                    const name = fullNameOf(u);
                    return (
                      <TableRow key={u.id || idx} className="border-b border-slate-50 hover:bg-background/80 transition-colors">
                        <TableCell className="text-sm text-muted-foreground font-medium py-3 pl-4">{(page - 1) * pageSize + idx + 1}</TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#0aa9ad]/15 bg-[#0aa9ad]/10 text-xs font-black uppercase text-[#0aa9ad]">
                              {orgInitials(name)}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-slate-700">{name}</span>
                              <span className="text-xs text-muted-foreground">{u.email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">{getRoleBadge(resolveRoleName(u))}</TableCell>
                        <TableCell className="py-3">
                          {isActiveUser(u) ? (
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="icon" className="h-7 w-7 rounded border-border text-muted-foreground hover:bg-muted transition-colors shadow-sm">
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl p-2 shadow-lg border-border">
                              <DropdownMenuLabel className="text-xs font-bold text-muted-foreground uppercase">Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator className="bg-muted" />
                              <DropdownMenuItem onClick={() => navigate(`/dashboard/users/edit/${u.id}`)} className="rounded-lg cursor-pointer font-medium">
                                <Edit className="mr-2 h-4 w-4 text-blue-500" /> Edit Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setUserToToggleStatus(u)} className="rounded-lg cursor-pointer font-medium">
                                {isActiveUser(u) ? (
                                  <><UserX className="mr-2 h-4 w-4 text-amber-500" /> Suspend User</>
                                ) : (
                                  <><UserCheck className="mr-2 h-4 w-4 text-emerald-500" /> Activate User</>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-muted" />
                              <DropdownMenuItem
                                onClick={() => setUserToDelete(u)}
                                className="rounded-lg cursor-pointer font-medium text-red-600 hover:text-red-700 hover:bg-red-50 focus:text-red-700 focus:bg-red-50"
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-background/50 rounded-xl border border-dashed border-border mt-2 mb-4 mx-2">
              <div className="bg-card w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-sm border border-border">
                <Building2 className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">No users found</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md text-center">We couldn't find any users matching your current search or filter criteria. Try adjusting them to see more results.</p>
              <Button className="bg-[#5b3bf7] hover:bg-[#4a2ee0] text-white shadow-sm px-6 h-10" onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}>
                <FilterX className="w-4 h-4 mr-2" /> Clear All Filters
              </Button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between mt-5 gap-4">
            <div className="text-sm text-muted-foreground font-medium">
              Showing {(page - 1) * pageSize + (currentData.length > 0 ? 1 : 0)} to {(page - 1) * pageSize + currentData.length} of {filteredUsers.length} entries
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

        <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
          <AlertDialogContent className="rounded-2xl max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-black text-foreground">Delete User Account</AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground font-medium mt-2">
                Are you absolutely sure you want to permanently delete{" "}
                <span className="font-bold text-foreground">
                  {userToDelete?.firstName || userToDelete?.first_name} {userToDelete?.lastName || userToDelete?.last_name}
                </span>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-6 gap-3 sm:gap-0">
              <AlertDialogCancel className="rounded-xl border-border font-bold h-11 hover:bg-muted">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDeleteUser();
                }}
                className="bg-red-600 hover:bg-red-700 rounded-xl font-bold h-11"
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                {deleteMutation.isPending ? "Deleting..." : "Delete Account"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!userToToggleStatus} onOpenChange={(open) => !open && setUserToToggleStatus(null)}>
          <AlertDialogContent className="rounded-2xl max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-black text-foreground">
                {userToToggleStatus && isActiveUser(userToToggleStatus) ? "Suspend User" : "Activate User"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground font-medium mt-2">
                Are you sure you want to {userToToggleStatus && isActiveUser(userToToggleStatus) ? "suspend" : "activate"}{" "}
                <span className="font-bold text-foreground">
                  {userToToggleStatus && fullNameOf(userToToggleStatus)}
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
                  if (userToToggleStatus) {
                    toggleStatusMutation.mutate(userToToggleStatus);
                    setUserToToggleStatus(null);
                  }
                }}
                className={`${
                  userToToggleStatus && isActiveUser(userToToggleStatus)
                    ? "bg-amber-500 hover:bg-amber-600"
                    : "bg-emerald-500 hover:bg-emerald-600"
                } text-white rounded-xl font-bold h-11`}
                disabled={toggleStatusMutation.isPending}
              >
                {toggleStatusMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 
                 userToToggleStatus && isActiveUser(userToToggleStatus) ? <UserX className="mr-2 h-4 w-4" /> : <UserCheck className="mr-2 h-4 w-4" />}
                {toggleStatusMutation.isPending ? "Updating..." : "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
