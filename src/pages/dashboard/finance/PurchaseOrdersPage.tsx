import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, Edit2, Plus, Trash2, Loader2, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface OrderItemDraft {
  productId: string;
  quantity: number;
  unitCost: number;
}

const emptyItem: OrderItemDraft = { productId: "", quantity: 1, unitCost: 0 };

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
      return res || [];
    },
    enabled: !!organizationId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/products");
      return res || [];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post("/api/purchases", data);
      return res.data;
    },
    onSuccess: () => {
      success("Success", { description: "Purchase order created." });
      closeCreateDialog();
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
    onError: (err: any) => {
      error("Error", { description: err.message || "Failed to create order." });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.put(`/api/purchases?id=${id}`, { status });
      return res.data;
    },
    onSuccess: () => {
      success("Success", { description: "Purchase order status updated." });
      setStatusOrder(null);
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
    onError: (err: any) => {
      error("Error", { description: err.message || "Failed to update order." });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.del(`/api/purchases?id=${id}`);
    },
    onSuccess: () => {
      success("Deleted", { description: "Order removed." });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    },
    onError: (err: any) => {
      error("Error", { description: err.message || "Failed to delete order." });
    }
  });

  // Receiving stock against a PO is a workflow action, not a status edit — it
  // goes through /api/purchases with an action body and actually moves stock,
  // unlike a plain PUT which only ever updates the status field.
  const receiveMutation = useMutation({
    mutationFn: async ({ id, branchId }: { id: string; branchId: string }) => {
      const res = await api.post("/api/purchases", {
        action: "RECEIVE",
        purchaseOrderId: id,
        branchId,
      });
      return res.data;
    },
    onSuccess: () => {
      success("Success", { description: "Purchase order received into stock." });
      setReceivingOrder(null);
      setReceiveBranchId("");
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["product-batches"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
    onError: (err: any) => {
      error("Error", { description: err.message || "Failed to receive order." });
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
      error("Error", { description: "Supplier is required" });
      return;
    }
    const validItems = items.filter((it) => it.productId && it.quantity > 0);
    if (validItems.length === 0) {
      error("Error", { description: "Add at least one item with a product and quantity." });
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
    if (!receiveBranchId.trim()) {
      error("Error", { description: "Branch ID is required to receive stock." });
      return;
    }
    receiveMutation.mutate({ id: receivingOrder.id, branchId: receiveBranchId.trim() });
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const isLoading = isOrdersLoading || isSuppliersLoading;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Purchase Orders</h1>
          <p className="text-slate-500">Manage orders placed to your suppliers.</p>
        </div>
        <Button onClick={openCreateDialog} className="bg-[#0aa9ad] hover:bg-[#07969a] rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> Create PO
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm rounded-2xl">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
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
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : orders.map((order: any) => (
                <TableRow key={order.id}>
                  <TableCell>{order.createdAt ? new Date(order.createdAt).toLocaleString() : "-"}</TableCell>
                  <TableCell className="font-semibold">{order.supplierName || "Unknown"}</TableCell>
                  <TableCell className="font-bold text-emerald-600">{Number(order.totalAmount || 0).toLocaleString()} RWF</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={order.status === "RECEIVED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : order.status === "CANCELLED" ? "bg-slate-100" : "bg-blue-50 text-blue-700 border-blue-200"}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {order.status !== "RECEIVED" && order.status !== "CANCELLED" && (
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
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">No purchase orders found.</TableCell>
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
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-[1fr_100px_120px_32px] gap-2 items-center">
                  <Select value={item.productId} onValueChange={(val) => updateItemRow(index, { productId: val })}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                    className="text-slate-400 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <p className="text-sm font-bold text-slate-900">Total: {orderTotal.toLocaleString()} RWF</p>
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
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  {statusOrder?.status === "RECEIVED" && <SelectItem value="RECEIVED">Received</SelectItem>}
                </SelectContent>
              </Select>
              {statusOrder?.status === "RECEIVED" && (
                <p className="text-xs text-slate-500">A received order's status can't be changed here.</p>
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
            <p className="text-sm text-slate-500">
              Receiving posts the ordered items into stock for the branch below.
            </p>
            <div className="space-y-2">
              <Label>Branch ID *</Label>
              <Input
                placeholder="Enter the receiving branch's ID"
                value={receiveBranchId}
                onChange={(e) => setReceiveBranchId(e.target.value)}
                className="rounded-xl"
              />
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
    </div>
  );
}
