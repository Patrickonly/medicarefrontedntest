import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Building2, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function EditBranchPage() {
  const { id } = useParams<{ id: string }>();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { organizationId, userRole } = useAuth();
  
  const isSuperAdmin = userRole === "super_admin";

  const [formData, setFormData] = useState({
    name: "",
    location: "",
    contact_phone: "",
    status: "active",
    organizationId: isSuperAdmin ? "" : (organizationId || ""),
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ["admin_organizations_list"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>("/api/admin/organizations");
      return res.data || [];
    },
    enabled: isSuperAdmin,
  });

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ["branches", isSuperAdmin ? "admin" : "org"],
    queryFn: async () => {
      // Fetch all branches across orgs or just the current org
      // Actually we just fetch /api/admin/branches or /api/branches
      const endpoint = isSuperAdmin ? "/api/admin/branches" : "/api/branches";
      const headers = !isSuperAdmin && organizationId ? { organizationId } : undefined;
      const res = await api.get<{ success: boolean; data: any[] }>(endpoint, headers);
      return res.data || [];
    },
  });

  useEffect(() => {
    if (branches.length > 0 && id) {
      const branch = branches.find((b: any) => b.id === id);
      if (branch) {
        setFormData({
          name: branch.name || "",
          location: branch.location || "",
          contact_phone: branch.contact_phone || "",
          status: branch.status || "active",
          organizationId: branch.organization_id || branch.organizationId || "",
        });
      }
    }
  }, [branches, id]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const branchEndpoint = isSuperAdmin ? "/api/admin/branches" : "/api/branches";
      const branchHeaders = isSuperAdmin && data.organizationId ? { headers: { "x-organization-id": data.organizationId } } : undefined;
      return await api.put(branchEndpoint, { ...data, id }, branchHeaders);
    },
    onSuccess: () => {
      success("Success", "Branch updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      navigate("/dashboard/branches");
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to update branch.");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSuperAdmin && !formData.organizationId) {
       error("Error", "Organization context is missing. Please select one.");
       return;
    }

    updateMutation.mutate({
      name: formData.name,
      location: formData.location,
      contact_phone: formData.contact_phone,
      status: formData.status,
      organizationId: formData.organizationId,
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard/branches")}
          className="mb-4 text-muted-foreground hover:text-foreground -ml-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Branches
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#5b3bf7]/10 text-[#5b3bf7]">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Edit Branch</h1>
            <p className="text-muted-foreground mt-1">Update branch details and configuration.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>Branch Details</CardTitle>
            <CardDescription>Update the primary information for this branch.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isSuperAdmin && (
              <div className="space-y-2">
                <Label htmlFor="organizationId">Organization</Label>
                <Select
                  value={formData.organizationId}
                  onValueChange={(val) => setFormData({ ...formData, organizationId: val })}
                  disabled // typically you don't change org on edit
                >
                  <SelectTrigger className="w-full disabled:opacity-50">
                    <SelectValue placeholder="Select an Organization..." />
                  </SelectTrigger>
                  <SelectContent>
                    {organizations.map((org: any) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">Branch Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Downtown Clinic"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input
                  id="contact_phone"
                  placeholder="+250 788 123 456"
                  value={formData.contact_phone}
                  onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location / Address</Label>
              <Input
                id="location"
                placeholder="123 Main St..."
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(val) => setFormData({ ...formData, status: val })}
              >
                <SelectTrigger className="w-full md:w-1/2">
                  <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/dashboard/branches")}
            className="w-32"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="w-40 bg-[#5b3bf7] hover:bg-[#4a2ee0]"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
