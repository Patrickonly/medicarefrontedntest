import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Edit2, Plus, Tags, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function ProductTypesPage() {
  const { success, error } = useToast();
  const { organizationId } = useAuth();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState("");
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "" });

  const { data: productTypes = [], isLoading } = useQuery({
    queryKey: ["product-types", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/products/types");
      return res || [];
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post("/api/products/types", data);
      return res.data;
    },
    onSuccess: () => {
      success("Success", "Product type added.");
      queryClient.invalidateQueries({ queryKey: ["product-types"] });
      setIsDialogOpen(false);
    },
    onError: (err: any) => error("Error", err.message || "Failed to add product type"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.put(`/api/products/types?id=${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      success("Success", "Product type updated.");
      queryClient.invalidateQueries({ queryKey: ["product-types"] });
      setIsDialogOpen(false);
    },
    onError: (err: any) => error("Error", err.message || "Failed to update product type"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/products/types?id=${id}`);
    },
    onSuccess: () => {
      success("Success", "Product type removed.");
      queryClient.invalidateQueries({ queryKey: ["product-types"] });
    },
    onError: (err: any) => error("Error", err.message || "Failed to delete product type"),
  });

  const handleOpenDialog = (type: any = null) => {
    setEditingType(type);
    setFormData({ name: type ? type.name : "" });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!organizationId) return;
    if (!formData.name) {
      error("Error", "Name is required");
      return;
    }

    const payload = {
      name: formData.name,
      organizationId,
    };

    if (editingType) {
      updateMutation.mutate({ id: editingType.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this product type? Categories under it might be orphaned.")) {
      deleteMutation.mutate(id);
    }
  };

  const filtered = productTypes.filter((t: any) => t.name && t.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Product Types</h1>
          <p className="text-slate-500">Manage high-level product classifications (e.g. Agro Inputs, Vet Medicine).</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-[#0aa9ad] hover:bg-[#07969a] rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> Add Type
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm rounded-2xl">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Tags className="w-5 h-5 text-[#0aa9ad]" />
            Master Types
          </CardTitle>
          <div className="w-64">
            <Input 
              placeholder="Search types..." 
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
                <TableHead>Type Name</TableHead>
                <TableHead className="w-[150px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-12">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : filtered.map((type: any) => (
                <TableRow key={type.id}>
                  <TableCell className="font-semibold text-slate-900">{type.name}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(type)} className="text-blue-600">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(type.id)} 
                      className="text-red-600"
                      disabled={deleteMutation.isPending}
                    >
                      {deleteMutation.isPending && deleteMutation.variables === type.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center py-8 text-slate-500">No product types found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingType ? "Edit Product Type" : "Add Product Type"}</DialogTitle>
            <DialogDescription>
              A product type is a top-level classification above categories.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="e.g. Consumables"
                className="rounded-xl"
              />
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
