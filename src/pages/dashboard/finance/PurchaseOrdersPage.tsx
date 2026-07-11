import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, Edit2, Plus, Trash2, Loader2, X, Clock, DollarSign, Eye, Mail, Building2, CalendarDays, FileDown } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/shared/StatCard";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { PageTransition } from "@/components/ui/page-transition";
import { TableRowsSkeleton } from "@/components/shared/TableRowsSkeleton";

interface OrderItemDraft {
  productId: string;
  quantity: number;
  unitCost: number;
}

const emptyItem: OrderItemDraft = { productId: "", quantity: 1, unitCost: 0 };

const apiBaseUrl = (() => {
  try {
    const base = import.meta.env.VITE_API_BASE_URL;
    return typeof base === "string" ? base.trim().replace(/\/$/, "") : "";
  } catch {
    return "";
  }
})();

const resolveFileUrl = (url: string) => (/^https?:\/\//i.test(url) ? url : `${apiBaseUrl}${url}`);

export default function PurchaseOrdersPage() {
  const { success, error } = useToast();
  const { organizationId } = useAuth();
  const queryClient = useQueryClient();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [items, setItems] = useState<OrderItemDraft[]>([{ ...emptyItem }]);

  const [statusOrder, setStatusOrder] = useState<any>(null);
  const [newStatus, setNewStatus] = useState("PENDING");

  const [receivingOrder, setReceivingOrder] = useState<any>(null);
  const [receiveBranchId, setReceiveBranchId] = useState("");

  const [invoiceOrder, setInvoiceOrder] = useState<any>(null);

  const { data: invoiceDetail, isLoading: isInvoiceLoading } = useQuery({
    queryKey: ["purchase-order-invoice", invoiceOrder?.id],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any }>(`/api/purchases/${invoiceOrder.id}/invoice`);
      return res.data;
    },
    enabled: !!invoiceOrder?.id,
  });

  const { data: orders = [], isLoading: isOrdersLoading } = useQuery({
    queryKey: ["purchase-orders", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/purchases");
      // Each item comes back as { purchaseOrder: { id, supplierId, supplierName,
      // totalAmount, status, createdAt, items } } — unwrap to a flat shape.
      const all = (res || []).map((item: any) => item.purchaseOrder || item);
      all.sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      return all;
    },
    enabled: !!organizationId,
  });

  const { data: suppliers = [], isLoading: isSuppliersLoading } = useQuery({
    queryKey: ["suppliers", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/suppliers");
      return Array.isArray(res) ? res : (res?.results || res?.data || []);
    },
    enabled: !!organizationId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/products");
      return Array.isArray(res) ? res : (res?.results || res?.data || []);
    },
    enabled: !!organizationId,
  });

  const { data: branches = [] } = useQuery({
    queryKey: ["branches", organizationId],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>("/api/branches", organizationId ? { organizationId } : undefined);
      return res.data || [];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      // Creation always emails the supplier's invoice PDF automatically
      // server-side (if they have an email on file) — no separate send step.
      const res: any = await api.post("/api/purchases", data);
      return res;
    },
    onSuccess: () => {
      success("Success", "Purchase order created. The invoice was emailed to the supplier if they have an email on file.");
      closeCreateDialog();
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to create order.");
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.put(`/api/purchases?id=${id}`, { status });
      return res.data;
    },
    onSuccess: () => {
      success("Success", "Purchase order status updated.");
      setStatusOrder(null);
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to update order.");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.del(`/api/purchases?id=${id}`);
    },
    onSuccess: () => {
      success("Deleted", "Order removed.");
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to delete order.");
    }
  });

  // Receiving stock against a PO is a workflow action, not a status edit — it
  // goes through /api/purchases with an action body. This is the only way to
  // mark a PO RECEIVED: it creates a ProductBatch per item, posts the
  // inventory increase, and updates the supplier's delivery performance.
  const receiveMutation = useMutation({
    mutationFn: async ({ id, branchId }: { id: string; branchId?: string }) => {
      const res = await api.post("/api/purchases", {
        action: "RECEIVE",
        purchaseOrderId: Number(id),
        ...(branchId ? { branchId: Number(branchId) } : {}),
      });
      return res;
    },
    onSuccess: () => {
      success("Success", "Purchase order received. Stock has been increased.");
      setReceivingOrder(null);
      setReceiveBranchId("");
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["product-batches"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: any) => {
      const raw = err.message || "";
      const message = /already received/i.test(raw)
        ? "This purchase order has already been received."
        : /missing branchid/i.test(raw)
        ? "No branch was selected and your account has no home branch set — please choose a branch."
        : raw || "Failed to receive order.";
      error("Error", message);
    }
  });

  const openCreateDialog = () => {
    setSupplierId("");
    setItems([{ ...emptyItem }]);
    setIsCreateDialogOpen(true);
  };

  const closeCreateDialog = () => {
    setIsCreateDialogOpen(false);
  };

  const addItemRow = () => setItems((prev) => [...prev, { ...emptyItem }]);
  const removeItemRow = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));
  const updateItemRow = (index: number, patch: Partial<OrderItemDraft>) =>
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  const orderTotal = items.reduce((sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitCost) || 0), 0);

  const handleCreate = () => {
    if (!supplierId) {
      error("Error", "Supplier is required");
      return;
    }
    const validItems = items.filter((it) => it.productId && it.quantity > 0);
    if (validItems.length === 0) {
      error("Error", "Add at least one item with a product and quantity.");
      return;
    }

    createMutation.mutate({
      supplier_id: supplierId,
      items: validItems.map((it) => ({
        product_id: it.productId,
        expected_quantity: it.quantity,
        unit_cost: it.unitCost,
      })),
    });
  };

  const openStatusDialog = (order: any) => {
    setStatusOrder(order);
    setNewStatus(order.status === "RECEIVED" ? "RECEIVED" : "PENDING");
  };

  const handleUpdateStatus = () => {
    if (!statusOrder) return;
    updateStatusMutation.mutate({ id: statusOrder.id, status: newStatus });
  };

  const handleOpenReceive = (order: any) => {
    setReceivingOrder(order);
    setReceiveBranchId("");
  };

  const handleConfirmReceive = () => {
    if (!receivingOrder) return;
    // branchId is optional — the backend falls back to the account's home
    // branch if one is set. If neither is available it returns a clear
    // "Missing branchId" error, which surfaces via the mutation's onError.
    receiveMutation.mutate({ id: receivingOrder.id, branchId: receiveBranchId.trim() || undefined });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const isLoading = isOrdersLoading || isSuppliersLoading;

  return (
    <PageTransition className="min-h-screen bg-muted font-sans pb-10">
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Purchase Orders</h1>
            <p className="text-muted-foreground mt-1">Manage orders placed to your suppliers.</p>
          </div>
          <Button onClick={openCreateDialog} className="bg-[#0aa9ad] hover:bg-[#07969a] rounded-xl h-10 px-5">
            <Plus className="w-4 h-4 mr-2" /> Create PO
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            icon={ClipboardList}
            label="Total Purchase Orders"
            value={orders.length}
            colorClass="bg-[#0aa9ad] text-white"
          />
          <StatCard
            icon={Clock}
            label="Pending Deliveries"
            value={orders.filter((o: any) => o.status === "PENDING" || o.status === "APPROVED").length}
            colorClass="bg-[#f59e0b] text-white"
          />
          <StatCard
            icon={DollarSign}
            label="Total Spend"
            value={orders.reduce((sum: number, o: any) => {
              const n = Number(o.totalAmount ?? o.total_amount);
              return sum + (Number.isFinite(n) ? n : 0);
            }, 0)}
            format="currency"
            colorClass="bg-[#8b5cf6] text-white"
          />
        </div>

      <Card className="border-border shadow-sm rounded-2xl">
        <CardHeader className="bg-background/50 border-b border-border py-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-[#0aa9ad]" />
            Recent Orders
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRowsSkeleton columns={["text", "text", "text", "badge", "actions"]} />
              ) : orders.map((order: any) => (
                <TableRow
                  key={order.id}
                  onClick={() => setInvoiceOrder(order)}
                  className="cursor-pointer"
                  title="Click to view invoice"
                >
                  <TableCell>{order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}</TableCell>
                  <TableCell className="font-semibold">{order.supplierName || "Unknown"}</TableCell>
                  <TableCell className="font-bold text-emerald-600">{Number(order.totalAmount || 0).toLocaleString()} RWF</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={order.status === "RECEIVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : order.status === "CANCELLED_PO" ? "bg-muted" : "bg-blue-50 text-blue-700 border-blue-200"}>
                      {order.status === "CANCELLED_PO" ? "CANCELLED" : order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setInvoiceOrder(order)} className="text-slate-600" title="View Invoice">
                        <Eye className="w-4 h-4" />
                      </Button>
                      {order.status !== "RECEIVED" && order.status !== "CANCELLED_PO" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenReceive(order)}
                          className="text-emerald-600"
                        >
                          Receive
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => openStatusDialog(order)} className="text-blue-600">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Purchase Order?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this purchase order? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(order.id)} className="bg-red-600 hover:bg-red-700" disabled={deleteMutation.isPending}>
                              {deleteMutation.isPending && deleteMutation.variables === order.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && orders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No purchase orders found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create PO */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => !open && closeCreateDialog()}>
        <DialogContent className="rounded-2xl max-w-2xl">
          <DialogHeader>
            <DialogTitle>New Purchase Order</DialogTitle>
            <DialogDescription>Select a supplier and the items you're ordering.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Supplier *</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select Supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Items *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItemRow} className="rounded-lg">
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
                </Button>
              </div>
              {items.length > 0 && (
                <div className="grid grid-cols-[1fr_100px_120px_32px] gap-2 px-0.5">
                  <Label className="text-xs font-medium text-muted-foreground">Product</Label>
                  <Label className="text-xs font-medium text-muted-foreground">Qty</Label>
                  <Label className="text-xs font-medium text-muted-foreground">Unit Cost</Label>
                  <span />
                </div>
              )}
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-[1fr_100px_120px_32px] gap-2 items-center">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between rounded-xl font-normal"
                      >
                        {item.productId
                          ? products.find((p: any) => String(p.id) === String(item.productId))?.name
                          : "Search product..."}
                        <Clock className="ml-2 h-4 w-4 shrink-0 opacity-50 hidden" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search products..." />
                        <CommandList>
                          <CommandEmpty>No product found.</CommandEmpty>
                          <CommandGroup>
                            {products.map((p: any) => (
                              <CommandItem
                                key={String(p.id)}
                                value={p.name}
                                onSelect={() => {
                                  const cost = Number(p.pricing?.purchasePrice || p.base_cost || 0) || 0;
                                  updateItemRow(index, { productId: String(p.id), unitCost: cost });
                                }}
                              >
                                {p.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Input
                    type="number"
                    min={1}
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItemRow(index, { quantity: Number(e.target.value) || 0 })}
                    className="rounded-xl"
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="Unit Cost"
                    value={item.unitCost}
                    onChange={(e) => updateItemRow(index, { unitCost: Number(e.target.value) || 0 })}
                    className="rounded-xl"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItemRow(index)}
                    disabled={items.length === 1}
                    className="text-muted-foreground hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <p className="text-sm font-bold text-foreground">Total: {orderTotal.toLocaleString()} RWF</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeCreateDialog} className="rounded-xl">Cancel</Button>
            <Button onClick={handleCreate} className="bg-[#0aa9ad] hover:bg-[#07969a] rounded-xl" disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status */}
      <Dialog open={!!statusOrder} onOpenChange={(open) => !open && setStatusOrder(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Update Order Status</DialogTitle>
            <DialogDescription>
              Supplier and items can't be changed after an order is created — only the status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus} disabled={statusOrder?.status === "RECEIVED"}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="CANCELLED_PO">Cancelled</SelectItem>
                  {statusOrder?.status === "RECEIVED" && <SelectItem value="RECEIVED">Received</SelectItem>}
                </SelectContent>
              </Select>
              {statusOrder?.status === "RECEIVED" && (
                <p className="text-xs text-muted-foreground">A received order's status can't be changed here.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusOrder(null)} className="rounded-xl">Cancel</Button>
            <Button
              onClick={handleUpdateStatus}
              className="bg-[#0aa9ad] hover:bg-[#07969a] rounded-xl"
              disabled={updateStatusMutation.isPending || statusOrder?.status === "RECEIVED"}
            >
              {updateStatusMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive */}
      <Dialog open={!!receivingOrder} onOpenChange={(open) => !open && setReceivingOrder(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Receive Purchase Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              This creates stock for the ordered items, marks the order RECEIVED, and updates the supplier's delivery performance. This cannot be undone.
            </p>
            <div className="space-y-2">
              <Label>Receiving Branch</Label>
              {branches.length > 0 ? (
                <Select value={receiveBranchId} onValueChange={setReceiveBranchId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Uses your home branch if left blank" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((b: any) => (
                      <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  placeholder="Leave blank to use your home branch"
                  value={receiveBranchId}
                  onChange={(e) => setReceiveBranchId(e.target.value)}
                  className="rounded-xl"
                />
              )}
              <p className="text-xs text-muted-foreground">Optional — falls back to your account's home branch if left blank.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReceivingOrder(null)} className="rounded-xl">Cancel</Button>
            <Button
              onClick={handleConfirmReceive}
              className="bg-emerald-600 hover:bg-emerald-700 rounded-xl"
              disabled={receiveMutation.isPending}
            >
              {receiveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Confirm Receive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice View */}
      <Dialog open={!!invoiceOrder} onOpenChange={(open) => !open && setInvoiceOrder(null)}>
        <DialogContent className="rounded-2xl max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-[#0aa9ad]" /> Purchase Order Invoice
            </DialogTitle>
            <DialogDescription>
              {invoiceDetail?.poNumber || (invoiceOrder ? `PO #${invoiceOrder.id}` : "")}
              {invoiceDetail?.createdAt ? ` — ${new Date(invoiceDetail.createdAt).toLocaleString()}` : ""}
            </DialogDescription>
          </DialogHeader>

          {isInvoiceLoading ? (
            <div className="py-16 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : invoiceDetail ? (
            <div className="space-y-5 py-2">
              <div className="flex items-start justify-between gap-4 rounded-xl border border-border bg-muted/30 p-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" /> Supplier
                  </p>
                  <p className="font-semibold text-foreground">{invoiceDetail.supplier?.name || "Unknown"}</p>
                  {invoiceDetail.supplier?.email ? (
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" /> {invoiceDetail.supplier.email}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-600">No email on file — the invoice could not be emailed to this supplier.</p>
                  )}
                  {invoiceDetail.supplier?.phone && (
                    <p className="text-xs text-muted-foreground">{invoiceDetail.supplier.phone}</p>
                  )}
                </div>
                <div className="text-right space-y-1">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 justify-end">
                    <CalendarDays className="w-3.5 h-3.5" /> Status
                  </p>
                  <Badge variant="outline" className={invoiceDetail.status === "RECEIVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : invoiceDetail.status === "CANCELLED_PO" ? "bg-muted" : "bg-blue-50 text-blue-700 border-blue-200"}>
                    {invoiceDetail.status === "CANCELLED_PO" ? "CANCELLED" : invoiceDetail.status}
                  </Badge>
                  {invoiceDetail.expectedDeliveryDate && (
                    <p className="text-xs text-muted-foreground">Expected: {new Date(invoiceDetail.expectedDeliveryDate).toLocaleDateString()}</p>
                  )}
                  {invoiceDetail.actualDeliveryDate && (
                    <p className="text-xs text-emerald-600">Received: {new Date(invoiceDetail.actualDeliveryDate).toLocaleDateString()}</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Line Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Array.isArray(invoiceDetail.items) && invoiceDetail.items.length > 0 ? (
                      invoiceDetail.items.map((it: any, idx: number) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{it.productName || "Unknown product"}</TableCell>
                          <TableCell className="text-right">
                            {it.quantity}
                            {invoiceDetail.status === "RECEIVED" && it.receivedQuantity != null && (
                              <span className="text-xs text-muted-foreground ml-1">({it.receivedQuantity} received)</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{Number(it.unitCost || 0).toLocaleString()} RWF</TableCell>
                          <TableCell className="text-right font-semibold">{Number(it.lineTotal || 0).toLocaleString()} RWF</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                          Line items aren't available for this order.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end">
                <div className="w-56 space-y-1 text-sm">
                  <div className="flex justify-between font-bold text-base pt-2 border-t border-border">
                    <span>Total</span>
                    <span className="text-emerald-600">{Number(invoiceDetail.totalAmount || 0).toLocaleString()} RWF</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-muted-foreground">Could not load this invoice.</div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceOrder(null)} className="rounded-xl">Close</Button>
            {invoiceDetail?.invoiceDocumentUrl && (
              <Button asChild className="bg-[#0aa9ad] hover:bg-[#07969a] rounded-xl gap-2">
                <a href={resolveFileUrl(invoiceDetail.invoiceDocumentUrl)} target="_blank" rel="noopener noreferrer">
                  <FileDown className="w-4 h-4" /> View PDF Invoice
                </a>
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </PageTransition>
  );
}
