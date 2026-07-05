import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api";
import { fetchRoleOptions } from "@/lib/roleDirectory";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, UserCog, Loader2, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function EditUserPage() {
  const { success, error } = useToast();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    roleId: "",
    phone: "",
  });

  const [editedPermissions, setEditedPermissions] = useState<Record<string, boolean>>({});

  const { data: user, isLoading } = useQuery({
    queryKey: ["user", id],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any }>(`/api/users/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const { data: roleOptions = [] } = useQuery({
    queryKey: ["roleOptions"],
    queryFn: fetchRoleOptions,
  });

  const { data: permissionsList = [], isLoading: permsLoading } = useQuery({
    queryKey: ["permissions"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>("/api/permissions");
      return res.data || [];
    },
  });

  const { data: userPermissions = [], isLoading: userPermsLoading } = useQuery({
    queryKey: ["user_permissions", id],
    queryFn: async () => {
      if (!id) return [];
      const res = await api.get<{ success: boolean; data: any[] }>(`/api/users?action=PERMISSIONS&userId=${id}`);
      return res.data || [];
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || user.first_name || "",
        lastName: user.lastName || user.last_name || "",
        email: user.email || "",
        roleId: String(user.role_id ?? user.roleId ?? user.role?.id ?? ""),
        phone: user.phone || "",
      });
    }
  }, [user]);

  useEffect(() => {
    if (userPermissions) {
      const permsMap: Record<string, boolean> = {};
      userPermissions.forEach((p: any) => {
        const pId = typeof p === 'string' ? p : p.id || p.name;
        if (pId) permsMap[pId] = true;
      });
      setEditedPermissions(permsMap);
    }
  }, [userPermissions]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.put(`/api/users/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      success("Success", `User changes have been saved.`);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["user", id] });
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to update user.");
    }
  });

  const updatePermissionsMutation = useMutation({
    mutationFn: async (data: any) => {
      return await api.post("/api/users", { ...data, action: "UPDATE_PERMISSIONS" });
    },
    onSuccess: () => {
      success("Success", "User permissions overrides saved successfully");
      queryClient.invalidateQueries({ queryKey: ["user_permissions", id] });
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to update permissions");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    updateMutation.mutate({
      first_name: formData.firstName,
      last_name: formData.lastName,
      phone: formData.phone,
      roleId: formData.roleId,
    });
  };

  const handleSavePermissions = () => {
    if (!id) return;
    const permissionsToSave = Object.keys(editedPermissions).filter(k => editedPermissions[k]);
    updatePermissionsMutation.mutate({
      userId: id,
      permissions: permissionsToSave,
    });
  };

  const togglePermission = (permId: string) => {
    setEditedPermissions(prev => ({
      ...prev,
      [permId]: !prev[permId]
    }));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="mb-2">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard/users")}
          className="mb-4 text-slate-500 hover:text-slate-900 -ml-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Users
        </Button>
        <h1 className="text-2xl font-bold text-slate-900">Edit Staff Member</h1>
        <p className="text-sm text-slate-500">Update user details and access overrides</p>
      </div>

      <Card className="border-slate-200 shadow-sm rounded-2xl">
        <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50 rounded-t-2xl">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <UserCog className="h-5 w-5 text-[#0aa9ad]" />
            User Details
          </CardTitle>
          <CardDescription>Modify the personal details for the staff member.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="firstName" className="text-slate-700 font-medium">First Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="firstName"
                    required
                    className="rounded-xl border-slate-200 focus-visible:ring-[#0aa9ad]"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="lastName" className="text-slate-700 font-medium">Last Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="lastName"
                    required
                    className="rounded-xl border-slate-200 focus-visible:ring-[#0aa9ad]"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="email" className="text-slate-700 font-medium">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    disabled
                    className="rounded-xl border-slate-200 bg-slate-50 text-slate-500"
                    value={formData.email}
                  />
                  <p className="text-xs text-slate-400">Email cannot be changed from this form.</p>
                </div>
                <div className="space-y-3">
                  <Label htmlFor="phone" className="text-slate-700 font-medium">Phone Number</Label>
                  <Input
                    id="phone"
                    placeholder="+250 788 000 000"
                    className="rounded-xl border-slate-200 focus-visible:ring-[#0aa9ad]"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="role" className="text-slate-700 font-medium">System Role <span className="text-red-500">*</span></Label>
                  <Select
                    required
                    value={formData.roleId}
                    onValueChange={(val) => setFormData({ ...formData, roleId: val })}
                  >
                    <SelectTrigger className="rounded-xl border-slate-200 focus:ring-[#0aa9ad]">
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roleOptions.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                <Button
                  type="submit"
                  className="rounded-xl bg-[#0aa9ad] hover:bg-[#07969a] text-white shadow-md shadow-teal-900/10"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Save className="mr-2 h-4 w-4" /> Save Details</>}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm rounded-2xl">
        <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50 rounded-t-2xl flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              Permissions Overrides
            </CardTitle>
            <CardDescription>Grant or revoke specific permissions for this user beyond their default role.</CardDescription>
          </div>
          <Button
            onClick={handleSavePermissions}
            disabled={updatePermissionsMutation.isPending || isLoading}
            className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-900/10"
          >
            {updatePermissionsMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Save className="mr-2 h-4 w-4" /> Save Overrides</>}
          </Button>
        </CardHeader>
        <CardContent className="p-6">
          {permsLoading || userPermsLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {permissionsList.map((perm: any) => {
                const pId = typeof perm === 'string' ? perm : perm.id || perm.name;
                const pName = typeof perm === 'string' ? perm : perm.name;
                return (
                  <div key={pId} className="flex items-start space-x-3 p-3 border border-slate-100 rounded-xl hover:bg-slate-50 transition-colors">
                    <Checkbox 
                      id={`user-perm-${pId}`} 
                      checked={!!editedPermissions[pId]}
                      onCheckedChange={() => togglePermission(pId)}
                      className="mt-1 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor={`user-perm-${pId}`}
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
      </Card>
    </div>
  );
}
