import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Edit, Save, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export default function EditInventoryPage() {
  const { success, error } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [productId, setProductId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    productName: "",
    reorderLevel: 10,
    batchNumber: "",
    expiryDate: "",
    unitCost: 0,
    sellingPrice: 0,
  });

  const { data: batch, isLoading: isLoadingBatch } = useQuery({
    queryKey: ["product-batch", id],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any }>(`/api/product-batches/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const { data: product, isLoading: isLoadingProduct } = useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      const res = await api.get<any>(`/api/products?id=${productId}`);
      return res;
    },
    enabled: !!productId,
  });

  useEffect(() => {
    if (batch) {
      setProductId(batch.productId || batch.product_id);
    }
  }, [batch]);

  useEffect(() => {
    if (batch) {
      setFormData({
        productName: product ? product.name : (batch.productName || ""),
        reorderLevel: product ? (product.reorderLevel || product.reorder_level || 10) : 10,
        batchNumber: batch.batchNumber || batch.batch_number || "",
        expiryDate: batch.expiryDate || batch.expiry_date ? (batch.expiryDate || batch.expiry_date).split('T')[0] : "",
        unitCost: batch.unitCost || batch.unit_cost || 0,
        sellingPrice: batch.sellingPrice || batch.selling_price || 0,
      });
    }
  }, [batch, product]);

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await api.put(`/api/products?id=${id}`, data);
    }
  });

  const updateBatchMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      await api.put(`/api/product-batches/${id}`, data);
    },
    onSuccess: () => {
      success("Inventory Updated", `${formData.productName} batch details have been updated.`);
      queryClient.invalidateQueries({ queryKey: ["product-batches"] });
      queryClient.invalidateQueries({ queryKey: ["product-batch", id] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      navigate("/dashboard/inventory");
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to update inventory.");
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !productId) return;

    try {
      if (product) {
        await updateProductMutation.mutateAsync({
          id: productId,
          data: {
            ...product,
            name: formData.productName,
            reorderLevel: formData.reorderLevel,
          }
        });
      }

      await updateBatchMutation.mutateAsync({
        id,
        data: {
          batchNumber: formData.batchNumber,
          expiryDate: formData.expiryDate,
          unitCost: formData.unitCost,
          sellingPrice: formData.sellingPrice,
        }
      });
    } catch (err) {
      // Errors handled by mutation callbacks
    }
  };

  const isLoading = isLoadingBatch || (!!productId && isLoadingProduct);

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
        <h1 className="text-2xl font-bold text-foreground">Edit Batch & Product</h1>
        <p className="text-sm text-muted-foreground">Update pricing and details for this batch.</p>
      </div>

      <Card className="border-border shadow-sm rounded-2xl">
        <CardHeader className="border-b border-border pb-4 bg-background/50 rounded-t-2xl">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Edit className="h-5 w-5 text-[#0aa9ad]" />
            Batch Details
          </CardTitle>
          <CardDescription>Note: Editing the product name updates it for all batches.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                  </div>
                ))}
              </div>
              <div className="pt-6 border-t border-border flex justify-end gap-3">
                <Skeleton className="h-10 w-24 rounded-xl" />
                <Skeleton className="h-10 w-36 rounded-xl" />
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-3">
                  <Label htmlFor="productName" className="text-slate-700 font-medium">Product Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="productName"
                    required
                    className="rounded-xl border-border focus-visible:ring-[#0aa9ad]"
                    value={formData.productName}
                    onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  />
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="reorderLevel" className="text-slate-700 font-medium">Reorder Level (Product-wide)</Label>
                  <Input
                    id="reorderLevel"
                    type="number"
                    className="rounded-xl border-border focus-visible:ring-[#0aa9ad]"
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: Number(e.target.value) })}
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="batchNumber" className="text-slate-700 font-medium">Batch / Lot Number</Label>
                  <Input
                    id="batchNumber"
                    className="rounded-xl border-border focus-visible:ring-[#0aa9ad]"
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                  />
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="expiryDate" className="text-slate-700 font-medium">Expiry Date</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    className="rounded-xl border-border focus-visible:ring-[#0aa9ad]"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                  />
                </div>

                <div className="space-y-3">
                  <Label htmlFor="unitCost" className="text-slate-700 font-medium">Unit Cost</Label>
                  <Input
                    id="unitCost"
                    type="number"
                    className="rounded-xl border-border focus-visible:ring-[#0aa9ad]"
                    value={formData.unitCost}
                    onChange={(e) => setFormData({ ...formData, unitCost: Number(e.target.value) })}
                  />
                </div>
                
                <div className="space-y-3">
                  <Label htmlFor="sellingPrice" className="text-slate-700 font-medium">Selling Price (RWF) <span className="text-red-500">*</span></Label>
                  <Input
                    id="sellingPrice"
                    type="number"
                    required
                    className="rounded-xl border-border focus-visible:ring-[#0aa9ad]"
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: Number(e.target.value) })}
                  />
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
                  disabled={updateBatchMutation.isPending || updateProductMutation.isPending}
                >
                  {(updateBatchMutation.isPending || updateProductMutation.isPending) ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Save className="mr-2 h-4 w-4" /> Save Changes</>}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
