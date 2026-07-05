import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Building2, Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function AddOrganizationPage() {
  const { success, error } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    type: "healthcare",
    status: "active",
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await api.post<{ success: boolean; data: any }>("/api/admin/organizations", data);
      return res.data;
    },
    onSuccess: () => {
      success("Organization created", `${formData.name} was added to the platform.`);
      queryClient.invalidateQueries({ queryKey: ["admin_organizations"] });
      navigate("/dashboard/organizations");
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to create organization.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      error("Error", "Organization name is required.");
      return;
    }
    createMutation.mutate(formData);
  };

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
        <h1 className="text-2xl font-bold text-slate-900">New Organization</h1>
        <p className="text-sm text-slate-500">Add a new tenant organization to the platform.</p>
      </div>

      <Card className="rounded-2xl border-slate-200 shadow-sm">
        <CardHeader className="rounded-t-2xl border-b border-slate-100 bg-slate-50/50 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Building2 className="h-5 w-5 text-[#0aa9ad]" /> Organization Details
          </CardTitle>
          <CardDescription>Enter the organization's contact details and type.</CardDescription>
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
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="mr-2 h-4 w-4" /> Create Organization</>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
