import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { fetchRoleOptions } from "@/lib/roleDirectory";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, UserPlus, Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function AddUserPage() {
  const { success, error } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { organizationId, userRole } = useAuth();
  
  const isSuperAdmin = userRole === "super_admin";

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    roleId: "",
    branchId: "",
    phone: "",
    orgId: isSuperAdmin ? "" : (organizationId || ""),
  });

  const { data: roleOptions = [], isLoading: rolesLoading } = useQuery({
    queryKey: ["roleOptions"],
    queryFn: fetchRoleOptions,
  });

  const { data: branches = [], isLoading: branchesLoading } = useQuery({
    queryKey: ["branches", isSuperAdmin ? "admin" : "org", formData.orgId],
    queryFn: async () => {
      const endpoint = isSuperAdmin ? `/api/branches?organizationId=${formData.orgId}` : "/api/branches";
      const headers = !isSuperAdmin && organizationId ? { organizationId } : undefined;
      const res = await api.get<{ success: boolean; data: any[] }>(endpoint, headers);
      return res.data || [];
    },
    enabled: isSuperAdmin ? !!formData.orgId : true,
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ["admin_organizations_list"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>("/api/admin/organizations");
      return res.data || [];
    },
    enabled: isSuperAdmin,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post("/api/users", data);
      return res.data;
    },
    onSuccess: () => {
      success("Success", "User added successfully.");
      queryClient.invalidateQueries({ queryKey: ["users"] });
      navigate("/dashboard/users");
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to create user.");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.orgId) {
       error("Error", "Organization context is missing. Please select one.");
       return;
    }

    createMutation.mutate({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      roleId: formData.roleId,
      branchId: formData.branchId,
      phone: formData.phone,
      isActive: true,
      status: "active",
      organizationId: formData.orgId,
    });
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard/users")}
          className="mb-4 text-muted-foreground hover:text-foreground -ml-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Users
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Add New Staff</h1>
        <p className="text-sm text-muted-foreground">Create a new user account and assign roles</p>
      </div>

      <Card className="border-border shadow-sm rounded-2xl">
        <CardHeader className="border-b border-border pb-4 bg-background/50 rounded-t-2xl">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-[#0aa9ad]" />
            User Details
          </CardTitle>
          <CardDescription>Enter the personal and access details for the new staff member.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {isSuperAdmin && (
              <div className="space-y-3 mb-6 p-4 border border-border rounded-xl bg-muted">
                <Label htmlFor="orgId" className="text-slate-700 font-medium">Organization <span className="text-red-500">*</span></Label>
                <Select
                  required
                  value={formData.orgId}
                  onValueChange={(val) => setFormData({ ...formData, orgId: val, branchId: "" })}
                >
                  <SelectTrigger className="rounded-xl border-border focus:ring-[#0aa9ad] bg-card">
                    <SelectValue placeholder="Select an organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org: any) => (
                      <SelectItem key={org.id} value={String(org.id)}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Super Admins must select which organization this user belongs to.</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="firstName" className="text-slate-700 font-medium">First Name <span className="text-red-500">*</span></Label>
                <Input
                  id="firstName"
                  required
                  placeholder="e.g. John"
                  className="rounded-xl border-border focus-visible:ring-[#0aa9ad]"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="lastName" className="text-slate-700 font-medium">Last Name <span className="text-red-500">*</span></Label>
                <Input
                  id="lastName"
                  required
                  placeholder="e.g. Doe"
                  className="rounded-xl border-border focus-visible:ring-[#0aa9ad]"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="email" className="text-slate-700 font-medium">Email Address <span className="text-red-500">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  required
                  placeholder="john.doe@example.com"
                  className="rounded-xl border-border focus-visible:ring-[#0aa9ad]"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="phone" className="text-slate-700 font-medium">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="+250 788 000 000"
                  className="rounded-xl border-border focus-visible:ring-[#0aa9ad]"
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
                  disabled={rolesLoading}
                >
                  <SelectTrigger className="rounded-xl border-border focus:ring-[#0aa9ad]">
                    <SelectValue placeholder={rolesLoading ? "Loading roles..." : "Select a role"} />
                  </SelectTrigger>
                  <SelectContent>
                    {roleOptions.map((r: any) => (
                      <SelectItem key={r.id} value={String(r.id)}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="branch" className="text-slate-700 font-medium">Branch / Assignment <span className="text-red-500">*</span></Label>
                <Select
                  required
                  value={formData.branchId}
                  onValueChange={(val) => setFormData({ ...formData, branchId: val })}
                  disabled={branchesLoading || (isSuperAdmin && !formData.orgId)}
                >
                  <SelectTrigger className="rounded-xl border-border focus:ring-[#0aa9ad]">
                    <SelectValue placeholder={branchesLoading ? "Loading branches..." : isSuperAdmin && !formData.orgId ? "Select organization first" : "Assign to a branch"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">Main Branch (Default)</SelectItem>
                    {branches.map((b: any) => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-6 border-t border-border flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => navigate("/dashboard/users")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-xl bg-[#0aa9ad] hover:bg-[#07969a] text-white shadow-md shadow-teal-900/10"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Save className="mr-2 h-4 w-4" /> Save User</>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
