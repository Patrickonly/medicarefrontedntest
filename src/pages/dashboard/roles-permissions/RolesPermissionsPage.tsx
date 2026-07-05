import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Plus, Search, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

// Stable reference so the "no data yet" default doesn't create a new array
// every render - a fresh `[]` literal here would re-trigger effects that
// depend on it (e.g. the editedPermissions sync below) on every render,
// causing an infinite update loop while no role is selected.
const EMPTY_LIST: any[] = [];

export default function RolesPermissionsPage() {
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRole, setSelectedRole] = useState<any>(null);
  
  // Create role dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDesc, setNewRoleDesc] = useState("");

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

  const createRoleMutation = useMutation({
    mutationFn: async (data: any) => {
      return await api.post("/api/roles", data);
    },
    onSuccess: () => {
      success("Success", "Role created successfully");
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      setIsDialogOpen(false);
      setNewRoleName("");
      setNewRoleDesc("");
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to create role");
    },
  });

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

  const handleCreateRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName) {
      error("Error", "Role name is required");
      return;
    }
    createRoleMutation.mutate({ name: newRoleName, description: newRoleDesc });
  };

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

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Roles & Permissions</h1>
          <p className="text-sm text-slate-500">Manage user roles and configure their access levels.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-[#0aa9ad] hover:bg-[#07969a] text-white">
          <Plus className="mr-2 h-4 w-4" /> Add Role
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles List */}
        <Card className="border-slate-200 shadow-sm rounded-2xl col-span-1 h-[calc(100vh-200px)] flex flex-col">
          <CardHeader className="border-b border-slate-100 pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-[#0aa9ad]" />
              Roles
            </CardTitle>
            <div className="relative mt-2 w-full">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search roles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 rounded-xl border-slate-200 bg-slate-50 focus-visible:ring-[#0aa9ad]"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto flex-1">
            {rolesLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : filteredRoles.length > 0 ? (
              <ul className="divide-y divide-slate-100">
                {filteredRoles.map((role: any) => (
                  <li key={role.id}>
                    <button
                      onClick={() => setSelectedRole(role)}
                      className={`w-full text-left p-4 hover:bg-slate-50 transition-colors ${selectedRole?.id === role.id ? 'bg-[#e8fbfb] border-l-4 border-[#0aa9ad]' : 'border-l-4 border-transparent'}`}
                    >
                      <p className="font-semibold text-slate-900 capitalize">{role.name}</p>
                      <p className="text-xs text-slate-500 mt-1">{role.description || "System Role"}</p>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-8 text-center text-slate-500">
                No roles found.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Permissions Editor */}
        <Card className="border-slate-200 shadow-sm rounded-2xl col-span-1 lg:col-span-2 h-[calc(100vh-200px)] flex flex-col">
          {selectedRole ? (
            <>
              <CardHeader className="border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold capitalize">{selectedRole.name} Permissions</CardTitle>
                  <CardDescription>Configure what users with this role can do.</CardDescription>
                </div>
                <Button 
                  onClick={handleSavePermissions}
                  disabled={updatePermissionsMutation.isPending}
                  className="bg-slate-900 hover:bg-slate-800 text-white"
                >
                  {updatePermissionsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Save Permissions
                </Button>
              </CardHeader>
              <CardContent className="p-6 overflow-y-auto flex-1">
                {permsLoading || rolePermsLoading ? (
                  <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
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
                        <div key={pId} className="flex items-start space-x-3 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                          <Checkbox 
                            id={`perm-${pId}`} 
                            checked={!!editedPermissions[pId]}
                            onCheckedChange={() => togglePermission(pId)}
                            className="mt-1 data-[state=checked]:bg-[#0aa9ad] data-[state=checked]:border-[#0aa9ad]"
                          />
                          <div className="grid gap-1.5 leading-none">
                            <label
                              htmlFor={`perm-${pId}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-slate-900 cursor-pointer capitalize"
                            >
                              {pName.replace(/_/g, ' ')}
                            </label>
                            {perm.description && (
                              <p className="text-xs text-slate-500">
                                {perm.description}
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    {permissionsList.length === 0 && (
                      <p className="text-slate-500">No permissions available in the system.</p>
                    )}
                  </div>
                )}
              </CardContent>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-500">
              <ShieldCheck className="h-16 w-16 text-slate-200 mb-4" />
              <p className="text-lg font-medium">Select a role to edit permissions</p>
              <p className="text-sm mt-1">Choose a role from the left sidebar to view and modify its access levels.</p>
            </div>
          )}
        </Card>
      </div>

      {/* Create Role Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>
              Define a new role. You can assign permissions to it after creation.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateRole} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name</Label>
              <Input
                id="name"
                placeholder="e.g. Finance Auditor"
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                className="rounded-xl border-slate-200"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description</Label>
              <Input
                id="desc"
                placeholder="Brief description..."
                value={newRoleDesc}
                onChange={(e) => setNewRoleDesc(e.target.value)}
                className="rounded-xl border-slate-200"
              />
            </div>
            
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={createRoleMutation.isPending} className="bg-[#0aa9ad] hover:bg-[#07969a] text-white rounded-xl">
                {createRoleMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Role"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
