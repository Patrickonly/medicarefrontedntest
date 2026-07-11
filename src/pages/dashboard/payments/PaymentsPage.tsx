import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Building2, Check, CreditCard, FileText, Loader2, X } from "lucide-react";
import { PageTransition } from "@/components/ui/page-transition";
import { TableRowsSkeleton } from "@/components/shared/TableRowsSkeleton";

const STATUS_TABS = ["ALL", "PENDING", "APPROVED", "REJECTED", "COMPLETED"] as const;

const statusBadgeClass: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
};

const apiBaseUrl = (() => {
  try {
    const base = import.meta.env.VITE_API_BASE_URL;
    return typeof base === "string" ? base.trim().replace(/\/$/, "") : "";
  } catch {
    return "";
  }
})();

const resolveReceiptUrl = (url: string) => (/^https?:\/\//i.test(url) ? url : `${apiBaseUrl}${url}`);

export default function PaymentsPage() {
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const orgFilter = searchParams.get("organizationId") || "ALL";
  const initialStatus = (searchParams.get("status") as (typeof STATUS_TABS)[number]) || "PENDING";
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_TABS)[number]>(initialStatus);
  const [paymentToReject, setPaymentToReject] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: allPayments = [], isLoading } = useQuery({
    queryKey: ["admin-subscription-payments", statusFilter],
    queryFn: async () => {
      const query = statusFilter === "ALL" ? "" : `?status=${statusFilter}`;
      const res = await api.get<any[]>(`/api/admin/subscriptions/payments${query}`);
      return Array.isArray(res) ? res : (res?.results || res?.data || []);
    },
  });

  const organizations = Array.from(
    new Map(
      allPayments
        .filter((p: any) => p.organization?.id ?? p.organizationId ?? p.organization_id)
        .map((p: any) => {
          const id = String(p.organization?.id ?? p.organizationId ?? p.organization_id);
          return [id, { id, name: p.organization?.name || `Org ${id}` }];
        })
    ).values()
  );

  const payments = orgFilter !== "ALL"
    ? allPayments.filter((p: any) => String(p.organization?.id ?? p.organizationId ?? p.organization_id) === orgFilter)
    : allPayments;

  const setOrgFilter = (value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value === "ALL") {
      next.delete("organizationId");
    } else {
      next.set("organizationId", value);
    }
    setSearchParams(next);
  };

  const approveMutation = useMutation({
    mutationFn: async ({ paymentId, action, reason }: { paymentId: string; action: "APPROVE" | "REJECT"; reason?: string }) => {
      return await api.post("/api/admin/subscriptions/approve", {
        paymentId,
        action,
        ...(reason ? { reason } : {}),
      });
    },
    onSuccess: (_, variables) => {
      success("Success", variables.action === "APPROVE" ? "Payment approved" : "Payment rejected");
      queryClient.invalidateQueries({ queryKey: ["admin-subscription-payments"] });
      setPaymentToReject(null);
      setRejectReason("");
    },
    onError: (err: any) => error("Error", err.message || "Failed to update payment"),
  });

  return (
    <PageTransition className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Payments</h1>
        <p className="text-muted-foreground">Review and approve incoming platform subscription payments.</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <TabsList>
            {STATUS_TABS.map((tab) => (
              <TabsTrigger key={tab} value={tab}>{tab.charAt(0) + tab.slice(1).toLowerCase()}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <Select value={orgFilter} onValueChange={setOrgFilter}>
          <SelectTrigger className="w-full sm:w-64 h-10 rounded-xl border-border bg-background">
            <SelectValue placeholder="All Organizations" />
          </SelectTrigger>
          <SelectContent className="rounded-xl border-border">
            <SelectItem value="ALL" className="cursor-pointer">All Organizations</SelectItem>
            {organizations.map((org) => (
              <SelectItem key={org.id} value={org.id} className="cursor-pointer">{org.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="border-border shadow-sm rounded-2xl">
        <CardHeader className="bg-background/50 border-b border-border py-3">
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
                <TableRowsSkeleton columns={["text", "text", "text", "text", "text", "badge", "actions"]} />
              ) : payments.length > 0 ? (
                payments.map((payment: any) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <div className="font-semibold">{payment.organization?.name || "-"}</div>
                          {payment.organization?.id && (
                            <div className="text-[11px] text-muted-foreground">ID: {payment.organization.id}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{payment.subscription?.plan_name || "-"}</TableCell>
                    <TableCell>RWF {Number(payment.amount).toLocaleString()}</TableCell>
                    <TableCell>{payment.payment_method}</TableCell>
                    <TableCell>{new Date(payment.date).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusBadgeClass[payment.status] || ""}>{payment.status}</Badge>
                      {payment.status === "REJECTED" && (payment.reject_reason || payment.rejection_reason || payment.reason) && (
                        <p className="text-[11px] text-red-600 mt-1 max-w-[200px]">
                          {payment.reject_reason || payment.rejection_reason || payment.reason}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-2">
                        {payment.receipt_document_url && (
                          <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="gap-1"
                          >
                            <a href={resolveReceiptUrl(payment.receipt_document_url)} target="_blank" rel="noopener noreferrer">
                              <FileText className="h-3.5 w-3.5" /> View Receipt
                            </a>
                          </Button>
                        )}
                        {payment.status === "PENDING" ? (
                          <>
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
                              onClick={() => { setPaymentToReject(payment); setRejectReason(""); }}
                              disabled={approveMutation.isPending}
                              className="text-red-600 border-red-200 hover:bg-red-50 gap-1"
                            >
                              <X className="h-3.5 w-3.5" /> Reject
                            </Button>
                          </>
                        ) : !payment.receipt_document_url ? (
                          <span className="text-xs text-muted-foreground">No action needed</span>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No payments found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!paymentToReject} onOpenChange={(open) => { if (!open) { setPaymentToReject(null); setRejectReason(""); } }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl">Reject Payment</DialogTitle>
            <DialogDescription>
              Rejecting the payment from <span className="font-semibold text-foreground">{paymentToReject?.organization?.name || "this organization"}</span>. Please provide a reason — it helps the organization understand what to fix.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="reject-reason">Reason for rejection</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Receipt amount does not match the selected plan/duration."
              className="min-h-[100px] rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPaymentToReject(null); setRejectReason(""); }} className="rounded-xl font-semibold">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (paymentToReject) {
                  approveMutation.mutate({ paymentId: paymentToReject.id, action: "REJECT", reason: rejectReason.trim() || undefined });
                }
              }}
              disabled={approveMutation.isPending || !rejectReason.trim()}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {approveMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Reject Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
