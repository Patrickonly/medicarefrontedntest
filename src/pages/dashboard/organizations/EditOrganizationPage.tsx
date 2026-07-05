import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Building2, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function EditOrganizationPage() {
  const { success, error } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    type: "healthcare",
    status: "active",
  });

  // The admin org API is list-based, so we load the list and find this org.
  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ["admin_organizations"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>("/api/admin/organizations");
      return res.data || [];
    },
  });

  const org = organizations.find((o: any) => String(o.id) === String(id));

  useEffect(() => {
    if (org) {
      setFormData({
        name: org.name || "",
        email: org.email || "",
        phone: org.phone || "",
        type: org.type || "healthcare",
        status: org.status || "active",
      });
    }
  }, [org]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await api.put<{ success: boolean; data: any }>("/api/admin/organizations", { ...org, ...data, id });
      return res.data;
    },
    onSuccess: () => {
      success("Organization updated", `${formData.name} was updated successfully.`);
      queryClient.invalidateQueries({ queryKey: ["admin_organizations"] });
      navigate("/dashboard/organizations");
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to update organization.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      error("Error", "Organization name is required.");
      return;
    }
    updateMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0aa9ad]" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <Button variant="ghost" onClick={() => navigate("/dashboard/organizations")} className="mb-4 -ml-4 text-slate-500 hover:text-slate-900">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Organizations
        </Button>
        <Card className="rounded-2xl border-slate-200 p-10 text-center text-slate-500 shadow-sm">
          Organization not found.
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard/organizations")}
          className="mb-4 -ml-4 text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Organizations
        </Button>
        <h1 className="text-2xl font-bold text-slate-900">Edit Organization</h1>
        <p className="text-sm text-slate-500">Update the details for {org.name}.</p>
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader className="rounded-t-2xl border-b border-slate-100 bg-slate-50/50 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Building2 className="h-5 w-5 text-[#0aa9ad]" /> Organization Details
          </CardTitle>
          <CardDescription>Update the organization's contact details and type.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="name" className="font-medium text-slate-700">
                Organization Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                required
                placeholder="e.g. Kigali Central Hospital"
                className="rounded-xl border-slate-200 focus-visible:ring-[#0aa9ad]"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-3">
                <Label htmlFor="type" className="font-medium text-slate-700">Type</Label>
                <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val })}>
                  <SelectTrigger className="rounded-xl border-slate-200 focus:ring-[#0aa9ad]">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="healthcare">Healthcare</SelectItem>
                    <SelectItem value="agrovet">Agrovet</SelectItem>
                    <SelectItem value="pharmacy">Pharmacy</SelectItem>
                    <SelectItem value="clinic">Clinic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="status" className="font-medium text-slate-700">Status</Label>
                <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                  <SelectTrigger className="rounded-xl border-slate-200 focus:ring-[#0aa9ad]">
                    <SelectValue placeholder="Select a status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="email" className="font-medium text-slate-700">Primary Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@organization.com"
                  className="rounded-xl border-slate-200 focus-visible:ring-[#0aa9ad]"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="phone" className="font-medium text-slate-700">Phone Number</Label>
                <Input
                  id="phone"
                  placeholder="+250 788 123 456"
                  className="rounded-xl border-slate-200 focus-visible:ring-[#0aa9ad]"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-6">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => navigate("/dashboard/organizations")}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-xl bg-[#0aa9ad] text-white shadow-md shadow-teal-900/10 hover:bg-[#07969a]"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> Save Changes</>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
