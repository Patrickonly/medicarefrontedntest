import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Plus, Search, Loader2, Save, KeyRound, Users2, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCardsSkeleton } from "@/components/shared/StatCardsSkeleton";
import { StatCard } from "@/components/shared/StatCard";

// Stable reference so the "no data yet" default doesn't create a new array
// every render - a fresh `[]` literal here would re-trigger effects that
// depend on it (e.g. the editedPermissions sync below) on every render,
// causing an infinite update loop while no role is selected.
const EMPTY_LIST: any[] = [];

export default function RolesPermissionsPage() {
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<any>(null);

  // Removed Create role dialog state since we use a dedicated page now.

  const {
    data: roles = EMPTY_LIST,
    isLoading: rolesLoading,
    isError: rolesError,
    error: rolesErrorObj,
  } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>("/api/roles");
      return res.data || [];
    },
  });

  const {
    data: permissionsList = EMPTY_LIST,
    isLoading: permsLoading,
    isError: permsError,
    error: permsErrorObj,
  } = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>("/api/permissions");
      return res.data || [];
    },
  });

  const {
    data: rolePermissions = EMPTY_LIST,
    isLoading: rolePermsLoading,
    isError: rolePermsError,
    error: rolePermsErrorObj,
  } = useQuery({
    queryKey: ["role_permissions", selectedRole?.id],
    queryFn: async () => {
      if (!selectedRole?.id) return [];
      const res = await api.get<{ success: boolean; data: any[] }>(`/api/roles?action=PERMISSIONS&roleId=${selectedRole.id}`);
      return res.data || [];
    },
    enabled: !!selectedRole?.id,
  });

  // Local state for toggling permissions before saving
  const [editedPermissions, setEditedPermissions] = useState<Record<string, boolean>>({});

  // Surface fetch failures (e.g. insufficient privileges) as toasts instead of
  // failing silently - these are permission/data errors, not session expiry,
  // so they should never redirect to /login.
  useEffect(() => {
    if (rolesError) error("Error", (rolesErrorObj as any)?.message || "Failed to load roles");
  }, [rolesError, rolesErrorObj]);

  useEffect(() => {
    if (permsError) error("Error", (permsErrorObj as any)?.message || "Failed to load permissions");
  }, [permsError, permsErrorObj]);

  useEffect(() => {
    if (rolePermsError) error("Error", (rolePermsErrorObj as any)?.message || "Failed to load role permissions");
  }, [rolePermsError, rolePermsErrorObj]);

  useEffect(() => {
    if (rolePermissions) {
      const permsMap: Record<string, boolean> = {};
      // rolePermissions is an array of RolePermission rows: { id, permission_id,
      // permission: {...} }. `id` is the junction row's own id, NOT the
      // permission's id - keying off it here silently corrupts the save
      // (it sends junction-row ids back as if they were permission ids).
      rolePermissions.forEach((p: any) => {
        const pId = typeof p === 'string' ? p : p.permission_id ?? p.permission?.id ?? p.id;
        if (pId) permsMap[pId] = true;
      });
      setEditedPermissions(permsMap);
    }
  }, [rolePermissions, selectedRole]);

  // Removed createRoleMutation as it's now handled in AddRolePage.tsx

  const updatePermissionsMutation = useMutation({
    mutationFn: async (data: any) => {
      return await api.post("/api/roles", { ...data, action: "UPDATE_PERMISSIONS" });
    },
    onSuccess: () => {
      success("Success", "Role permissions updated successfully");
      queryClient.invalidateQueries({ queryKey: ["role_permissions", selectedRole?.id] });
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to update permissions");
    },
  });

  // Removed handleCreateRole as it's moved to AddRolePage.tsx

  const handleSavePermissions = () => {
    if (!selectedRole) return;
    const permissionsToSave = Object.keys(editedPermissions).filter(k => editedPermissions[k]);
    updatePermissionsMutation.mutate({
      roleId: selectedRole.id,
      permissionIds: permissionsToSave,
    });
  };

  const togglePermission = (permId: string) => {
    setEditedPermissions(prev => ({
      ...prev,
      [permId]: !prev[permId]
    }));
  };

  const filteredRoles = roles.filter((role: any) =>
    role.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const grantedCount = Object.values(editedPermissions).filter(Boolean).length;

  return (
    <div className="min-h-screen bg-muted font-sans pb-10">
      <div className="p-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-row justify-between items-center mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-[#1e293b] text-3xl font-bold tracking-tight">Roles &amp; Permissions</h1>
            <p className="text-muted-foreground text-sm mt-1 font-medium">Manage user roles and configure their access levels</p>
          </div>

          <div className="flex items-center gap-2 bg-card px-3 py-1.5 rounded-xl border border-border shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-2 ml-1">Quick Actions:</span>
            <Button variant="ghost" size="sm" className="h-8 font-medium text-muted-foreground hover:bg-muted" onClick={() => navigate("/dashboard/organizations")}>
              Organizations
            </Button>
            <Button variant="ghost" size="sm" className="h-8 font-medium text-muted-foreground hover:bg-muted" onClick={() => navigate("/dashboard/users")}>
              Users
            </Button>
            <Button variant="ghost" size="sm" className="h-8 font-medium text-[#5b3bf7] bg-[#5b3bf7]/10 hover:bg-[#5b3bf7]/20" onClick={() => navigate("/dashboard/roles-permissions")}>
              Roles
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        {rolesLoading || permsLoading ? <StatCardsSkeleton count={3} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6" /> : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            icon={ShieldCheck}
            label="Total Roles"
            value={roles.length}
            colorClass="bg-[#0aa9ad] text-white"
          />
          <StatCard
            icon={KeyRound}
            label="Total Permissions"
            value={permissionsList.length}
            colorClass="bg-[#6366f1] text-white"
          />
          <StatCard
            icon={ListChecks}
            label={selectedRole ? `${selectedRole.name} Grants` : "Selected Role Grants"}
            value={selectedRole ? grantedCount : 0}
            colorClass="bg-[#22c55e] text-white"
          />
        </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-4 bg-card rounded-xl border border-border p-4 shadow-sm mb-6">
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search roles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 border-border rounded-lg text-sm bg-background/50 focus:bg-card transition-colors"
            />
          </div>
          <div className="flex items-center gap-2 bg-muted border border-border h-10 px-4 rounded-lg">
            <Users2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-bold text-slate-700">Roles: {filteredRoles.length}</span>
          </div>
          <Button size="sm" className="h-9 px-4 bg-[#5b3bf7] hover:bg-[#4a2ee0] text-white rounded-lg font-medium transition-colors" onClick={() => navigate("/dashboard/roles-permissions/add")}>
            <Plus className="w-4 h-4 mr-2" /> Create Role
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Roles List */}
          <Card className="border-border shadow-sm rounded-xl col-span-1 h-[calc(100vh-360px)] min-h-[420px] flex flex-col">
            <CardHeader className="border-b border-border py-4">
              <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#5b3bf7]" />
                Roles
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 overflow-y-auto flex-1">
              {rolesLoading ? (
                <div className="divide-y divide-slate-100">
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="p-4 border-l-4 border-transparent space-y-2">
                      <Skeleton className="h-3.5 w-28" />
                      <Skeleton className="h-2.5 w-40" />
                    </div>
                  ))}
                </div>
              ) : filteredRoles.length > 0 ? (
                <ul className="divide-y divide-slate-100">
                  {filteredRoles.map((role: any) => (
                    <li key={role.id}>
                      <div className="flex items-center justify-between p-4 hover:bg-muted transition-colors">
                        <button
                          onClick={() => setSelectedRole(role)}
                          className={`flex-1 text-left ${selectedRole?.id === role.id ? "bg-[#5b3bf7]/5 border-l-4 border-[#5b3bf7]" : "border-l-4 border-transparent"}`}
                        >
                          <div className="pl-3">
                            <p className="font-semibold text-slate-700 capitalize">{role.name}</p>
                            <p className="text-xs text-muted-foreground mt-1">{role.description || "System Role"}</p>
                          </div>
                        </button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/dashboard/roles-permissions/edit/${role.id}`)}
                          className="ml-2 rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50"
                        >
                          Edit Details
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-8 text-center text-muted-foreground">
                  No roles found.
                </div>
              )}
            </CardContent>
          </Card>

          {/* Permissions Editor */}
          <Card className="border-border shadow-sm rounded-xl col-span-1 lg:col-span-2 h-[calc(100vh-360px)] min-h-[420px] flex flex-col">
            {selectedRole ? (
              <>
                <CardHeader className="border-b border-border py-4 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-slate-700 capitalize">{selectedRole.name} Permissions</CardTitle>
                    <CardDescription>Configure what users with this role can do.</CardDescription>
                  </div>
                  <Button
                    onClick={handleSavePermissions}
                    disabled={updatePermissionsMutation.isPending}
                    className="bg-[#5b3bf7] hover:bg-[#4a2ee0] text-white rounded-lg font-medium"
                  >
                    {updatePermissionsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Permissions
                  </Button>
                </CardHeader>
                <CardContent className="p-6 overflow-y-auto flex-1">
                  {permsLoading || rolePermsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="flex items-start space-x-3 p-3 border border-border rounded-xl">
                          <Skeleton className="mt-1 h-4 w-4 rounded" />
                          <div className="flex-1 space-y-1.5">
                            <Skeleton className="h-3.5 w-32" />
                            <Skeleton className="h-2.5 w-full max-w-[180px]" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {permissionsList.map((perm: any) => {
                        // Permissions come back as { id, action, subject, description } -
                        // there is no `name` field, so derive both the key and the
                        // display label from action/subject (falling back to name
                        // in case a plain string or differently-shaped record shows up).
                        const pId = typeof perm === 'string' ? perm : perm.id ?? perm.name ?? `${perm.action}_${perm.subject}`;
                        const pName = typeof perm === 'string'
                          ? perm
                          : perm.name ?? [perm.action, perm.subject].filter(Boolean).join(' ') ?? 'Permission';
                        return (
                          <div key={pId} className="flex items-start space-x-3 p-3 border border-border rounded-xl hover:bg-muted transition-colors">
                            <Checkbox
                              id={`perm-${pId}`}
                              checked={!!editedPermissions[pId]}
                              onCheckedChange={() => togglePermission(pId)}
                              className="mt-1 data-[state=checked]:bg-[#5b3bf7] data-[state=checked]:border-[#5b3bf7]"
                            />
                            <div className="grid gap-1.5 leading-none">
                              <label
                                htmlFor={`perm-${pId}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground cursor-pointer capitalize"
                              >
                                {pName.replace(/_/g, ' ')}
                              </label>
                              {perm.description && (
                                <p className="text-xs text-muted-foreground">
                                  {perm.description}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                      {permissionsList.length === 0 && (
                        <p className="text-muted-foreground">No permissions available in the system.</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-muted-foreground">
                <ShieldCheck className="h-16 w-16 text-slate-200 mb-4" />
                <p className="text-lg font-medium">Select a role to edit permissions</p>
                <p className="text-sm mt-1">Choose a role from the left sidebar to view and modify its access levels.</p>
              </div>
            )}
          </Card>
        </div>

        {/* Removed Create Role Dialog */}
      </div>
    </div>
  );
}
