import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Edit2, Plus, Trash2, Loader2, UserCheck, UserX, CheckCircle2, PackagePlus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { AdvancedDataTable, type BulkActionOption } from "@/components/shared/AdvancedDataTable";

export default function ProductsPage() {
  const { success, error } = useToast();
  const { organizationId, isAgrovetOrg } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productToDelete, setProductToDelete] = useState<any>(null);
  const [successState, setSuccessState] = useState<any>(null);
  
  const [formData, setFormData] = useState({ 
    name: "", 
    categoryId: "",
    barcode: "",
    unitOfMeasure: "Piece",
    reorderLevel: 10,
    isActive: true
  });

  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ["products", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/products");
      return Array.isArray(res) ? res : (res?.results || res?.data || []);
    },
    enabled: !!organizationId,
  });

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ["categories", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/products/categories");
      return Array.isArray(res) ? res : (res?.results || res?.data || []);
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post("/api/products", data);
      return res.data;
    },
    onSuccess: (data: any) => {
      success("Success", "Product added.");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setSuccessState(data?.id ? data : formData);
    },
    onError: (err: any) => error("Error", err.message || "Failed to add product"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.put(`/api/products?id=${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      success("Success", "Product updated.");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsDialogOpen(false);
    },
    onError: (err: any) => error("Error", err.message || "Failed to update product"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/products?id=${id}`);
    },
    onSuccess: () => {
      success("Success", "Product removed.");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setProductToDelete(null);
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to delete product");
      setProductToDelete(null);
    },
  });

  const handleOpenDialog = (prod: any = null) => {
    setSuccessState(null);
    setEditingProduct(prod);
    setFormData({ 
      name: prod ? prod.name : "",
      categoryId: prod ? prod.categoryId : "",
      barcode: prod ? prod.barcode : "",
      unitOfMeasure: prod ? (prod.unitOfMeasure || "Piece") : "Piece",
      reorderLevel: prod ? (prod.stock?.reorderLevel ?? 10) : 10,
      isActive: prod ? prod.status === "ACTIVE" : true
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!organizationId) {
      error("Error", "No organization selected. Please reload and try again.");
      return;
    }
    if (!formData.name || !formData.categoryId) {
      error("Error", "Name and Category are required");
      return;
    }

    const payload = {
      name: formData.name,
      category_id: formData.categoryId,
      barcode: formData.barcode,
      unit_of_measure: formData.unitOfMeasure,
      reorder_level: formData.reorderLevel,
      status: formData.isActive ? "ACTIVE" : "INACTIVE",
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const filtered = products.filter((p: any) =>
    (p.name && p.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.barcode && p.barcode.includes(searchQuery))
  );

  const getCategoryName = (id: string) => {
    const cat = categories.find((c: any) => c.id === id);
    return cat ? cat.name : "Unknown Category";
  };

  const isLoading = isLoadingProducts || isLoadingCategories;

  const exportColumns = [
    { key: "name", label: "Product Name" },
    { key: "barcode", label: "Barcode" },
    { key: "category", label: "Category" },
    { key: "uom", label: "UoM" },
    { key: "reorderLevel", label: "Reorder Level" },
    { key: "status", label: "Status" },
  ];

  const exportData = filtered.map((p: any) => ({
    name: p.name,
    barcode: p.barcode || "-",
    category: getCategoryName(p.categoryId),
    uom: p.unitOfMeasure || "-",
    reorderLevel: p.stock?.reorderLevel ?? "-",
    status: p.status === "ACTIVE" ? "Active" : "Inactive",
  }));

  const bulkActions: BulkActionOption[] = [
    { label: "Activate", status: "ACTIVE", icon: UserCheck },
    { label: "Deactivate", status: "INACTIVE", icon: UserX, confirmMessage: "This will deactivate the selected products." },
    { label: "Delete", icon: Trash2, variant: "destructive", confirmMessage: "This will permanently delete the selected products. This action cannot be undone." },
  ];

  const handleBulkAction = async (action: BulkActionOption, ids: string[]) => {
    const body = action.label === "Delete"
      ? { action: "DELETE", ids }
      : { action: "STATUS", ids, status: action.status };
    try {
      const res = await api.post<{ success: boolean; data: { total: number; succeeded: number; failed: number } }>(
        "/api/agrovet/bulk/products",
        body
      );
      const { succeeded = 0, failed = 0 } = res.data || {};
      queryClient.invalidateQueries({ queryKey: ["products"] });
      if (failed > 0) {
        error("Partially completed", `${succeeded} succeeded, ${failed} failed.`);
      } else {
        success("Success", `${action.label} applied to ${succeeded} product${succeeded === 1 ? "" : "s"}.`);
      }
    } catch (err: any) {
      error("Error", err.message || `Failed to ${action.label.toLowerCase()} selected products`);
    }
  };

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Products Master List</h1>
          <p className="text-muted-foreground">Define the core products before receiving batches in inventory.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-[#0aa9ad] hover:bg-[#07969a] rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> Add Product
        </Button>
      </div>

      <AdvancedDataTable
        title="Products Dictionary"
        description="Define the core products before receiving batches in inventory."
        data={exportData}
        exportColumns={exportColumns}
        exportFilename={`Products_Export_${new Date().toISOString().split('T')[0]}`}
        searchTerm={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by name or barcode..."
        pageSize={10}
        allowPageSizeChange
        isLoading={isLoading}
        getRowId={isAgrovetOrg ? (p: any) => String(filtered.find(fp => fp.name === p.name && fp.barcode === p.barcode)?.id ?? p.name) : undefined}
        bulkActions={isAgrovetOrg ? bulkActions : undefined}
        onBulkAction={isAgrovetOrg ? handleBulkAction : undefined}
        renderTable={(paginatedData, selection) => (
          <Table>
            <TableHeader>
              <TableRow>
                {selection && (
                  <TableHead className="w-10 pl-5">
                    <Checkbox
                      checked={paginatedData.length > 0 && paginatedData.every((p: any, i: number) => {
                        const orig = filtered.find(fp => fp.name === p.name && fp.barcode === p.barcode) || filtered[i];
                        return selection.isSelected(String(orig?.id ?? p.name));
                      })}
                      onCheckedChange={() =>
                        selection.toggleAll(
                          paginatedData.map((p: any, i: number) => {
                            const orig = filtered.find(fp => fp.name === p.name && fp.barcode === p.barcode) || filtered[i];
                            return String(orig?.id ?? p.name);
                          })
                        )
                      }
                      aria-label="Select all"
                    />
                  </TableHead>
                )}
                <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Product Name</TableHead>
                <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Barcode</TableHead>
                <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Category</TableHead>
                <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider">UoM</TableHead>
                <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Reorder Level</TableHead>
                <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider">Status</TableHead>
                <TableHead className="w-[150px] text-right font-bold text-muted-foreground text-[11px] uppercase tracking-wider pr-6">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length > 0 ? paginatedData.map((p: any, index: number) => {
                const prod = filtered.find(fp => fp.name === p.name && fp.barcode === p.barcode) || filtered[index];
                const rowId = String(prod?.id ?? p.name);
                return (
                <TableRow key={prod.id || index} className="border-b border-slate-50 hover:bg-background/80 transition-colors">
                  {selection && (
                    <TableCell className="pl-5">
                      <Checkbox
                        checked={selection.isSelected(rowId)}
                        onCheckedChange={() => selection.toggle(rowId)}
                        aria-label={`Select ${prod.name}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="text-sm font-semibold text-slate-700">{prod.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{prod.barcode || "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{getCategoryName(prod.categoryId)}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{prod.unitOfMeasure || "-"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{prod.stock?.reorderLevel ?? "-"}</TableCell>
                  <TableCell>
                    {prod.status === "ACTIVE" ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#ecfdf5] text-[#10b981] uppercase tracking-wide">Active</span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-muted text-muted-foreground uppercase tracking-wide">Inactive</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="outline" size="icon" className="h-7 w-7 rounded border-blue-200 text-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-colors shadow-sm" title="Edit" onClick={() => handleOpenDialog(prod)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 rounded border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm"
                        title="Delete"
                        onClick={() => setProductToDelete(prod)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={selection ? 8 : 7} className="text-center py-8 text-muted-foreground">No products found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          {successState ? (
            <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <DialogTitle className="text-2xl font-bold text-emerald-700">Product Added!</DialogTitle>
              <DialogDescription className="text-base">
                <span className="font-bold text-foreground">{successState.name || successState.productName}</span> was successfully added to your master catalog.
                <br /><br />
                Would you like to add initial stock for this product now?
              </DialogDescription>
              <div className="flex flex-col sm:flex-row gap-3 w-full pt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="flex-1 rounded-xl h-12 font-bold">
                  Continue Later
                </Button>
                <Button 
                  onClick={() => {
                    setIsDialogOpen(false);
                    navigate("/dashboard/inventory/add", { state: { predefinedProductName: successState.name || successState.productName, predefinedCategoryId: successState.categoryId } });
                  }} 
                  className="flex-1 bg-[#0aa9ad] hover:bg-[#07969a] text-white rounded-xl h-12 font-bold shadow-sm"
                >
                  <PackagePlus className="w-5 h-5 mr-2" />
                  Add Stock Now
                </Button>
              </div>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>{editingProduct ? "Edit Product" : "Add Product"}</DialogTitle>
                <DialogDescription>
                  Define the master product record. Batches and pricing will be handled in inventory.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Product Name *</Label>
                  <Input 
                    value={formData.name} 
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g. Amoxil 500mg"
                    className="rounded-xl"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Barcode</Label>
                    <Input 
                      value={formData.barcode} 
                      onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                      placeholder="Optional"
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unit of Measure *</Label>
                    <Select 
                      value={formData.unitOfMeasure} 
                      onValueChange={(val) => setFormData({...formData, unitOfMeasure: val})}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select UoM" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Piece">Piece</SelectItem>
                        <SelectItem value="Box">Box</SelectItem>
                        <SelectItem value="Bottle">Bottle</SelectItem>
                        <SelectItem value="Pack">Pack</SelectItem>
                        <SelectItem value="Vial">Vial</SelectItem>
                        <SelectItem value="Ampoule">Ampoule</SelectItem>
                        <SelectItem value="Tube">Tube</SelectItem>
                        <SelectItem value="Sachet">Sachet</SelectItem>
                        <SelectItem value="Carton">Carton</SelectItem>
                        <SelectItem value="Roll">Roll</SelectItem>
                        <SelectItem value="Sheet">Sheet</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category *</Label>
                    <Select 
                      value={formData.categoryId} 
                      onValueChange={(val) => setFormData({...formData, categoryId: val})}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat: any) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Reorder Level</Label>
                    <Input 
                      type="number"
                      value={formData.reorderLevel} 
                      onChange={(e) => setFormData({...formData, reorderLevel: parseInt(e.target.value) || 0})}
                      className="rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <Switch 
                    checked={formData.isActive} 
                    onCheckedChange={(val) => setFormData({...formData, isActive: val})}
                    id="active"
                  />
                  <Label htmlFor="active">Product is Active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">Cancel</Button>
                <Button 
                  onClick={handleSave} 
                  className="bg-[#0aa9ad] hover:bg-[#07969a] rounded-xl"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!productToDelete} onOpenChange={(open) => !open && setProductToDelete(null)}>
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black text-foreground">Delete Product</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-medium mt-2">
              Are you sure you want to delete <span className="font-bold text-foreground">{productToDelete?.name}</span>? This could affect inventory batches and sales history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3 sm:gap-0">
            <AlertDialogCancel className="rounded-xl border-border font-bold h-11 hover:bg-muted">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (productToDelete?.id) deleteMutation.mutate(productToDelete.id);
              }}
              className="bg-red-600 hover:bg-red-700 rounded-xl font-bold h-11"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              {deleteMutation.isPending ? "Deleting..." : "Delete Product"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
