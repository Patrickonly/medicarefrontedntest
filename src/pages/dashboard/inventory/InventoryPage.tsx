import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Download, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function InventoryPage() {
  const { success, error } = useToast();
  const { organizationId, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [selectedBatchForAdjust, setSelectedBatchForAdjust] = useState<any>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState("damage");

  const { data: batches = [], isLoading: isLoadingBatches } = useQuery({
    queryKey: ["product-batches", organizationId],
    queryFn: async () => {
      const res = await api.get("/api/product-batches");
      const b = res.data || [];
      b.sort((a: any, b: any) => {
        if (!a.expiryDate && !a.expiry_date) return 1;
        if (!b.expiryDate && !b.expiry_date) return -1;
        return new Date(a.expiryDate || a.expiry_date).getTime() - new Date(b.expiryDate || b.expiry_date).getTime();
      });
      return b;
    },
    enabled: !!organizationId,
  });

  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/products");
      return res || [];
    },
    enabled: !!organizationId,
  });

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ["categories", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/products/categories");
      return res || [];
    },
    enabled: !!organizationId,
  });

  const deleteBatchMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/product-batches/${id}`);
    },
    onSuccess: () => {
      success("Success", "Batch deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["product-batches"] });
    },
    onError: (err: any) => error("Error", err.message || "Failed to delete batch"),
  });

  const adjustStockMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.post(`/api/product-batches/${id}/adjust`, data);
      return res.data;
    },
    onSuccess: () => {
      success("Success", "Stock adjusted successfully.");
      queryClient.invalidateQueries({ queryKey: ["product-batches"] });
      setIsAdjustDialogOpen(false);
    },
    onError: (err: any) => error("Error", err.message || "Failed to adjust stock"),
  });

  const getFullItem = (batch: any) => {
    const product = products.find((p: any) => p.id === (batch.productId || batch.product_id)) || { name: "Unknown Product", categoryId: "", reorderLevel: 10 };
    const category = categories.find((c: any) => c.id === (product.categoryId || product.category_id)) || { name: "Unknown Category" };
    return {
      ...batch,
      productName: product.name,
      categoryName: category.name,
      reorderLevel: product.reorderLevel || product.reorder_level || 10
    };
  };

  const handleDeleteBatch = (id: string) => {
    deleteBatchMutation.mutate(id);
  };

  const handleAdjustStock = () => {
    if (!selectedBatchForAdjust || !user) return;
    
    const currentQty = selectedBatchForAdjust.quantityRemaining || selectedBatchForAdjust.quantity_remaining;
    const newQty = currentQty + adjustQty;
    if (newQty < 0) {
      error("Error", "Stock cannot be negative.");
      return;
    }

    adjustStockMutation.mutate({
      id: selectedBatchForAdjust.id,
      data: {
        adjustmentQuantity: adjustQty,
        reason: adjustReason,
        userId: user.id
      }
    });
  };

  const openAdjustDialog = (item: any) => {
    setSelectedBatchForAdjust(item);
    setAdjustQty(0);
    setAdjustReason("damage");
    setIsAdjustDialogOpen(true);
  };

  const checkExpiryStatus = (dateStr: string) => {
    if (!dateStr) return { label: "N/A", color: "text-slate-500" };
    const days = Math.ceil((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    if (days < 0) return { label: "Expired", color: "text-red-600 font-bold" };
    if (days <= 30) return { label: `${days} days left`, color: "text-orange-600 font-bold" };
    return { label: new Date(dateStr).toLocaleDateString(), color: "text-slate-600" };
  };

  const enrichedItems = batches.map(getFullItem);
  const filteredItems = enrichedItems.filter((item: any) => 
    (item.productName && item.productName.toLowerCase().includes(searchQuery.toLowerCase())) || 
    (item.categoryName && item.categoryName.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.batchNumber || item.batch_number || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isLoading = isLoadingBatches || isLoadingProducts || isLoadingCategories;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory Management</h1>
          <p className="text-slate-500">Real-time stock monitoring, Batch/Lot & FEFO tracking</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="bg-white">
            <Download className="w-4 h-4 mr-2" /> Audit Trail
          </Button>
          <Button onClick={() => navigate("/dashboard/inventory/add")} className="bg-[#0aa9ad] hover:bg-[#07969a]">
            <Plus className="w-4 h-4 mr-2" /> Receive Stock (GRN)
          </Button>
        </div>
      </div>

      <div className="grid gap-6 mb-8">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3">
            <CardTitle className="text-lg flex flex-col sm:flex-row sm:items-center gap-3">
              <span>Stock Levels (Batches)</span>
              <span className="text-[10px] font-normal text-slate-500 bg-white px-2 py-1 rounded-md border border-slate-200 uppercase tracking-wider">Sorted by FEFO</span>
            </CardTitle>
            <div className="w-full sm:w-72">
              <Input 
                placeholder="Search products or batches..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="font-semibold text-slate-700">Product</TableHead>
                  <TableHead className="font-semibold text-slate-700">Batch & Expiry</TableHead>
                  <TableHead className="font-semibold text-slate-700">Quantity</TableHead>
                  <TableHead className="font-semibold text-slate-700">Value</TableHead>
                  <TableHead className="font-semibold text-slate-700">Status</TableHead>
                  <TableHead className="font-semibold text-right text-slate-700">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                    </TableCell>
                  </TableRow>
                ) : filteredItems.map((item: any) => {
                  const expiryInfo = checkExpiryStatus(item.expiryDate || item.expiry_date);
                  const qtyRemaining = item.quantityRemaining ?? item.quantity_remaining ?? 0;
                  const status = qtyRemaining === 0 ? "out_of_stock" : 
                                 qtyRemaining <= item.reorderLevel ? "low_stock" : "in_stock";
                  const sellingPrice = item.sellingPrice || item.selling_price || 0;
                  
                  return (
                    <TableRow key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <TableCell>
                        <p className="font-bold text-slate-900">{item.productName}</p>
                        <p className="text-xs text-slate-400">{item.categoryName}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-slate-700 font-medium">Batch: {item.batchNumber || item.batch_number}</p>
                        <p className={`text-xs mt-0.5 ${expiryInfo.color} flex items-center gap-1`}>
                          {expiryInfo.label === "Expired" || expiryInfo.label.includes("days left") ? <AlertTriangle className="w-3 h-3" /> : null}
                          Exp: {expiryInfo.label}
                        </p>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold">{qtyRemaining}</span>
                        <span className="text-xs text-slate-400 ml-1">units</span>
                      </TableCell>
                      <TableCell>
                        <p>{sellingPrice.toLocaleString()} RWF</p>
                        <p className="text-xs text-slate-400">Total: {(qtyRemaining * sellingPrice).toLocaleString()} RWF</p>
                      </TableCell>
                      <TableCell>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          status === "in_stock" ? "bg-emerald-100 text-emerald-700" :
                          status === "low_stock" ? "bg-orange-100 text-orange-700" :
                          "bg-red-100 text-red-700"
                        }`}>
                          {status.replace("_", " ")}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openAdjustDialog(item)} className="text-slate-500 hover:text-blue-600">
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-slate-500 hover:text-red-600">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete batch {item.batchNumber || item.batch_number}.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteBatch(item.id)} className="bg-red-600 hover:bg-red-700" disabled={deleteBatchMutation.isPending}>
                                  {deleteBatchMutation.isPending && deleteBatchMutation.variables === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!isLoading && filteredItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                      {searchQuery ? "No batches found matching search." : "No inventory found. Click 'Receive Stock' to add batches."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Adjust Stock Dialog */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Adjust Batch Level</DialogTitle>
          </DialogHeader>
          {selectedBatchForAdjust && (
            <div className="py-4 space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">{selectedBatchForAdjust.productName}</p>
                <p className="text-xs text-slate-500">Batch {selectedBatchForAdjust.batchNumber || selectedBatchForAdjust.batch_number} - Current Stock: {selectedBatchForAdjust.quantityRemaining ?? selectedBatchForAdjust.quantity_remaining}</p>
              </div>
              <div className="space-y-2">
                <Label>Adjustment Quantity (+ or -)</Label>
                <Input 
                  type="number" 
                  value={adjustQty} 
                  onChange={(e) => setAdjustQty(Number(e.target.value))} 
                  placeholder="-5 or +10"
                />
                <p className="text-xs text-slate-400">New Total will be: {(selectedBatchForAdjust.quantityRemaining ?? selectedBatchForAdjust.quantity_remaining) + adjustQty}</p>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Select value={adjustReason} onValueChange={setAdjustReason}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="damage">Damaged/Spoiled</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="audit">Audit Correction</SelectItem>
                    <SelectItem value="internal">Internal Use</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAdjustDialogOpen(false)}>Cancel</Button>
            <Button className="bg-[#09111f]" onClick={handleAdjustStock} disabled={adjustStockMutation.isPending}>
              {adjustStockMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
