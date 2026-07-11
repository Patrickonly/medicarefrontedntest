import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, Loader2, Plus, RefreshCcw, Trash2, Package, DollarSign, Boxes,
  Search, FilterX, Download, FileSpreadsheet, FileText, File as FileIcon, Printer,
  MoreVertical, PackageX,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { TableRowsSkeleton } from "@/components/shared/TableRowsSkeleton";
import { StatCardsSkeleton } from "@/components/shared/StatCardsSkeleton";
import { StatCard } from "@/components/shared/StatCard";
import { format } from "date-fns";
import { PageTransition } from "@/components/ui/page-transition";

export default function InventoryPage() {
  const { success, error } = useToast();
  const { organizationId, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState("10");

  const [isAdjustDialogOpen, setIsAdjustDialogOpen] = useState(false);
  const [selectedBatchForAdjust, setSelectedBatchForAdjust] = useState<any>(null);
  const [adjustType, setAdjustType] = useState<"in" | "out">("out");
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustReason, setAdjustReason] = useState("damage");
  const [batchToDelete, setBatchToDelete] = useState<any>(null);

  const { data: batches = [], isLoading: isLoadingBatches, refetch, isRefetching } = useQuery({
    queryKey: ["product-batches", organizationId],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>("/api/product-batches");
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

  const isDataLoading = isLoadingBatches || isLoadingProducts || isLoadingCategories || isRefetching;

  const deleteBatchMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/product-batches/${id}`);
    },
    onSuccess: () => {
      success("Success", "Batch deleted successfully.");
      queryClient.invalidateQueries({ queryKey: ["product-batches"] });
      setBatchToDelete(null);
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to delete batch");
      setBatchToDelete(null);
    },
  });

  const adjustStockMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.post<{ success: boolean; data: any }>(`/api/product-batches/${id}/adjust`, data);
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

  const handleAdjustStock = () => {
    if (!selectedBatchForAdjust || !user) return;

    const currentQty = selectedBatchForAdjust.quantityRemaining || selectedBatchForAdjust.quantity_remaining;
    const finalAdjustQty = adjustType === "in" ? adjustQty : -adjustQty;
    const newQty = currentQty + finalAdjustQty;

    if (newQty < 0) {
      error("Error", "Stock cannot be negative.");
      return;
    }

    adjustStockMutation.mutate({
      id: selectedBatchForAdjust.id,
      data: {
        adjustmentQuantity: finalAdjustQty,
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
    if (!dateStr) return { label: "N/A", color: "text-muted-foreground" };
    const days = Math.ceil((new Date(dateStr).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    if (days < 0) return { label: "Expired", color: "text-red-600 font-bold" };
    if (days <= 30) return { label: `${days} days left`, color: "text-orange-600 font-bold" };
    return { label: new Date(dateStr).toLocaleDateString(), color: "text-muted-foreground" };
  };

  const enrichedItems = batches.map(getFullItem);

  const getStatus = (item: any) => {
    const qtyRemaining = item.quantityRemaining ?? item.quantity_remaining ?? 0;
    return qtyRemaining === 0 ? "out_of_stock" : qtyRemaining <= item.reorderLevel ? "low_stock" : "in_stock";
  };

  const filteredItems = enrichedItems.filter((item: any) => {
    const matchesSearch =
      (item.productName && item.productName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.categoryName && item.categoryName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.batchNumber || item.batch_number || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === "all" ? true : getStatus(item) === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalBatches = enrichedItems.length;
  const lowStockCount = enrichedItems.filter((i: any) => getStatus(i) === "low_stock").length;
  const outOfStockCount = enrichedItems.filter((i: any) => getStatus(i) === "out_of_stock").length;
  const estimatedValue = enrichedItems.reduce((sum: number, item: any) => sum + ((item.quantityRemaining || item.quantity_remaining || 0) * (item.sellingPrice || item.selling_price || 0)), 0);

  const currentData = filteredItems.slice((page - 1) * parseInt(pageSize), page * parseInt(pageSize));
  const totalPages = Math.ceil(filteredItems.length / parseInt(pageSize));

  const productInitials = (name?: string) =>
    String(name ?? "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

  const exportRows = () => filteredItems.map((item: any) => [
    `"${item.productName || ""}"`,
    `"${item.batchNumber || item.batch_number || ""}"`,
    `"${item.quantityRemaining ?? item.quantity_remaining ?? 0}"`,
    `"${(item.sellingPrice || item.selling_price || 0)}"`,
    `"${getStatus(item).replace("_", " ")}"`,
  ]);

  const handleExportCSV = () => {
    const headers = ["Product Name", "Batch Number", "Quantity", "Selling Price", "Status"];
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...exportRows().map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventory_export_${format(new Date(), "yyyyMMdd")}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleExportExcel = () => {
    const headers = ["Product Name", "Batch Number", "Quantity", "Selling Price", "Status"];
    const csvContent = "data:application/vnd.ms-excel;charset=utf-8," + [headers.join(","), ...exportRows().map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `inventory_export_${format(new Date(), "yyyyMMdd")}.xls`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <PageTransition className="min-h-screen bg-muted font-sans pb-10">
      <div className="p-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-row justify-between items-center mb-6 gap-4">
          <div>
            <h1 className="text-[#1e293b] text-3xl font-bold tracking-tight">Inventory Management</h1>
            <p className="text-muted-foreground text-sm mt-1 font-medium">Manage batches, track stock levels, and adjust inventory</p>
          </div>

          <div className="flex items-center gap-2 bg-card px-3 py-1.5 rounded-xl border border-border shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-2 ml-1">Quick Actions:</span>
            <Button variant="ghost" size="sm" className="h-8 font-medium text-[#0aa9ad] bg-[#0aa9ad]/10 hover:bg-[#0aa9ad]/20" onClick={() => navigate("/dashboard/inventory")}>
              Inventory
            </Button>
            <Button variant="ghost" size="sm" className="h-8 font-medium text-muted-foreground hover:bg-muted" onClick={() => navigate("/dashboard/inventory/categories")}>
              Categories
            </Button>
            <Button variant="ghost" size="sm" className="h-8 font-medium text-muted-foreground hover:bg-muted" onClick={() => navigate("/dashboard/inventory/add")}>
              Receive Batch
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        {isDataLoading ? <StatCardsSkeleton count={4} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6" /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={Boxes}
            label="Total Batches"
            value={totalBatches}
            colorClass="bg-[#0aa9ad] text-white"
          />
          <StatCard
            icon={AlertTriangle}
            label="Low Stock Items"
            value={lowStockCount}
            colorClass="bg-[#f59e0b] text-white"
          />
          <StatCard
            icon={PackageX}
            label="Out of Stock"
            value={outOfStockCount}
            colorClass="bg-red-500 text-white"
          />
          <StatCard
            icon={DollarSign}
            label="Estimated Value"
            value={estimatedValue}
            format="currency"
            colorClass="bg-[#8b5cf6] text-white"
          />
        </div>
        )}

        {/* Toolbar 1: Search & Filters */}
        <div className="flex flex-wrap items-center gap-4 bg-card rounded-t-xl border border-b-0 border-border p-4 shadow-sm">
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products or batches..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 border-border rounded-lg text-sm bg-background/50 focus:bg-card transition-colors"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[170px] h-10 border-border bg-card text-slate-700 font-medium rounded-lg hover:bg-muted">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="in_stock">In Stock</SelectItem>
              <SelectItem value="low_stock">Low Stock</SelectItem>
              <SelectItem value="out_of_stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 bg-muted border border-border h-10 px-4 rounded-lg ml-auto">
            <Package className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-bold text-slate-700">Total Batches: {filteredItems.length}</span>
          </div>
        </div>

        {/* Toolbar 2: Exports & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-card border border-border p-4 border-t-slate-50 shadow-sm relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-700 mr-2">Export:</span>
            <Button variant="outline" size="sm" className="h-9 px-3 border-border text-slate-700 hover:bg-muted rounded-lg font-medium transition-colors" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-2" /> Print
            </Button>
            <Button variant="outline" size="sm" className="h-9 px-3 border-border text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg font-medium transition-colors" onClick={() => window.print()}>
              <FileText className="w-4 h-4 mr-2" /> PDF
            </Button>
            <Button variant="outline" size="sm" className="h-9 px-3 border-border text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg font-medium transition-colors" onClick={handleExportExcel}>
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
            </Button>
            <Button variant="outline" size="sm" className="h-9 px-3 border-border text-blue-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg font-medium transition-colors" onClick={handleExportCSV}>
              <FileIcon className="w-4 h-4 mr-2" /> CSV
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isDataLoading}
              className="h-9 px-4 border-border text-slate-700 bg-card hover:bg-[#0aa9ad]/10 hover:text-[#0aa9ad] hover:border-[#0aa9ad]/30 rounded-lg font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
              onClick={() => refetch()}
            >
              <RefreshCcw className={`w-4 h-4 mr-2 ${isDataLoading ? 'animate-spin text-[#0aa9ad]' : ''}`} />
              {isDataLoading ? "Refreshing..." : "Refresh"}
            </Button>
            <Button size="sm" className="h-9 px-4 bg-[#0aa9ad] hover:bg-[#07969a] text-white rounded-lg font-medium transition-colors" onClick={() => navigate("/dashboard/inventory/add")}>
              <Plus className="w-4 h-4 mr-2" /> Receive Batch
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9 border-border text-slate-700 rounded-lg hover:bg-muted transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl p-2">
                <DropdownMenuItem className="rounded-md cursor-pointer font-medium text-slate-700 py-2 hover:bg-muted" onClick={handleExportCSV}><Download className="w-4 h-4 mr-2 text-muted-foreground" /> Export Table</DropdownMenuItem>
                <DropdownMenuItem className="rounded-md cursor-pointer font-medium text-slate-700 py-2 hover:bg-muted" onClick={() => { setSearchQuery(""); setStatusFilter("all"); }}><FilterX className="w-4 h-4 mr-2 text-muted-foreground" /> Reset Filters</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-card border border-border border-t-0 p-5 rounded-b-xl shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">Show entries:</span>
            <Select value={pageSize} onValueChange={(val) => { setPageSize(val); setPage(1); }}>
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

          {isDataLoading ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table className="min-w-[900px]">
                <TableHeader className="bg-background/50">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="w-[80px] font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4 pl-4">NO.</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">PRODUCT</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">BATCH & EXPIRY</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">QUANTITY</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">VALUE</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider w-[150px] py-4">STATUS</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider text-right w-[150px] py-4 pr-6">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRowsSkeleton columns={["text", "avatar", "text", "text", "text", "badge", "actions"]} />
                </TableBody>
              </Table>
            </div>
          ) : currentData.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table className="min-w-[900px]">
                <TableHeader className="bg-background/50">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="w-[80px] font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4 pl-4">NO.</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">PRODUCT</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">BATCH & EXPIRY</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">QUANTITY</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">VALUE</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider w-[150px] py-4">STATUS</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider text-right w-[150px] py-4 pr-6">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentData.map((item: any, idx: number) => {
                    const expiryInfo = checkExpiryStatus(item.expiryDate || item.expiry_date);
                    const qtyRemaining = item.quantityRemaining ?? item.quantity_remaining ?? 0;
                    const status = getStatus(item);
                    const sellingPrice = item.sellingPrice || item.selling_price || 0;

                    return (
                      <TableRow key={item.id} className="border-b border-slate-50 hover:bg-background/80 transition-colors">
                        <TableCell className="text-sm text-muted-foreground font-medium py-3 pl-4">{(page - 1) * parseInt(pageSize) + idx + 1}</TableCell>
                        <TableCell className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#0aa9ad]/15 bg-[#0aa9ad]/10 text-xs font-black uppercase text-[#0aa9ad]">
                              {productInitials(item.productName)}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-700">{item.productName}</p>
                              <p className="text-xs text-muted-foreground">{item.categoryName}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3">
                          <p className="text-sm text-slate-700 font-medium">Batch: {item.batchNumber || item.batch_number}</p>
                          <p className={`text-xs mt-0.5 ${expiryInfo.color} flex items-center gap-1`}>
                            {expiryInfo.label === "Expired" || expiryInfo.label.includes("days left") ? <AlertTriangle className="w-3 h-3" /> : null}
                            Exp: {expiryInfo.label}
                          </p>
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-sm font-bold text-slate-700">{qtyRemaining}</span>
                          <span className="text-xs text-muted-foreground ml-1">units</span>
                        </TableCell>
                        <TableCell className="py-3">
                          <p className="text-sm text-slate-700">{sellingPrice.toLocaleString()} RWF</p>
                          <p className="text-xs text-muted-foreground">Total: {(qtyRemaining * sellingPrice).toLocaleString()} RWF</p>
                        </TableCell>
                        <TableCell className="py-3">
                          {status === "in_stock" ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-[#ecfdf5] text-[#10b981] uppercase tracking-wide">
                              In Stock
                            </span>
                          ) : status === "low_stock" ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-orange-50 text-orange-600 uppercase tracking-wide">
                              Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-red-50 text-red-600 uppercase tracking-wide">
                              Out of Stock
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right py-3 pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="outline" size="icon" className="h-7 w-7 rounded border-blue-200 text-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-colors shadow-sm" title="Adjust Stock" onClick={() => openAdjustDialog(item)}>
                              <RefreshCcw className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-7 w-7 rounded border-red-200 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors shadow-sm"
                              title="Delete"
                              onClick={() => setBatchToDelete(item)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-background/50 rounded-xl border border-dashed border-border mt-2 mb-4 mx-2">
              <div className="bg-card w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-sm border border-border">
                <Package className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">No inventory found</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md text-center">We couldn't find any batches matching your current search or filter criteria. Try adjusting them or receive new stock.</p>
              <Button className="bg-[#0aa9ad] hover:bg-[#07969a] text-white shadow-sm px-6 h-10" onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}>
                <FilterX className="w-4 h-4 mr-2" /> Clear All Filters
              </Button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between mt-5 gap-4">
            <div className="text-sm text-muted-foreground font-medium">
              Showing {(page - 1) * parseInt(pageSize) + (currentData.length > 0 ? 1 : 0)} to {(page - 1) * parseInt(pageSize) + currentData.length} of {filteredItems.length} entries
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                className="text-muted-foreground text-sm font-medium px-3 hover:text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
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
                    className={`w-8 h-8 p-0 rounded-md font-medium transition-colors ${
                      page === pageNum
                        ? "bg-[#0aa9ad] hover:bg-[#07969a] text-white shadow-sm"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                )
              })}

              {totalPages > 5 && <span className="text-muted-foreground px-1 font-medium">...</span>}

              {totalPages > 5 && (
                <Button
                  variant={page === totalPages ? "default" : "ghost"}
                  className={`w-8 h-8 p-0 rounded-md font-medium transition-colors ${
                    page === totalPages
                      ? "bg-[#0aa9ad] hover:bg-[#07969a] text-white shadow-sm"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => setPage(totalPages)}
                >
                  {totalPages}
                </Button>
              )}

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
        </div>
      </div>

      {/* Adjust Stock Dialog */}
      <Dialog open={isAdjustDialogOpen} onOpenChange={setIsAdjustDialogOpen}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle>Adjust Batch Level</DialogTitle>
          </DialogHeader>
          {selectedBatchForAdjust && (
            <div className="py-4 space-y-4">
              <div>
                <p className="text-sm font-semibold text-foreground">{selectedBatchForAdjust.productName}</p>
                <p className="text-xs text-muted-foreground">Batch {selectedBatchForAdjust.batchNumber || selectedBatchForAdjust.batch_number} - Current Stock: {selectedBatchForAdjust.quantityRemaining ?? selectedBatchForAdjust.quantity_remaining}</p>
              </div>
              
              <div className="flex gap-2 p-1 bg-muted rounded-xl">
                <Button 
                  type="button" 
                  variant={adjustType === "out" ? "default" : "ghost"} 
                  className={`flex-1 rounded-lg font-bold ${adjustType === "out" ? "bg-red-500 hover:bg-red-600 text-white shadow-sm" : "text-muted-foreground hover:bg-black/5"}`}
                  onClick={() => setAdjustType("out")}
                >
                  Decrease Stock (OUT)
                </Button>
                <Button 
                  type="button" 
                  variant={adjustType === "in" ? "default" : "ghost"} 
                  className={`flex-1 rounded-lg font-bold ${adjustType === "in" ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm" : "text-muted-foreground hover:bg-black/5"}`}
                  onClick={() => setAdjustType("in")}
                >
                  Increase Stock (IN)
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Adjustment Quantity (Absolute)</Label>
                <Input
                  type="number"
                  min="0"
                  className="rounded-xl"
                  value={adjustQty || ""}
                  onChange={(e) => setAdjustQty(Math.abs(Number(e.target.value)))}
                  placeholder="e.g. 5"
                />
                <p className="text-xs font-medium text-muted-foreground">
                  New Total will be: <span className="font-bold text-foreground">
                    {(selectedBatchForAdjust.quantityRemaining ?? selectedBatchForAdjust.quantity_remaining) + (adjustType === "in" ? adjustQty : -adjustQty)}
                  </span>
                </p>
              </div>
              <div className="space-y-2">
                <Label>Reason</Label>
                <Select value={adjustReason} onValueChange={setAdjustReason}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="damage">Damaged/Spoiled</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="audit">Audit Correction</SelectItem>
                    <SelectItem value="internal">Internal Use</SelectItem>
                    <SelectItem value="return">Return/Restock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setIsAdjustDialogOpen(false)}>Cancel</Button>
            <Button className="rounded-xl bg-[#0aa9ad] hover:bg-[#07969a] text-white" onClick={handleAdjustStock} disabled={adjustStockMutation.isPending}>
              {adjustStockMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Adjustment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!batchToDelete} onOpenChange={(open) => !open && setBatchToDelete(null)}>
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black text-foreground">Delete Batch</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground font-medium mt-2">
              Are you sure you want to permanently delete batch{" "}
              <span className="font-bold text-foreground">
                {batchToDelete?.batchNumber || batchToDelete?.batch_number}
              </span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-3 sm:gap-0">
            <AlertDialogCancel className="rounded-xl border-border font-bold h-11 hover:bg-muted">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (batchToDelete?.id) deleteBatchMutation.mutate(batchToDelete.id);
              }}
              className="bg-red-600 hover:bg-red-700 rounded-xl font-bold h-11"
              disabled={deleteBatchMutation.isPending}
            >
              {deleteBatchMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              {deleteBatchMutation.isPending ? "Deleting..." : "Delete Batch"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageTransition>
  );
}
