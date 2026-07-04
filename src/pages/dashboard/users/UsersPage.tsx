import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { api } from "@/lib/api";
import { fetchRoleOptions, getRoleLabel } from "@/lib/roleDirectory";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Edit, Plus, ShieldAlert, ShieldCheck, Trash2, UserCog, Users, Loader2, UserX, UserCheck, MoreVertical, Activity } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { AdvancedDataTable, type BulkActionOption } from "@/components/shared/AdvancedDataTable";
import { TableSummaryCards } from "@/components/shared/TableSummaryCards";

export default function UsersPage() {
  const { success, error } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAgrovetOrg } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [userToDelete, setUserToDelete] = useState<any>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>("/api/users");
      return res.data || [];
    },
  });

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
      return roleNameById.get(String(roleId)) as string;
    }
    return u.role?.name || u.role || "";
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
      const currentStatus = u.status === "active" || u.is_active || u.isActive;
      const newStatus = currentStatus ? "inactive" : "active";
      await api.put(`/api/users`, { id: u.id, status: newStatus, action: "UPDATE_STATUS" });
    },
    onSuccess: () => {
      success("Success", "User status updated successfully.");
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

  const bulkActions: BulkActionOption[] = [
    { label: "Activate", status: "ACTIVE", icon: UserCheck },
    { label: "Suspend", status: "SUSPENDED", icon: UserX, confirmMessage: "This will suspend access for the selected users." },
    { label: "Delete", icon: Trash2, variant: "destructive", confirmMessage: "This will permanently delete the selected users. This action cannot be undone." },
  ];

  const handleBulkAction = async (action: BulkActionOption, ids: string[]) => {
    const body = action.label === "Delete"
      ? { action: "DELETE", ids }
      : { action: "STATUS", ids, status: action.status };
    try {
      const res = await api.post<{ success: boolean; data: { total: number; succeeded: number; failed: number } }>(
        "/api/agrovet/bulk/users",
        body
      );
      const { succeeded = 0, failed = 0 } = res.data || {};
      queryClient.invalidateQueries({ queryKey: ["users"] });
      if (failed > 0) {
        error("Partially completed", `${succeeded} succeeded, ${failed} failed.`);
      } else {
        success("Success", `${action.label} applied to ${succeeded} user${succeeded === 1 ? "" : "s"}.`);
      }
    } catch (err: any) {
      error("Error", err.message || `Failed to ${action.label.toLowerCase()} selected users`);
    }
  };

  const filteredUsers = users.filter((u: any) => {
    const roleName = resolveRoleName(u);
    return (
      `${u.firstName || u.first_name || ""} ${u.lastName || u.last_name || ""}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (roleName && roleName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  // Calculate Summary Metrics
  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.status === "active" || u.is_active || u.isActive).length;
  const inactiveUsers = totalUsers - activeUsers;
  const adminUsers = users.filter(u => {
    const roleSlug = resolveRoleName(u).toLowerCase();
    return roleSlug.includes("admin") || roleSlug.includes("owner");
  }).length;

  const getRoleBadge = (role: string) => {
    const label = getRoleLabel(role);
    const slug = role?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
    switch (slug) {
      case "org_owner":
      case "super_admin":
      case "admin":
        return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-none flex gap-1 items-center w-max"><ShieldAlert size={12}/> {label}</Badge>;
      case "accountant":
      case "finance_manager":
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none flex gap-1 items-center w-max"><ShieldCheck size={12}/> {label}</Badge>;
      case "cashier_agro":
      case "cashier_vet":
      case "cashier":
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none flex gap-1 items-center w-max"><UserCog size={12}/> {label}</Badge>;
      default:
        return <Badge variant="outline" className="text-slate-600 w-max">{label || "User"}</Badge>;
    }
  };

  const getStatusBadge = (status: string, isActive?: boolean) => {
    if (status === "active" || isActive === true) return <Badge className="bg-green-100 text-green-700 border-green-200 w-max">Active</Badge>;
    return <Badge variant="secondary" className="bg-slate-100 text-slate-500 w-max">Inactive</Badge>;
  };

  const exportColumns = [
    { key: "fullName", label: "Full Name" },
    { key: "email", label: "Email Address" },
    { key: "role", label: "Role" },
    { key: "branch", label: "Branch/Department" },
    { key: "status", label: "Status" }
  ];

  // Map data for export so computed fields exist on the object
  const exportData = filteredUsers.map(u => ({
    fullName: `${u.firstName || u.first_name || ""} ${u.lastName || u.last_name || ""}`,
    email: u.email,
    role: getRoleLabel(resolveRoleName(u)),
    branch: u.branch || "Main Branch",
    status: (u.status === "active" || u.is_active || u.isActive) ? "Active" : "Inactive"
  }));

  return (
    <div className="p-6 max-w-[1600px] mx-auto bg-slate-50/30 min-h-screen">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900">User Management</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Manage staff access and permissions</p>
        </div>

        <Button onClick={() => navigate("/dashboard/users/add")} className="bg-[#0aa9ad] hover:bg-[#088c90] text-white rounded-xl shadow-sm font-bold h-11 px-6">
          <Plus className="mr-2 h-4 w-4" /> Add New User
        </Button>
      </div>

      <TableSummaryCards 
        cards={[
          { title: "Total Staff", value: totalUsers, icon: Users, color: "blue" },
          { title: "Active Accounts", value: activeUsers, icon: Activity, color: "emerald" },
          { title: "Inactive/Suspended", value: inactiveUsers, icon: UserX, color: "rose" },
          { title: "Administrators", value: adminUsers, icon: ShieldAlert, color: "purple" }
        ]} 
      />

      <AdvancedDataTable
        title="Staff Directory"
        description="A complete list of all users in your organization."
        data={exportData}
        exportColumns={exportColumns}
        exportFilename={`Users_Export_${new Date().toISOString().split('T')[0]}`}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by name, email, or role..."
        isLoading={isLoading}
        getRowId={isAgrovetOrg ? (u: any) => String(filteredUsers.find(fu => fu.email === u.email)?.id ?? u.email) : undefined}
        bulkActions={isAgrovetOrg ? bulkActions : undefined}
        onBulkAction={isAgrovetOrg ? handleBulkAction : undefined}
        renderTable={(paginatedData, selection) => (
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-slate-100">
                {selection && (
                  <TableHead className="w-10 pl-5">
                    <Checkbox
                      checked={paginatedData.length > 0 && paginatedData.every((u: any, i: number) => {
                        const orig = filteredUsers.find(fu => fu.email === u.email) || filteredUsers[i];
                        return selection.isSelected(String(orig?.id ?? u.email));
                      })}
                      onCheckedChange={() =>
                        selection.toggleAll(
                          paginatedData.map((u: any, i: number) => {
                            const orig = filteredUsers.find(fu => fu.email === u.email) || filteredUsers[i];
                            return String(orig?.id ?? u.email);
                          })
                        )
                      }
                      aria-label="Select all"
                    />
                  </TableHead>
                )}
                <TableHead className="font-bold text-slate-600">User</TableHead>
                <TableHead className="font-bold text-slate-600">Role</TableHead>
                <TableHead className="font-bold text-slate-600">Branch</TableHead>
                <TableHead className="font-bold text-slate-600">Status</TableHead>
                <TableHead className="text-right font-bold text-slate-600 pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map((u: any, index: number) => {
                  // We need the original user object for mutations (IDs).
                  // We map `paginatedData` back to `filteredUsers` using the index.
                  // Since `exportData` is mapped 1:1 from `filteredUsers`, we find the true index via pagination slice offset or just map it directly.
                  // Better approach: pass `filteredUsers` to `AdvancedDataTable` and do the mapping inside `renderTable` instead.
                  // Let's find the original user object by matching email (assuming unique) or full name.
                  const originalUser = filteredUsers.find(fu => fu.email === u.email) || filteredUsers[index];
                  const rowId = String(originalUser?.id ?? u.email);

                  return (
                    <TableRow key={originalUser.id || index} className="hover:bg-slate-50/50 border-slate-100 transition-colors">
                      {selection && (
                        <TableCell className="pl-5">
                          <Checkbox
                            checked={selection.isSelected(rowId)}
                            onCheckedChange={() => selection.toggle(rowId)}
                            aria-label={`Select ${u.fullName}`}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-medium py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold uppercase">
                            {u.fullName.substring(0, 2)}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-slate-900 font-bold">{u.fullName}</span>
                            <span className="text-xs text-slate-500 font-medium">{u.email}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(originalUser.role_id ?? originalUser.role?.name ?? originalUser.role)}</TableCell>
                      <TableCell className="text-slate-600 font-medium">{u.branch}</TableCell>
                      <TableCell>{getStatusBadge(originalUser.status, originalUser.is_active || originalUser.isActive)}</TableCell>
                      <TableCell className="text-right pr-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg">
                              <span className="sr-only">Open menu</span>
                              <MoreVertical className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 rounded-xl p-2 shadow-lg border-slate-100">
                            <DropdownMenuLabel className="text-xs font-bold text-slate-400 uppercase">Actions</DropdownMenuLabel>
                            <DropdownMenuSeparator className="bg-slate-100" />
                            <DropdownMenuItem 
                              onClick={() => navigate(`/dashboard/users/edit/${originalUser.id}`)}
                              className="rounded-lg cursor-pointer font-medium"
                            >
                              <Edit className="mr-2 h-4 w-4 text-blue-500" /> Edit Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => toggleStatusMutation.mutate(originalUser)}
                              disabled={toggleStatusMutation.isPending}
                              className="rounded-lg cursor-pointer font-medium"
                            >
                              {originalUser.status === "active" || originalUser.is_active || originalUser.isActive ? (
                                <><UserX className="mr-2 h-4 w-4 text-amber-500" /> Suspend User</>
                              ) : (
                                <><UserCheck className="mr-2 h-4 w-4 text-emerald-500" /> Activate User</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-slate-100" />
                            <DropdownMenuItem 
                              onClick={() => setUserToDelete(originalUser)}
                              className="rounded-lg cursor-pointer font-medium text-red-600 hover:text-red-700 hover:bg-red-50 focus:text-red-700 focus:bg-red-50"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={selection ? 6 : 5} className="h-32 text-center text-slate-500 font-medium">
                    No users found matching your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      />

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black text-slate-900">Delete User Account</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-medium mt-2">
              Are you absolutely sure you want to permanently delete{" "}
              <span className="font-bold text-slate-900">
                {userToDelete?.firstName || userToDelete?.first_name} {userToDelete?.lastName || userToDelete?.last_name}
              </span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3 sm:gap-0">
            <AlertDialogCancel className="rounded-xl border-slate-200 font-bold h-11 hover:bg-slate-50">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault(); // Prevent closing until mutation is done if desired
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
    </div>
  );
}

