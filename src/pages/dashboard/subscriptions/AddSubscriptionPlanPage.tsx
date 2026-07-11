import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Receipt, Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface PlanFeatures {
  code?: string;
  pos?: boolean;
  inventory?: boolean;
  reports?: boolean;
  branches_limit?: number;
  users_limit?: number;
  advanced_analytics?: boolean;
}

const emptyPlanForm = {
  name: "",
  price: 0,
  currency: "RWF",
  duration_months: 1,
  max_organizations: 1,
  description: "",
  status: "active" as "active" | "inactive",
  features: { code: "", pos: true, inventory: true, reports: true, branches_limit: 1, users_limit: 1, advanced_analytics: false } as PlanFeatures,
};

export default function AddSubscriptionPlanPage() {
  const { success, error } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [planForm, setPlanForm] = useState(emptyPlanForm);

  const createMutation = useMutation({
    mutationFn: async (data: typeof planForm) => {
      return await api.post("/api/admin/subscriptions/plans", data);
    },
    onSuccess: () => {
      success("Success", "Plan created successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-subscription-plans"] });
      navigate("/dashboard/subscriptions");
    },
    onError: (err: any) => error("Error", err.message || "Failed to create plan"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.name) {
      error("Error", "Plan name is required");
      return;
    }
    createMutation.mutate(planForm);
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard/subscriptions")}
          className="mb-4 text-muted-foreground hover:text-foreground -ml-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Subscriptions
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0aa9ad]/10 text-[#0aa9ad]">
            <Receipt className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Add Subscription Plan</h1>
            <p className="text-muted-foreground mt-1">Define pricing, limits, and included modules for this plan.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>Plan Details</CardTitle>
            <CardDescription>Enter the core details and pricing for this subscription plan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Plan Name</Label>
              <Input
                value={planForm.name}
                onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                className="rounded-xl border-border"
                placeholder="e.g. Premium Plan"
                required
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Price</Label>
                <Input
                  type="number"
                  value={planForm.price}
                  onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) || 0 })}
                  className="rounded-xl border-border"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={planForm.currency} onValueChange={(v) => setPlanForm({ ...planForm, currency: v })}>
                  <SelectTrigger className="rounded-xl border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RWF">RWF</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration (months)</Label>
                <Input
                  type="number"
                  min={1}
                  value={planForm.duration_months}
                  onChange={(e) => setPlanForm({ ...planForm, duration_months: Number(e.target.value) || 1 })}
                  className="rounded-xl border-border"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Max Organizations</Label>
                <Input
                  type="number"
                  min={1}
                  value={planForm.max_organizations}
                  onChange={(e) => setPlanForm({ ...planForm, max_organizations: Number(e.target.value) || 1 })}
                  className="rounded-xl border-border"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={planForm.description}
                onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                className="rounded-xl border-border"
                rows={3}
                placeholder="Short summary shown to organizations choosing this plan"
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground mt-0.5">Inactive plans can't be selected for new subscriptions.</p>
              </div>
              <Switch
                checked={planForm.status === "active"}
                onCheckedChange={(checked) => setPlanForm({ ...planForm, status: checked ? "active" : "inactive" })}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>Features & Limits</CardTitle>
            <CardDescription>Configure what this plan includes.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Plan Code</Label>
                <Input
                  value={planForm.features.code || ""}
                  onChange={(e) => setPlanForm({ ...planForm, features: { ...planForm.features, code: e.target.value } })}
                  className="rounded-xl border-border"
                  placeholder="e.g. PREM-2026"
                />
              </div>
              <div className="space-y-2">
                <Label>Branches Limit</Label>
                <Input
                  type="number"
                  value={planForm.features.branches_limit ?? 0}
                  onChange={(e) => setPlanForm({ ...planForm, features: { ...planForm.features, branches_limit: Number(e.target.value) || 0 } })}
                  className="rounded-xl border-border"
                />
              </div>
              <div className="space-y-2">
                <Label>Users Limit</Label>
                <Input
                  type="number"
                  value={planForm.features.users_limit ?? 0}
                  onChange={(e) => setPlanForm({ ...planForm, features: { ...planForm.features, users_limit: Number(e.target.value) || 0 } })}
                  className="rounded-xl border-border"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
              {([
                ["pos", "Point of Sale"],
                ["inventory", "Inventory"],
                ["reports", "Reports"],
                ["advanced_analytics", "Advanced Analytics"],
              ] as const).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between rounded-lg border border-border p-3">
                  <Label className="cursor-pointer">{label}</Label>
                  <Switch
                    checked={!!(planForm.features as any)[key]}
                    onCheckedChange={(val) => setPlanForm({ ...planForm, features: { ...planForm.features, [key]: val } })}
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/dashboard/subscriptions")}
            className="w-32"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="w-40 bg-[#0aa9ad] hover:bg-[#07969a] text-white"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Plan
          </Button>
        </div>
      </form>
    </div>
  );
}
