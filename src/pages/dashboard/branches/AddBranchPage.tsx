import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Building2, Loader2, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function AddBranchPage() {
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

  // Plan entitlement check: an organization can't have more branches than
  // its active subscription plan allows. Cross-references the org's current
  // subscription (for its plan name) against the plan catalog (for that
  // plan's branches_limit), then counts the org's existing branches.
  const { data: orgSubscriptions = [] } = useQuery({
    queryKey: ["admin-org-subscriptions"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>("/api/admin/subscriptions/organizations");
      return res.data || [];
    },
    enabled: isSuperAdmin,
  });

  const { data: plans = [] } = useQuery({
    queryKey: ["admin-subscription-plans"],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/admin/subscriptions/plans");
      return Array.isArray(res) ? res : ((res as any)?.results || (res as any)?.data || []);
    },
    enabled: isSuperAdmin,
  });

  const { data: orgBranches = [] } = useQuery({
    queryKey: ["branches-for-limit-check", formData.organizationId],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>(`/api/branches?organizationId=${formData.organizationId}`);
      return res.data || [];
    },
    enabled: isSuperAdmin && !!formData.organizationId,
  });

  const selectedOrgSubscription = orgSubscriptions.find((s: any) => String(s.organizationId) === String(formData.organizationId));
  const selectedPlan = plans.find((p: any) => p.name === selectedOrgSubscription?.plan);
  const branchesLimit = selectedPlan?.features?.branches_limit;
  const branchLimitReached = isSuperAdmin && !!formData.organizationId && typeof branchesLimit === "number" && orgBranches.length >= branchesLimit;

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const branchEndpoint = isSuperAdmin ? "/api/admin/branches" : "/api/branches";
      const branchHeaders = isSuperAdmin && data.organizationId ? { headers: { "x-organization-id": data.organizationId } } : undefined;
      return await api.post(branchEndpoint, data, branchHeaders);
    },
    onSuccess: () => {
      success("Success", "Branch added successfully.");
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      navigate("/dashboard/branches");
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to create branch.");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSuperAdmin && !formData.organizationId) {
       error("Error", "Organization context is missing. Please select one.");
       return;
    }

    if (branchLimitReached) {
      error(
        "Plan Limit Reached",
        `This organization's ${selectedOrgSubscription?.plan || "current"} plan allows up to ${branchesLimit} branch${branchesLimit === 1 ? "" : "es"}. Upgrade their plan to add more.`
      );
      return;
    }

    createMutation.mutate({
      name: formData.name,
      location: formData.location,
      contact_phone: formData.contact_phone,
      status: formData.status,
      organizationId: formData.organizationId,
    });
  };

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
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Add New Branch</h1>
            <p className="text-muted-foreground mt-1">Register a new branch location for your organization.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>Branch Details</CardTitle>
            <CardDescription>Enter the primary information for this branch.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isSuperAdmin && (
              <div className="space-y-2">
                <Label htmlFor="organizationId">Organization</Label>
                <Select
                  value={formData.organizationId}
                  onValueChange={(val) => setFormData({ ...formData, organizationId: val })}
                >
                  <SelectTrigger className="w-full">
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
                {formData.organizationId && typeof branchesLimit === "number" && (
                  <p className={`text-xs font-medium ${branchLimitReached ? "text-red-600" : "text-muted-foreground"}`}>
                    {orgBranches.length} / {branchesLimit} branches used on the {selectedOrgSubscription?.plan || "current"} plan
                  </p>
                )}
              </div>
            )}

            {branchLimitReached && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Branch limit reached</p>
                  <p className="text-sm mt-0.5">
                    This organization's {selectedOrgSubscription?.plan || "current"} plan allows up to {branchesLimit} branch{branchesLimit === 1 ? "" : "es"}.
                    Upgrade their subscription plan to add more branches.
                  </p>
                </div>
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
            disabled={createMutation.isPending || branchLimitReached}
          >
            {createMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Branch
          </Button>
        </div>
      </form>
    </div>
  );
}
