import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Tags, Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function AddOrganizationTypePage() {
  const { success, error } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "active" as "active" | "inactive",
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await api.post("/api/organization-types", data);
    },
    onSuccess: () => {
      success("Success", "Organization type created successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-organization-types"] });
      navigate("/dashboard/organization-types");
    },
    onError: (err: any) => error("Error", err?.message || "Failed to save organization type"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      error("Error", "Name is required");
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard/organization-types")}
          className="mb-4 text-muted-foreground hover:text-foreground -ml-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Organization Types
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#5b3bf7]/10 text-[#5b3bf7]">
            <Tags className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Add New Organization Type</h1>
            <p className="text-muted-foreground mt-1">Add a new organization type for registration.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>Organization Type Details</CardTitle>
            <CardDescription>Define the core identity of this organization type.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g. Hospital, Clinic, Pharmacy"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="rounded-xl border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                placeholder="Short description shown to admins"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="flex min-h-[100px] w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-slate-950"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <div>
                <Label htmlFor="status">Active</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Inactive types are hidden from registration.</p>
              </div>
              <Switch
                id="status"
                checked={formData.status === "active"}
                onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? "active" : "inactive" })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/dashboard/organization-types")}
            className="w-32"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="w-40 bg-[#5b3bf7] hover:bg-[#4a2ee0]"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Type
          </Button>
        </div>
      </form>
    </div>
  );
}
