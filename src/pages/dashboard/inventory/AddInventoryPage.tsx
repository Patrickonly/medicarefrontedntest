import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, PackagePlus, Save, Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AddInventoryPage() {
  const { success, error } = useToast();
  const navigate = useNavigate();
  const { organizationId, user } = useAuth();
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ["categories", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/products/categories");
      return Array.isArray(res) ? res : (res?.results || res?.data || []);
    },
    enabled: !!organizationId,
  });

  const [formData, setFormData] = useState({
    productName: "",
    categoryId: "new",
    newCategoryName: "",
    unitOfMeasure: "Pieces",
    reorderLevel: 10,
    batchNumber: "",
    expiryDate: "",
    quantity: 0,
    unitCost: 0,
    sellingPrice: 0,
  });

  const receiveMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post<{ success: boolean; data: any }>("/api/inventory/receive", data);
      return res.data;
    },
    onSuccess: () => {
      success("Stock Received", `Successfully added ${formData.quantity} units of ${formData.productName}.`);
      queryClient.invalidateQueries({ queryKey: ["product-batches"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      navigate("/dashboard/inventory");
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to record inventory.");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId || !user) return;

    if (formData.categoryId === "new" && !formData.newCategoryName) {
      error("Error", "Category name required");
      return;
    }

    receiveMutation.mutate({
      organizationId,
      userId: user.id,
      productName: formData.productName,
      categoryId: formData.categoryId === "new" ? null : formData.categoryId,
      newCategoryName: formData.categoryId === "new" ? formData.newCategoryName : null,
      unitOfMeasure: formData.unitOfMeasure,
      reorderLevel: formData.reorderLevel,
      batchNumber: formData.batchNumber || `B-${Date.now().toString().slice(-6)}`,
      expiryDate: formData.expiryDate,
      quantity: formData.quantity,
      unitCost: formData.unitCost,
      sellingPrice: formData.sellingPrice,
    });
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard/inventory")}
          className="mb-4 text-muted-foreground hover:text-foreground -ml-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Inventory
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Goods Received Note (GRN)</h1>
        <p className="text-sm text-muted-foreground">Record new stock batches arriving from suppliers.</p>
      </div>

      <Card className="border-border shadow-sm rounded-2xl">
        <CardHeader className="border-b border-border pb-4 bg-background/50 rounded-t-2xl">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-[#0aa9ad]" />
            Product Details
          </CardTitle>
          <CardDescription>Enter product tracking and pricing details.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="bg-muted p-4 rounded-xl border border-border space-y-4">
              <h3 className="font-semibold text-slate-700">1. Product Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label htmlFor="productName" className="text-slate-700 font-medium">Product Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="productName"
                    required
                    placeholder="e.g. Paracetamol 500mg"
                    className="rounded-xl border-border bg-card"
                    value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="category" className="text-slate-700 font-medium">Category <span className="text-red-500">*</span></Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(val) => setFormData({ ...formData, categoryId: val })}
                  >
                    <SelectTrigger className="rounded-xl border-border bg-card">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">+ Create New Category</SelectItem>
                      {categories.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {formData.categoryId === "new" && (
                    <Input 
                      placeholder="Enter new category name..."
                      className="mt-2 rounded-xl bg-card"
                      value={formData.newCategoryName}
                      onChange={e => setFormData({ ...formData, newCategoryName: e.target.value })}
                    />
                  )}
                </div>

                <div className="space-y-3">
                  <Label htmlFor="uom" className="text-slate-700 font-medium">Unit of Measure</Label>
                  <Input
                    id="uom"
                    placeholder="e.g. Kgs, Bottles, Pieces"
                    className="rounded-xl border-border bg-card"
                    value={formData.unitOfMeasure}
                    onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="reorder" className="text-slate-700 font-medium">Reorder Level</Label>
                  <Input
                    id="reorder"
                    type="number"
                    className="rounded-xl border-border bg-card"
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 space-y-4">
              <h3 className="font-semibold text-slate-700">2. Batch Tracking & Costing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label htmlFor="batchNumber" className="text-slate-700 font-medium">Batch / Lot Number</Label>
                  <Input
                    id="batchNumber"
                    placeholder="Auto-generated if empty"
                    className="rounded-xl border-emerald-200 bg-card"
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="expiryDate" className="text-slate-700 font-medium">Expiry Date <span className="text-red-500">*</span></Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    required
                    className="rounded-xl border-emerald-200 bg-card"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="quantity" className="text-slate-700 font-medium">Quantity Received <span className="text-red-500">*</span></Label>
                  <Input
                    id="quantity"
                    type="number"
                    required
                    min="1"
                    className="rounded-xl border-emerald-200 bg-card"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="unitPrice" className="text-slate-700 font-medium">Unit Cost (RWF)</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    className="rounded-xl border-emerald-200 bg-card"
                    value={formData.unitCost}
                    onChange={(e) => setFormData({ ...formData, unitCost: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-3 md:col-span-2">
                  <Label htmlFor="sellingPrice" className="text-slate-700 font-medium">Selling Price (RWF) <span className="text-red-500">*</span></Label>
                  <Input
                    id="sellingPrice"
                    type="number"
                    required
                    className="rounded-xl border-emerald-200 bg-card"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                  />
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-border flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => navigate("/dashboard/inventory")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-xl bg-[#0aa9ad] hover:bg-[#07969a] text-white shadow-md shadow-teal-900/10"
                disabled={receiveMutation.isPending || isLoadingCategories}
              >
                {receiveMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Save className="mr-2 h-4 w-4" /> Save Product & Batch</>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
