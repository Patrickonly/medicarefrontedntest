import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { CreditCard, Plus, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function CreditPaymentsPage() {
  const { success, error } = useToast();
  const { organizationId, user } = useAuth();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ customerId: "", amountPaid: 0, paymentMethod: "CASH" });

  const { data: payments = [], isLoading: isPaymentsLoading } = useQuery({
    queryKey: ["credit-payments", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/customers/payments");
      const all = res || [];
      all.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return all;
    },
    enabled: !!organizationId,
  });

  const { data: customers = [], isLoading: isCustomersLoading } = useQuery({
    queryKey: ["customers", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/customers");
      return res || [];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post("/api/customers/payments", data);
      return res.data;
    },
    onSuccess: () => {
      success("Payment Received", { description: "Payment logged and cashbook updated." });
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["credit-payments"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    },
    onError: (err: any) => {
      error("Error", { description: err.message || "Failed to record payment." });
    }
  });

  // Note: there is no DELETE endpoint for customer payments on the backend
  // yet — this will surface a clear error rather than silently do nothing.
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.del(`/api/customers/payments?id=${id}`);
    },
    onSuccess: () => {
      success("Deleted", { description: "Payment removed." });
      queryClient.invalidateQueries({ queryKey: ["credit-payments"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (err: any) => {
      error("Error", { description: err.message || "Failed to delete payment." });
    }
  });

  const handleSave = () => {
    if (!formData.customerId || formData.amountPaid <= 0) {
      error("Error", { description: "Select a customer and enter a valid amount." });
      return;
    }

    createMutation.mutate({
      customer_id: formData.customerId,
      amount: formData.amountPaid,
      payment_method: formData.paymentMethod,
    });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const getCustomerName = (id: string) => {
    const c = customers.find((c: any) => c.id === id);
    return c ? c.name : "Unknown";
  };

  const isLoading = isPaymentsLoading || isCustomersLoading;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Credit Payments</h1>
          <p className="text-slate-500">Record payments received from customers for outstanding credit balances.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-[#0aa9ad] hover:bg-[#07969a] rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> Receive Payment
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm rounded-2xl">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#0aa9ad]" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount Paid</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : payments.map((payment: any) => (
                <TableRow key={payment.id}>
                  <TableCell>{new Date(payment.timestamp).toLocaleString()}</TableCell>
                  <TableCell className="font-semibold">{payment.customer?.name || getCustomerName(payment.customer_id)}</TableCell>
                  <TableCell className="font-bold text-emerald-600">+{Number(payment.amount || 0).toLocaleString()} RWF</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">{payment.payment_method}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete payment?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this payment? (Cashbook entry will not be automatically reversed)
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(payment.id)} className="bg-red-600 hover:bg-red-700" disabled={deleteMutation.isPending}>
                            {deleteMutation.isPending && deleteMutation.variables === payment.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">No credit payments recorded.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Receive Credit Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select 
                value={formData.customerId} 
                onValueChange={(val) => setFormData({...formData, customerId: val})}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select Customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c: any) => {
                    const balance = c.currentBalance ?? c.current_balance ?? 0;
                    return (
                      <SelectItem key={c.id} value={c.id}>{c.name} {balance > 0 ? `(Owes: ${balance} RWF)` : ""}</SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount Paid (RWF) *</Label>
              <Input 
                type="number"
                value={formData.amountPaid} 
                onChange={(e) => setFormData({...formData, amountPaid: Number(e.target.value)})}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select 
                value={formData.paymentMethod} 
                onValueChange={(val) => setFormData({...formData, paymentMethod: val})}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="MOMO">Mobile Money</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSave} className="bg-[#0aa9ad] hover:bg-[#07969a] rounded-xl" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Save Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
