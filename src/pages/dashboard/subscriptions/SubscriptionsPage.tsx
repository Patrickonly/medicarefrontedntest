import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Edit, Loader2, Plus, Receipt, Sparkles, Tag, Trash2 } from "lucide-react";

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

const emptyDiscountForm = { months: 1, discount_percentage: 0 };

export default function SubscriptionsPage() {
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const [isPlanDialogOpen, setIsPlanDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [planForm, setPlanForm] = useState(emptyPlanForm);
  const [planToDelete, setPlanToDelete] = useState<any>(null);

  const [isDiscountDialogOpen, setIsDiscountDialogOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<any>(null);
  const [discountForm, setDiscountForm] = useState(emptyDiscountForm);
  const [discountToDelete, setDiscountToDelete] = useState<any>(null);

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["admin-subscription-plans"],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/admin/subscriptions/plans");
      return res || [];
    },
  });

  const { data: discountRules = [], isLoading: discountsLoading } = useQuery({
    queryKey: ["admin-discount-rules"],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/admin/subscriptions/discount-rules");
      return res || [];
    },
  });

  const savePlanMutation = useMutation({
    mutationFn: async (data: typeof planForm) => {
      if (editingPlan?.id) {
        return await api.put(`/api/admin/subscriptions/plans?id=${editingPlan.id}`, data);
      }
      return await api.post("/api/admin/subscriptions/plans", data);
    },
    onSuccess: () => {
      success("Success", `Plan ${editingPlan ? "updated" : "created"} successfully`);
      queryClient.invalidateQueries({ queryKey: ["admin-subscription-plans"] });
      setIsPlanDialogOpen(false);
    },
    onError: (err: any) => error("Error", err.message || "Failed to save plan"),
  });

  const deletePlanMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/api/admin/subscriptions/plans?id=${id}`),
    onSuccess: () => {
      success("Success", "Plan deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-subscription-plans"] });
      setPlanToDelete(null);
    },
    onError: (err: any) => error("Error", err.message || "Failed to delete plan"),
  });

  const planStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "inactive" }) =>
      api.put(`/api/admin/subscriptions/plans?id=${id}`, { status }),
    onSuccess: () => {
      success("Success", "Plan status updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-subscription-plans"] });
    },
    onError: (err: any) => error("Error", err.message || "Failed to update plan status"),
  });

  const saveDiscountMutation = useMutation({
    mutationFn: async (data: typeof discountForm) => {
      if (editingDiscount?.id) {
        return await api.put(`/api/admin/subscriptions/discount-rules?id=${editingDiscount.id}`, data);
      }
      return await api.post("/api/admin/subscriptions/discount-rules", data);
    },
    onSuccess: () => {
      success("Success", `Discount rule ${editingDiscount ? "updated" : "created"} successfully`);
      queryClient.invalidateQueries({ queryKey: ["admin-discount-rules"] });
      setIsDiscountDialogOpen(false);
    },
    onError: (err: any) => error("Error", err.message || "Failed to save discount rule"),
  });

  const deleteDiscountMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/api/admin/subscriptions/discount-rules?id=${id}`),
    onSuccess: () => {
      success("Success", "Discount rule deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-discount-rules"] });
      setDiscountToDelete(null);
    },
    onError: (err: any) => error("Error", err.message || "Failed to delete discount rule"),
  });

  const setupDefaultsMutation = useMutation({
    mutationFn: async () => api.post("/api/admin/subscriptions/setup-defaults", {}),
    onSuccess: () => {
      success("Success", "Default plans and discount rules configured");
      queryClient.invalidateQueries({ queryKey: ["admin-subscription-plans"] });
      queryClient.invalidateQueries({ queryKey: ["admin-discount-rules"] });
    },
    onError: (err: any) => error("Error", err.message || "Failed to configure defaults"),
  });

  const openPlanDialog = (plan?: any) => {
    if (plan) {
      setEditingPlan(plan);
      setPlanForm({
        name: plan.name || "",
        price: Number(plan.price) || 0,
        currency: plan.currency || "RWF",
        duration_months: Number(plan.duration_months) || 1,
        max_organizations: Number(plan.max_organizations) || 1,
        description: plan.description || "",
        status: plan.status === "inactive" ? "inactive" : "active",
        features: { ...emptyPlanForm.features, ...(plan.features || {}) },
      });
    } else {
      setEditingPlan(null);
      setPlanForm(emptyPlanForm);
    }
    setIsPlanDialogOpen(true);
  };

  const openDiscountDialog = (rule?: any) => {
    if (rule) {
      setEditingDiscount(rule);
      setDiscountForm({ months: rule.months, discount_percentage: Number(rule.discount_percentage) || 0 });
    } else {
      setEditingDiscount(null);
      setDiscountForm(emptyDiscountForm);
    }
    setIsDiscountDialogOpen(true);
  };

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Subscriptions</h1>
          <p className="text-sm text-slate-500">Manage platform subscription plans and discount rules.</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setupDefaultsMutation.mutate()}
          disabled={setupDefaultsMutation.isPending}
          className="gap-2"
        >
          {setupDefaultsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Setup Default Plans
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm rounded-2xl">
        <CardHeader className="border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Receipt className="h-5 w-5 text-[#0aa9ad]" />
            Subscription Plans
          </CardTitle>
          <Button onClick={() => openPlanDialog()} className="bg-[#0aa9ad] hover:bg-[#07969a] text-white">
            <Plus className="mr-2 h-4 w-4" /> Add Plan
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead>Plan Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Max Orgs</TableHead>
                <TableHead>Branches</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Modules</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plansLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : plans.length > 0 ? (
                plans.map((plan: any) => (
                  <TableRow key={plan.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-semibold text-slate-900">{plan.name}</TableCell>
                    <TableCell>{plan.currency || "RWF"} {Number(plan.price).toLocaleString()}</TableCell>
                    <TableCell>{plan.duration_months ? `${plan.duration_months} mo` : "-"}</TableCell>
                    <TableCell>{plan.max_organizations ?? "-"}</TableCell>
                    <TableCell>{plan.features?.branches_limit ?? "-"}</TableCell>
                    <TableCell>{plan.features?.users_limit ?? "-"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {plan.features?.pos && <Badge variant="outline">POS</Badge>}
                        {plan.features?.inventory && <Badge variant="outline">Inventory</Badge>}
                        {plan.features?.reports && <Badge variant="outline">Reports</Badge>}
                        {plan.features?.advanced_analytics && <Badge variant="outline">Advanced Analytics</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={plan.status !== "inactive"}
                          disabled={planStatusMutation.isPending}
                          onCheckedChange={(checked) =>
                            planStatusMutation.mutate({ id: plan.id, status: checked ? "active" : "inactive" })
                          }
                        />
                        <span className="text-xs text-slate-500">{plan.status === "inactive" ? "Inactive" : "Active"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openPlanDialog(plan)} className="text-slate-400 hover:text-[#0aa9ad]">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setPlanToDelete(plan)} className="text-slate-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-slate-500">No subscription plans yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-slate-200 shadow-sm rounded-2xl">
        <CardHeader className="border-b border-slate-100 pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Tag className="h-5 w-5 text-[#0aa9ad]" />
            Discount Rules
          </CardTitle>
          <Button onClick={() => openDiscountDialog()} className="bg-[#0aa9ad] hover:bg-[#07969a] text-white">
            <Plus className="mr-2 h-4 w-4" /> Add Discount Rule
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead>Duration</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {discountsLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : discountRules.length > 0 ? (
                discountRules.map((rule: any) => (
                  <TableRow key={rule.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-semibold text-slate-900">{rule.months} month{rule.months === 1 ? "" : "s"}</TableCell>
                    <TableCell>{Number(rule.discount_percentage)}%</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openDiscountDialog(rule)} className="text-slate-400 hover:text-[#0aa9ad]">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDiscountToDelete(rule)} className="text-slate-400 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-slate-500">No discount rules yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Plan Dialog */}
      <Dialog open={isPlanDialogOpen} onOpenChange={setIsPlanDialogOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Plan" : "Add Plan"}</DialogTitle>
            <DialogDescription>Define pricing, limits, and included modules for this plan.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Plan Name</Label>
              <Input value={planForm.name} onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })} className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price</Label>
                <Input type="number" value={planForm.price} onChange={(e) => setPlanForm({ ...planForm, price: Number(e.target.value) || 0 })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={planForm.currency} onValueChange={(v) => setPlanForm({ ...planForm, currency: v })}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RWF">RWF</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration (months)</Label>
                <Input type="number" min={1} value={planForm.duration_months} onChange={(e) => setPlanForm({ ...planForm, duration_months: Number(e.target.value) || 1 })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Max Organizations</Label>
                <Input type="number" min={1} value={planForm.max_organizations} onChange={(e) => setPlanForm({ ...planForm, max_organizations: Number(e.target.value) || 1 })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Plan Code</Label>
                <Input value={planForm.features.code || ""} onChange={(e) => setPlanForm({ ...planForm, features: { ...planForm.features, code: e.target.value } })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Branches Limit</Label>
                <Input type="number" value={planForm.features.branches_limit ?? 0} onChange={(e) => setPlanForm({ ...planForm, features: { ...planForm.features, branches_limit: Number(e.target.value) || 0 } })} className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Users Limit</Label>
                <Input type="number" value={planForm.features.users_limit ?? 0} onChange={(e) => setPlanForm({ ...planForm, features: { ...planForm.features, users_limit: Number(e.target.value) || 0 } })} className="rounded-xl" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={planForm.description}
                onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                className="rounded-xl"
                rows={2}
                placeholder="Short summary shown to organizations choosing this plan"
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-slate-500">Inactive plans can't be selected for new subscriptions.</p>
              </div>
              <Switch
                checked={planForm.status === "active"}
                onCheckedChange={(checked) => setPlanForm({ ...planForm, status: checked ? "active" : "inactive" })}
              />
            </div>
            <div className="space-y-3 pt-2">
              {([
                ["pos", "Point of Sale"],
                ["inventory", "Inventory"],
                ["reports", "Reports"],
                ["advanced_analytics", "Advanced Analytics"],
              ] as const).map(([key, label]) => (
                <div key={key} className="flex items-center justify-between">
                  <Label>{label}</Label>
                  <Switch
                    checked={!!planForm.features[key]}
                    onCheckedChange={(val) => setPlanForm({ ...planForm, features: { ...planForm.features, [key]: val } })}
                  />
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPlanDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={() => savePlanMutation.mutate(planForm)} disabled={savePlanMutation.isPending || !planForm.name} className="bg-[#0aa9ad] hover:bg-[#07969a] text-white rounded-xl">
              {savePlanMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Discount Rule Dialog */}
      <Dialog open={isDiscountDialogOpen} onOpenChange={setIsDiscountDialogOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingDiscount ? "Edit Discount Rule" : "Add Discount Rule"}</DialogTitle>
            <DialogDescription>Discounts auto-apply based on subscription duration.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Duration (months)</Label>
              <Input type="number" min={1} value={discountForm.months} onChange={(e) => setDiscountForm({ ...discountForm, months: Number(e.target.value) || 1 })} className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Discount Percentage</Label>
              <Input type="number" min={0} max={100} value={discountForm.discount_percentage} onChange={(e) => setDiscountForm({ ...discountForm, discount_percentage: Number(e.target.value) || 0 })} className="rounded-xl" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDiscountDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={() => saveDiscountMutation.mutate(discountForm)} disabled={saveDiscountMutation.isPending} className="bg-[#0aa9ad] hover:bg-[#07969a] text-white rounded-xl">
              {saveDiscountMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Rule"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmations */}
      <AlertDialog open={!!planToDelete} onOpenChange={(open) => !open && setPlanToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{planToDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>This plan will no longer be available for new subscriptions. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletePlanMutation.mutate(planToDelete.id)} disabled={deletePlanMutation.isPending} className="bg-red-600 hover:bg-red-700 text-white rounded-xl">
              {deletePlanMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Plan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!discountToDelete} onOpenChange={(open) => !open && setDiscountToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this discount rule?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteDiscountMutation.mutate(discountToDelete.id)} disabled={deleteDiscountMutation.isPending} className="bg-red-600 hover:bg-red-700 text-white rounded-xl">
              {deleteDiscountMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Rule"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
