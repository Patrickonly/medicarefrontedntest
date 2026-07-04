import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Edit2, Plus, Trash2, Loader2, UserCheck, UserX } from "lucide-react";
import { useState } from "react";
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
  
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  
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

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post("/api/products", data);
      return res.data;
    },
    onSuccess: () => {
      success("Success", "Product added.");
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setIsDialogOpen(false);
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
    },
    onError: (err: any) => error("Error", err.message || "Failed to delete product"),
  });

  const handleOpenDialog = (prod: any = null) => {
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
    if (!organizationId) return;
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

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this product? This could affect inventory batches and sales history.")) {
      deleteMutation.mutate(id);
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
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products Master List</h1>
          <p className="text-slate-500">Define the core products before receiving batches in inventory.</p>
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
                <TableHead>Product Name</TableHead>
                <TableHead>Barcode</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>UoM</TableHead>
                <TableHead>Reorder Level</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[150px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length > 0 ? paginatedData.map((p: any, index: number) => {
                const prod = filtered.find(fp => fp.name === p.name && fp.barcode === p.barcode) || filtered[index];
                const rowId = String(prod?.id ?? p.name);
                return (
                <TableRow key={prod.id || index}>
                  {selection && (
                    <TableCell className="pl-5">
                      <Checkbox
                        checked={selection.isSelected(rowId)}
                        onCheckedChange={() => selection.toggle(rowId)}
                        aria-label={`Select ${prod.name}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-bold text-slate-900">{prod.name}</TableCell>
                  <TableCell className="text-slate-500">{prod.barcode || "-"}</TableCell>
                  <TableCell className="text-slate-500">{getCategoryName(prod.categoryId)}</TableCell>
                  <TableCell className="text-slate-500">{prod.unitOfMeasure || "-"}</TableCell>
                  <TableCell className="text-slate-500">{prod.stock?.reorderLevel ?? "-"}</TableCell>
                  <TableCell>
                    {prod.status === "ACTIVE" ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Active</Badge>
                    ) : (
                      <Badge className="bg-slate-50 text-slate-500 border-slate-200">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(prod)} className="text-blue-600">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(prod.id)}
                      className="text-red-600"
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending && deleteMutation.variables === prod.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={selection ? 8 : 7} className="text-center py-8 text-slate-500">No products found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-2xl max-w-md">
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
                    <SelectItem value="Kg">Kg</SelectItem>
                    <SelectItem value="Liter">Liter</SelectItem>
                    <SelectItem value="Pack">Pack</SelectItem>
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
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                    {categories.length === 0 && (
                      <SelectItem value="none" disabled>No Categories available</SelectItem>
                    )}
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
