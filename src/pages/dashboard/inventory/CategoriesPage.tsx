import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Edit2, ListTree, Plus, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CategoriesPage() {
  const { success, error } = useToast();
  const { organizationId } = useAuth();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", productTypeId: "" });

  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ["categories", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/products/categories");
      return res || [];
    },
    enabled: !!organizationId,
  });

  const { data: productTypes = [], isLoading: isLoadingProductTypes } = useQuery({
    queryKey: ["product-types", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/products/types");
      return res || [];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post("/api/products/categories", data);
      return res.data;
    },
    onSuccess: () => {
      success("Success", "Category added.");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setIsDialogOpen(false);
    },
    onError: (err: any) => error("Error", err.message || "Failed to add category"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.put(`/api/products/categories?id=${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      success("Success", "Category updated.");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setIsDialogOpen(false);
    },
    onError: (err: any) => error("Error", err.message || "Failed to update category"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/products/categories?id=${id}`);
    },
    onSuccess: () => {
      success("Success", "Category removed.");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (err: any) => error("Error", err.message || "Failed to delete category"),
  });

  const handleOpenDialog = (cat: any = null) => {
    setEditingCategory(cat);
    setFormData({ 
      name: cat ? cat.name : "",
      productTypeId: cat ? (cat.productTypeId || cat.product_type_id) : ""
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!organizationId) return;
    if (!formData.name || !formData.productTypeId) {
      error("Error", "Name and Product Type are required");
      return;
    }

    const payload = {
      name: formData.name,
      product_type_id: formData.productTypeId,
      organizationId,
    };

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this category? Products under it might be orphaned.")) {
      deleteMutation.mutate(id);
    }
  };

  const filtered = categories.filter((c: any) => c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const getProductTypeName = (id: string) => {
    const type = productTypes.find((t: any) => t.id === id);
    return type ? type.name : "Unknown Type";
  };

  const isLoading = isLoadingCategories || isLoadingProductTypes;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
          <p className="text-slate-500">Manage sub-categories linked to Master Product Types.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-[#0aa9ad] hover:bg-[#07969a] rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> Add Category
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm rounded-2xl">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <ListTree className="w-5 h-5 text-[#0aa9ad]" />
            Categories
          </CardTitle>
          <div className="w-64">
            <Input 
              placeholder="Search categories..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 rounded-xl"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category Name</TableHead>
                <TableHead>Product Type</TableHead>
                <TableHead className="w-[150px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-12">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : filtered.map((cat: any) => (
                <TableRow key={cat.id}>
                  <TableCell className="font-semibold text-slate-900">{cat.name}</TableCell>
                  <TableCell className="text-slate-500">{getProductTypeName(cat.productTypeId || cat.product_type_id)}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(cat)} className="text-blue-600">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(cat.id)} 
                      className="text-red-600"
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending && deleteMutation.variables === cat.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8 text-slate-500">No categories found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "Add Category"}</DialogTitle>
            <DialogDescription>
              Assign this category to a master Product Type.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Category Name</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. Antibiotics"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Parent Product Type</Label>
              <Select 
                value={formData.productTypeId} 
                onValueChange={(val) => setFormData({...formData, productTypeId: val})}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select Product Type" />
                </SelectTrigger>
                <SelectContent>
                  {productTypes.map((pt: any) => (
                    <SelectItem key={pt.id} value={pt.id}>{pt.name}</SelectItem>
                  ))}
                  {productTypes.length === 0 && (
                    <SelectItem value="none" disabled>No Product Types available</SelectItem>
                  )}
                </SelectContent>
              </Select>
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
