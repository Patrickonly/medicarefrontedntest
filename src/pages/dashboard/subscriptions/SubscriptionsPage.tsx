import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Edit, Loader2, Plus, Receipt, Sparkles, Tag, Trash2, UserCheck, UserX, ShieldCheck, Layers, BellRing } from "lucide-react";
import { StatCard } from "@/components/shared/StatCard";
import { StatCardsSkeleton } from "@/components/shared/StatCardsSkeleton";

interface PlanFeatures {
  code?: string;
  pos?: boolean;
  inventory?: boolean;
  reports?: boolean;
  branches_limit?: number;
  users_limit?: number;
  advanced_analytics?: boolean;
}

// Removed empty forms as they are now used in dedicated pages

export default function SubscriptionsPage() {
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [planToDelete, setPlanToDelete] = useState<any>(null);
  const [planToToggleStatus, setPlanToToggleStatus] = useState<any>(null);
  const [discountToDelete, setDiscountToDelete] = useState<any>(null);

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ["admin-subscription-plans"],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/admin/subscriptions/plans");
      return Array.isArray(res) ? res : (res?.results || res?.data || []);
    },
  });

  const { data: discountRules = [], isLoading: discountsLoading } = useQuery({
    queryKey: ["admin-discount-rules"],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/admin/subscriptions/discount-rules");
      return Array.isArray(res) ? res : (res?.results || res?.data || []);
    },
  });

  // savePlanMutation is moved to Add/Edit pages

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
      setPlanToToggleStatus(null);
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to update plan status");
      setPlanToToggleStatus(null);
    },
  });

  // saveDiscountMutation is moved to Add/Edit pages

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

  // openPlanDialog and openDiscountDialog are replaced by simple navigation

  return (
    <div className="min-h-screen bg-muted font-sans pb-10">
      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center mb-6">
          <div>
            <h1 className="text-[#1e293b] text-3xl font-bold tracking-tight">Subscriptions</h1>
            <p className="text-muted-foreground text-sm mt-1 font-medium">Manage platform subscription plans and discount rules.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate("/dashboard/subscriptions/reminders")}
              className="gap-2 bg-[#ec4899] hover:bg-[#db2777] text-white"
            >
              <BellRing className="h-4 w-4" />
              Payment Reminders
            </Button>
            <Button
              variant="outline"
              onClick={() => setupDefaultsMutation.mutate()}
              disabled={setupDefaultsMutation.isPending}
              className="gap-2 bg-white hover:bg-muted"
            >
              {setupDefaultsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-[#0aa9ad]" />}
              Setup Default Plans
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        {plansLoading || discountsLoading ? <StatCardsSkeleton count={4} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={Layers}
            label="Total Plans"
            value={plans.length}
            colorClass="bg-[#0aa9ad] text-white"
          />
          <StatCard
            icon={ShieldCheck}
            label="Active Plans"
            value={plans.filter((p: any) => p.status?.toLowerCase() === "active").length}
            colorClass="bg-[#22c55e] text-white"
          />
          <StatCard
            icon={UserX}
            label="Suspended Plans"
            value={plans.filter((p: any) => p.status?.toLowerCase() !== "active").length}
            colorClass="bg-[#f59e0b] text-white"
          />
          <StatCard
            icon={Tag}
            label="Discount Rules"
            value={discountRules.length}
            colorClass="bg-[#6366f1] text-white"
          />
        </div>
        )}

      <Card className="border-border shadow-sm rounded-2xl">
        <CardHeader className="border-b border-border pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Receipt className="h-5 w-5 text-[#0aa9ad]" />
            Subscription Plans
          </CardTitle>
          <Button onClick={() => navigate("/dashboard/subscriptions/plans/add")} className="bg-[#0aa9ad] hover:bg-[#07969a] text-white">
            <Plus className="mr-2 h-4 w-4" /> Add Plan
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-background/50">
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
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : plans.length > 0 ? (
                plans.map((plan: any) => (
                  <TableRow key={plan.id} className="hover:bg-background/50">
                    <TableCell className="font-semibold text-foreground">{plan.name}</TableCell>
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
                      <div className="flex items-center gap-1.5">
                        <div className={`w-2 h-2 rounded-full ${plan.status?.toLowerCase() === "active" ? "bg-amber-500" : "bg-muted-foreground"}`} />
                        {plan.status?.toLowerCase() === "active" ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-50 text-amber-700 uppercase tracking-wide border border-amber-200/50">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-muted text-muted-foreground uppercase tracking-wide">
                            Inactive
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className={`h-7 w-7 rounded shadow-sm transition-colors ${plan.status?.toLowerCase() === "active" ? "border-amber-200 text-amber-500 hover:bg-amber-50 hover:text-amber-600" : "border-emerald-200 text-emerald-500 hover:bg-emerald-50 hover:text-emerald-600"}`}
                          title={plan.status?.toLowerCase() === "active" ? "Suspend" : "Activate"}
                          onClick={() => setPlanToToggleStatus(plan)}
                        >
                          {plan.status?.toLowerCase() === "active" ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => navigate(`/dashboard/subscriptions/plans/edit/${plan.id}`)} className="h-7 w-7 rounded border-blue-200 text-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-colors shadow-sm" title="Edit">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => setPlanToDelete(plan)} className="h-7 w-7 rounded border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">No subscription plans yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm rounded-2xl">
        <CardHeader className="border-b border-border pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Tag className="h-5 w-5 text-[#0aa9ad]" />
            Discount Rules
          </CardTitle>
          <Button onClick={() => navigate("/dashboard/subscriptions/discounts/add")} className="bg-[#0aa9ad] hover:bg-[#07969a] text-white">
            <Plus className="mr-2 h-4 w-4" /> Add Discount Rule
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-background/50">
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
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : discountRules.length > 0 ? (
                discountRules.map((rule: any) => (
                  <TableRow key={rule.id} className="hover:bg-background/50">
                    <TableCell className="font-semibold text-foreground">{rule.months} month{rule.months === 1 ? "" : "s"}</TableCell>
                    <TableCell>{Number(rule.discount_percentage)}%</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="outline" size="icon" onClick={() => navigate(`/dashboard/subscriptions/discounts/edit/${rule.id}`)} className="h-7 w-7 rounded border-blue-200 text-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-colors shadow-sm" title="Edit">
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="outline" size="icon" onClick={() => setDiscountToDelete(rule)} className="h-7 w-7 rounded border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">No discount rules yet.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Removed Dialogs */}

      {/* Delete confirmations */}
      <AlertDialog open={!!planToDelete} onOpenChange={(open) => !open && setPlanToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black text-foreground">Delete "{planToDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-medium mt-2">This plan will no longer be available for new subscriptions. This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3 sm:gap-0">
            <AlertDialogCancel className="rounded-xl border-border font-bold h-11 hover:bg-muted">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletePlanMutation.mutate(planToDelete.id)} disabled={deletePlanMutation.isPending} className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold h-11">
              {deletePlanMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              {deletePlanMutation.isPending ? "Deleting..." : "Delete Plan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!discountToDelete} onOpenChange={(open) => !open && setDiscountToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black text-foreground">Delete this discount rule?</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-medium mt-2">This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3 sm:gap-0">
            <AlertDialogCancel className="rounded-xl border-border font-bold h-11 hover:bg-muted">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteDiscountMutation.mutate(discountToDelete.id)} disabled={deleteDiscountMutation.isPending} className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold h-11">
              {deleteDiscountMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              {deleteDiscountMutation.isPending ? "Deleting..." : "Delete Rule"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Status Toggle Confirmation */}
      <AlertDialog open={!!planToToggleStatus} onOpenChange={(open) => !open && setPlanToToggleStatus(null)}>
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black text-foreground">
              {planToToggleStatus?.status?.toLowerCase() === "active" ? "Suspend Plan" : "Activate Plan"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-medium mt-2">
              Are you sure you want to {planToToggleStatus?.status?.toLowerCase() === "active" ? "suspend" : "activate"}{" "}
              <span className="font-bold text-foreground">
                {planToToggleStatus?.name}
              </span>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3 sm:gap-0">
            <AlertDialogCancel className="rounded-xl border-border font-bold h-11 hover:bg-muted">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (planToToggleStatus) {
                  planStatusMutation.mutate({
                    id: planToToggleStatus.id,
                    status: planToToggleStatus.status?.toLowerCase() === "active" ? "inactive" : "active",
                  });
                }
              }}
              disabled={planStatusMutation.isPending}
              className={`${
                planToToggleStatus?.status?.toLowerCase() === "active" 
                  ? "bg-amber-500 hover:bg-amber-600 text-white" 
                  : "bg-emerald-500 hover:bg-emerald-600 text-white"
              } rounded-xl font-bold h-11`}
            >
              {planStatusMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : planToToggleStatus?.status?.toLowerCase() === "active" ? (
                <UserX className="mr-2 h-4 w-4" />
              ) : (
                <UserCheck className="mr-2 h-4 w-4" />
              )}
              {planStatusMutation.isPending
                ? "Updating..."
                : planToToggleStatus?.status?.toLowerCase() === "active"
                ? "Suspend Plan"
                : "Activate Plan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  );
}
