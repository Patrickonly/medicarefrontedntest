import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Shield, Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function AddRolePage() {
  const { success, error } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await api.post("/api/roles", data);
    },
    onSuccess: () => {
      success("Success", "Role created successfully");
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      navigate("/dashboard/roles-permissions");
    },
    onError: (err: any) => error("Error", err?.message || "Failed to create role"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      error("Error", "Role name is required");
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard/roles-permissions")}
          className="mb-4 text-muted-foreground hover:text-foreground -ml-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Roles & Permissions
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#5b3bf7]/10 text-[#5b3bf7]">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Create New Role</h1>
            <p className="text-muted-foreground mt-1">Define a new role. You can assign permissions to it after creation.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>Role Details</CardTitle>
            <CardDescription>Enter the name and description for this role.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Role Name</Label>
              <Input
                id="name"
                placeholder="e.g. Finance Auditor"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="rounded-xl border-border"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Brief description..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="rounded-xl border-border"
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/dashboard/roles-permissions")}
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
            Create Role
          </Button>
        </div>
      </form>
    </div>
  );
}
