import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { CreditCard, Plus, Trash2, Loader2 } from "lucide-react";
import { useState, Fragment } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Eye, EyeOff, Printer } from "lucide-react";
import { PageTransition } from "@/components/ui/page-transition";
import { TableRowsSkeleton } from "@/components/shared/TableRowsSkeleton";

function UnpaidSalesTable({ customerId, onPay }: { customerId: string, onPay: (amount: number) => void }) {
  const { organizationId } = useAuth();
  const { data: sales, isLoading } = useQuery({
    queryKey: ["unpaid-sales", customerId],
    queryFn: async () => {
      const res = await api.get<any[]>(`/api/customers/${customerId}/unpaid`, { organizationId });
      return res || [];
    }
  });

  if (isLoading) return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden m-4 shadow-inner">
      <Table className="bg-white">
        <TableBody>
          <TableRowsSkeleton columns={["text", "text", "text", "badge", "text", "text"]} />
        </TableBody>
      </Table>
    </div>
  );
  if (!sales?.length) return <div className="p-4 text-center text-muted-foreground">No unpaid credit sales found.</div>;

  // Group by date (yyyy-mm-dd)
  const grouped: Record<string, any[]> = {};
  sales.forEach(sale => {
    const d = new Date(sale.timestamp).toISOString().split('T')[0];
    if(!grouped[d]) grouped[d] = [];
    grouped[d].push(sale);
  });

  let totalBal = 0;
  let totalAmt = 0;
  let totalPaid = 0;

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden m-4 shadow-inner">
      <Table className="bg-white">
        <TableHeader className="bg-[#10b981] hover:bg-[#10b981]">
          <TableRow className="hover:bg-[#10b981]">
            <TableHead className="text-white font-bold">PRODUCT/LOSS</TableHead>
            <TableHead className="text-white font-bold text-right">PRICE</TableHead>
            <TableHead className="text-white font-bold text-right">TOTAL</TableHead>
            <TableHead className="text-white font-bold text-right">PAID</TableHead>
            <TableHead className="text-white font-bold text-right">CREDIT</TableHead>
            <TableHead className="text-white font-bold">REMARKS</TableHead>
            <TableHead className="text-white font-bold">SOLD BY</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Object.entries(grouped).map(([dateStr, dateSales]) => (
            <Fragment key={dateStr}>
              <TableRow className="bg-slate-200 hover:bg-slate-200">
                <TableCell colSpan={7} className="font-bold text-slate-800">{dateStr}</TableCell>
              </TableRow>
              {dateSales.map((sale: any) => {
                totalAmt += Number(sale.total_amount);
                totalPaid += Number(sale.amount_paid);
                totalBal += Number(sale.remaining_balance);
                
                if (!sale.items || sale.items.length === 0) {
                  return (
                    <TableRow key={sale.id} className="border-b border-slate-100">
                      <TableCell className="text-muted-foreground italic">No items</TableCell>
                      <TableCell colSpan={2}></TableCell>
                      <TableCell className="text-right">{Number(sale.amount_paid).toLocaleString()}</TableCell>
                      <TableCell className="text-right font-bold text-slate-700">{Number(sale.remaining_balance).toLocaleString()}</TableCell>
                      <TableCell colSpan={2}></TableCell>
                    </TableRow>
                  );
                }

                return sale.items.map((item: any, i: number) => (
                  <TableRow key={item.id} className="border-b border-slate-100">
                    <TableCell className="font-medium text-slate-700">{item.product?.name || 'Unknown'}</TableCell>
                    <TableCell className="text-right text-muted-foreground whitespace-nowrap">
                      {item.quantity} × {Number(item.unit_price).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">{Number(item.subtotal).toLocaleString()}</TableCell>
                    <TableCell className="text-right">{i === 0 ? Number(sale.amount_paid).toLocaleString() : '0'}</TableCell>
                    <TableCell className="text-right font-bold text-slate-700">{i === 0 ? Number(sale.remaining_balance).toLocaleString() : '0'}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{sale.customer_name || sale.customer?.name || "Credit Sale"}</TableCell>
                    <TableCell className="text-xs uppercase text-slate-600">{sale.sold_by?.first_name || 'Admin'}</TableCell>
                  </TableRow>
                ));
              })}
            </Fragment>
          ))}
        </TableBody>
      </Table>
      <div className="bg-slate-50 p-4 border-t flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex gap-6 font-bold text-sm">
          <span>TOTAL: {totalAmt.toLocaleString()}</span>
          <span className="text-emerald-600">PAID: {totalPaid.toLocaleString()}</span>
          <span className="text-rose-600">BALANCE: {totalBal.toLocaleString()}</span>
        </div>
        <div className="flex gap-2">
          <Button className="bg-[#10b981] hover:bg-[#059669] text-white rounded-md" onClick={() => onPay(totalBal)}>
            <CreditCard className="w-4 h-4 mr-2" /> PAY
          </Button>
          <Button className="bg-[#f59e0b] hover:bg-[#d97706] text-white rounded-md" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" /> PRINT
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function CreditPaymentsPage() {
  const { success, error } = useToast();
  const { organizationId, user } = useAuth();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({ customerId: "", amountPaid: 0, paymentMethod: "CASH" });
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCustomerId, setExpandedCustomerId] = useState<string | null>(null);

  const { data: payments = [], isLoading: isPaymentsLoading } = useQuery({
    queryKey: ["credit-payments", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/customers/payments", { organizationId });
      const all = res || [];
      all.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return all;
    },
    enabled: !!organizationId,
  });

  const { data: customers = [], isLoading: isCustomersLoading } = useQuery({
    queryKey: ["customers", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/customers", { organizationId });
      const list = Array.isArray(res) ? res : (res?.results || res?.data || []);
      return list.map((c: any) => ({
        ...c,
        name: c.full_name || c.name,
        currentBalance: c.stats?.outstanding_balance || 0,
        creditLimit: c.credit_limit || 0
      }));
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post("/api/customers/payments", data, { organizationId });
      return res.data;
    },
    onSuccess: () => {
      success("Payment Received", "Payment logged and cashbook updated.");
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["credit-payments"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to record payment.");
    }
  });

  // Note: there is no DELETE endpoint for customer payments on the backend
  // yet — this will surface a clear error rather than silently do nothing.
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.del(`/api/customers/payments?id=${id}`);
    },
    onSuccess: () => {
      success("Deleted", "Payment removed.");
      queryClient.invalidateQueries({ queryKey: ["credit-payments"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to delete payment.");
    }
  });

  const handleSave = () => {
    if (!formData.customerId || formData.amountPaid <= 0) {
      error("Error", "Select a customer and enter a valid amount.");
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
    <PageTransition className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Credit Payments</h1>
          <p className="text-muted-foreground">Record payments received from customers for outstanding credit balances.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-[#0aa9ad] hover:bg-[#07969a] rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> Receive Payment
        </Button>
      </div>

      {/* Outstanding Balances Summary */}
      <Card className="border-border shadow-sm rounded-2xl mb-6">
        <CardHeader className="bg-rose-50/50 border-b border-rose-100 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-lg flex items-center gap-2 text-rose-700">
            <CreditCard className="w-5 h-5" />
            Outstanding Balances
          </CardTitle>
          <div className="relative w-full sm:w-72">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-search absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            <Input
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 border-rose-200 bg-white"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Phone / TIN</TableHead>
                <TableHead className="text-right">Credit Limit</TableHead>
                <TableHead className="text-right">Outstanding Balance</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isCustomersLoading ? (
                <TableRowsSkeleton columns={["text", "text", "text", "badge", "text", "actions"]} />
              ) : customers.filter((c: any) => c.currentBalance > 0).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No customers have outstanding balances.
                  </TableCell>
                </TableRow>
              ) : customers
                  .filter((c: any) => c.currentBalance > 0)
                  .filter((c: any) => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || (c.phone && c.phone.includes(searchTerm)))
                  .sort((a: any, b: any) => b.currentBalance - a.currentBalance)
                  .map((customer: any) => {
                    const limit = Number(customer.creditLimit || 0);
                    const balance = Number(customer.currentBalance || 0);
                    const remaining = Math.max(limit - balance, 0);
                    
                    return (
                      <Fragment key={customer.id}>
                        <TableRow className={expandedCustomerId === customer.id ? "bg-slate-50/50" : ""}>
                          <TableCell className="font-semibold">{customer.name}</TableCell>
                          <TableCell className="text-muted-foreground">{customer.phone || customer.tax_id || "—"}</TableCell>
                          <TableCell className="text-right font-medium text-slate-600">{limit > 0 ? `${limit.toLocaleString()} RWF` : "No Limit"}</TableCell>
                          <TableCell className="text-right font-bold text-rose-600">{balance.toLocaleString()} RWF</TableCell>
                          <TableCell className="text-right font-medium text-emerald-600">{limit > 0 ? `${remaining.toLocaleString()} RWF` : "—"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 px-3 rounded border-blue-200 text-blue-600 hover:bg-blue-50"
                                onClick={() => setExpandedCustomerId(expandedCustomerId === customer.id ? null : customer.id)}
                              >
                                {expandedCustomerId === customer.id ? (
                                  <><EyeOff className="w-3 h-3 mr-1" /> Hide</>
                                ) : (
                                  <><Eye className="w-3 h-3 mr-1" /> View</>
                                )}
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="h-7 px-3 rounded border-[#0aa9ad]/30 text-[#0aa9ad] hover:bg-[#0aa9ad]/10 hover:text-[#07969a]"
                                onClick={() => {
                                  setFormData({ customerId: customer.id, amountPaid: balance, paymentMethod: "CASH" });
                                  setIsDialogOpen(true);
                                }}
                              >
                                Pay
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        {expandedCustomerId === customer.id && (
                          <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                            <TableCell colSpan={6} className="p-0">
                              <UnpaidSalesTable 
                                customerId={customer.id} 
                                onPay={(amount) => {
                                  setFormData({ customerId: customer.id, amountPaid: amount, paymentMethod: "CASH" });
                                  setIsDialogOpen(true);
                                }} 
                              />
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })
              }
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm rounded-2xl">
        <CardHeader className="bg-background/50 border-b border-border py-3">
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
                <TableHead>Recorded By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRowsSkeleton columns={["text", "text", "badge", "badge", "text", "actions"]} />
              ) : payments.map((payment: any) => (
                <TableRow key={payment.id}>
                  <TableCell>{new Date(payment.timestamp).toLocaleString()}</TableCell>
                  <TableCell className="font-semibold">{payment.customer?.name || getCustomerName(payment.customer_id)}</TableCell>
                  <TableCell className="font-bold text-emerald-600">+{Number(payment.amount || 0).toLocaleString()} RWF</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">{payment.payment_method}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {payment.created_by ? `${payment.created_by.first_name} ${payment.created_by.last_name || ''}`.trim() : 'Admin'}
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
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No credit payments recorded.</TableCell>
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
    </PageTransition>
  );
}
