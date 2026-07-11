import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Edit2, Plus, Tags, Trash2, Loader2, Layers, Archive, Box, Search, FilterX } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard } from "@/components/shared/StatCard";
import { StatCardsSkeleton } from "@/components/shared/StatCardsSkeleton";
import { TableRowsSkeleton } from "@/components/shared/TableRowsSkeleton";
import { useNavigate } from "react-router-dom";

export default function ProductTypesPage() {
  const { success, error } = useToast();
  const { organizationId } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<any>(null);
  const [typeToDelete, setTypeToDelete] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "" });

  const { data: productTypes = [], isLoading } = useQuery({
    queryKey: ["product-types", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/products/types");
      return Array.isArray(res) ? res : (res?.results || res?.data || []);
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
      setTypeToDelete(null);
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to delete product type");
      setTypeToDelete(null);
    },
  });

  const handleOpenDialog = (type: any = null) => {
    setEditingType(type);
    setFormData({ name: type ? type.name : "" });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!organizationId) {
      error("Error", "No organization selected. Please reload and try again.");
      return;
    }
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

  const filtered = productTypes.filter((t: any) => t.name && t.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const currentData = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  return (
    <div className="min-h-screen bg-muted font-sans pb-10">
      <div className="p-6 max-w-[1600px] mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Product Types</h1>
            <p className="text-muted-foreground mt-1">Manage high-level product classifications (e.g. Agro Inputs, Vet Medicine).</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-card px-3 py-1.5 rounded-xl border border-border shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-2 ml-1">Quick Actions:</span>
              <Button variant="ghost" size="sm" className="h-8 font-medium text-[#0aa9ad] bg-[#0aa9ad]/10 hover:bg-[#0aa9ad]/20" onClick={() => navigate("/dashboard/product-types")}>
                Product Types
              </Button>
              <Button variant="ghost" size="sm" className="h-8 font-medium text-muted-foreground hover:bg-muted" onClick={() => navigate("/dashboard/categories")}>
                Categories
              </Button>
            </div>
          </div>
        </div>

        {/* KPI Cards */}
        {isLoading ? <StatCardsSkeleton count={3} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6" /> : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            icon={Layers}
            label="Total Types"
            value={productTypes.length}
            colorClass="bg-[#0aa9ad] text-white"
          />
          <StatCard
            icon={Box}
            label="Recently Added"
            value={productTypes.length > 0 ? "1" : "0"}
            colorClass="bg-[#3b82f6] text-white"
          />
          <StatCard
            icon={Archive}
            label="Archived Types"
            value={0}
            colorClass="bg-[#f59e0b] text-white"
          />
        </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-4 bg-card rounded-t-xl border border-b-0 border-border p-4 shadow-sm">
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search types..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="pl-9 h-10 border-border rounded-lg text-sm bg-background/50 focus:bg-card transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 bg-muted border border-border h-10 px-4 rounded-lg ml-auto">
            <Tags className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-bold text-slate-700">Total Types: {filtered.length}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 bg-card border border-border p-4 border-t-slate-50 shadow-sm relative z-10">
          <Button
            variant="outline"
            size="sm"
            disabled={isLoading}
            className="h-9 px-4 border-border text-slate-700 bg-card hover:bg-[#0aa9ad]/10 hover:text-[#0aa9ad] hover:border-[#0aa9ad]/30 rounded-lg font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
            onClick={() => { setSearchQuery(""); setPage(1); }}
          >
            <FilterX className="w-4 h-4 mr-2" /> Reset Filters
          </Button>
          <Button size="sm" className="h-9 px-4 bg-[#0aa9ad] hover:bg-[#07969a] text-white rounded-lg font-medium transition-colors" onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" /> Add Type
          </Button>
        </div>

        {/* Data Table */}
        <div className="bg-card border border-border border-t-0 p-5 rounded-b-xl shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">Show entries:</span>
            <Select value={String(pageSize)} onValueChange={(val) => { setPageSize(Number(val)); setPage(1); }}>
              <SelectTrigger className="h-8 w-[70px] text-xs rounded-lg border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader className="bg-background/50">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="w-[80px] font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4 pl-4">NO.</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">TYPE NAME</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider text-right w-[150px] py-4 pr-6">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRowsSkeleton columns={["text", "text", "actions"]} />
                </TableBody>
              </Table>
            </div>
          ) : currentData.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader className="bg-background/50">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="w-[80px] font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4 pl-4">NO.</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">TYPE NAME</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider text-right w-[150px] py-4 pr-6">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentData.map((type: any, idx: number) => (
                    <TableRow key={type.id} className="border-b border-slate-50 hover:bg-background/80 transition-colors">
                      <TableCell className="text-sm text-muted-foreground font-medium py-3 pl-4">{(page - 1) * pageSize + idx + 1}</TableCell>
                      <TableCell className="py-3">
                        <span className="text-sm font-semibold text-slate-700">{type.name}</span>
                      </TableCell>
                      <TableCell className="text-right py-3 pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <Button variant="outline" size="icon" className="h-7 w-7 rounded border-blue-200 text-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-colors shadow-sm" title="Edit" onClick={() => handleOpenDialog(type)}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-7 w-7 rounded border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm" title="Delete" onClick={() => setTypeToDelete(type)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-background/50 rounded-xl border border-dashed border-border mt-2 mb-4 mx-2">
              <div className="bg-card w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-sm border border-border">
                <Tags className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">No product types found</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md text-center">We couldn't find any product types matching your search. Try adjusting it or add a new type.</p>
              <Button className="bg-[#0aa9ad] hover:bg-[#07969a] text-white shadow-sm px-6 h-10" onClick={() => setSearchQuery("")}>
                <FilterX className="w-4 h-4 mr-2" /> Clear Search
              </Button>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between mt-5 gap-4">
              <div className="text-sm text-muted-foreground font-medium">
                Showing {(page - 1) * pageSize + (currentData.length > 0 ? 1 : 0)} to {(page - 1) * pageSize + currentData.length} of {filtered.length} entries
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  className="text-muted-foreground text-sm font-medium px-3 hover:bg-muted transition-colors disabled:opacity-50"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  const pageNum = i + 1;
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "ghost"}
                      className={`w-8 h-8 p-0 rounded-md font-medium transition-colors ${page === pageNum ? "bg-[#0aa9ad] hover:bg-[#07969a] text-white shadow-sm" : "text-muted-foreground hover:bg-muted"}`}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <Button
                  variant="ghost"
                  className="text-muted-foreground text-sm font-medium px-3 hover:bg-muted transition-colors disabled:opacity-50"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || totalPages === 0}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <AlertDialog open={!!typeToDelete} onOpenChange={(open) => !open && setTypeToDelete(null)}>
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black text-foreground">Delete Product Type</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-medium mt-2">
              Are you sure you want to delete <span className="font-bold text-foreground">{typeToDelete?.name}</span>? Categories under it might be orphaned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3 sm:gap-0">
            <AlertDialogCancel className="rounded-xl border-border font-bold h-11 hover:bg-muted">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (typeToDelete?.id) deleteMutation.mutate(typeToDelete.id);
              }}
              className="bg-red-600 hover:bg-red-700 rounded-xl font-bold h-11"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              {deleteMutation.isPending ? "Deleting..." : "Delete Type"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingType ? "Edit Product Type" : "Add Product Type"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Type Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Medicines"
                className="rounded-xl h-11"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={createMutation.isPending || updateMutation.isPending} className="bg-[#0aa9ad] hover:bg-[#07969a] rounded-xl">
              {createMutation.isPending || updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {editingType ? "Save Changes" : "Add Type"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
