import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, CreditCard, Loader2, X } from "lucide-react";

const STATUS_TABS = ["ALL", "PENDING", "APPROVED", "REJECTED", "COMPLETED"] as const;

const statusBadgeClass: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
};

export default function PaymentsPage() {
  const { success, error } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_TABS)[number]>("PENDING");

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["admin-subscription-payments", statusFilter],
    queryFn: async () => {
      const query = statusFilter === "ALL" ? "" : `?status=${statusFilter}`;
      const res = await api.get<any[]>(`/api/admin/subscriptions/payments${query}`);
      return res || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ paymentId, action }: { paymentId: string; action: "APPROVE" | "REJECT" }) => {
      return await api.post("/api/admin/subscriptions/approve", {
        paymentId,
        adminId: user?.id,
        action,
      });
    },
    onSuccess: (_, variables) => {
      success("Success", variables.action === "APPROVE" ? "Payment approved" : "Payment rejected");
      queryClient.invalidateQueries({ queryKey: ["admin-subscription-payments"] });
    },
    onError: (err: any) => error("Error", err.message || "Failed to update payment"),
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Payments</h1>
        <p className="text-slate-500">Review and approve incoming platform subscription payments.</p>
      </div>

      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
        <TabsList>
          {STATUS_TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab}>{tab.charAt(0) + tab.slice(1).toLowerCase()}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card className="border-slate-200 shadow-sm rounded-2xl">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#0aa9ad]" />
            Subscription Payments
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organization</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : payments.length > 0 ? (
                payments.map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium text-slate-900">{payment.organization?.name || "-"}</TableCell>
                    <TableCell>{payment.subscription?.plan_name || "-"}</TableCell>
                    <TableCell>RWF {Number(payment.amount).toLocaleString()}</TableCell>
                    <TableCell>{payment.payment_method}</TableCell>
                    <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusBadgeClass[payment.status] || ""}>{payment.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {payment.status === "PENDING" ? (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => approveMutation.mutate({ paymentId: payment.id, action: "APPROVE" })}
                            disabled={approveMutation.isPending}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          >
                            <Check className="h-3.5 w-3.5" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => approveMutation.mutate({ paymentId: payment.id, action: "REJECT" })}
                            disabled={approveMutation.isPending}
                            className="text-red-600 border-red-200 hover:bg-red-50 gap-1"
                          >
                            <X className="h-3.5 w-3.5" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">No action needed</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-slate-500">No payments found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
