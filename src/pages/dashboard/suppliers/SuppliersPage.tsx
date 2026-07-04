import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Building2, Edit2, FileText, Plus, ShoppingBag, Trash2, Loader2, UserCheck, UserX } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdvancedDataTable, type BulkActionOption } from "@/components/shared/AdvancedDataTable";

export default function SuppliersPage() {
  const { success, error } = useToast();
  const { organizationId, isAgrovetOrg } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [isPODialogOpen, setIsPODialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/suppliers");
      return (res || []).map((s: any) => {
        // contact_info is a single free-text column holding a JSON-encoded
        // {contactPerson, phone, email} — see AddSupplierPage for the writer.
        let contact: { contactPerson?: string; phone?: string; email?: string } = {};
        try {
          contact = JSON.parse(s.contact_info || s.contactInfo || "{}");
        } catch {
          contact = { contactPerson: s.contact_info || s.contactInfo || "" };
        }
        return {
          ...s,
          outstandingBalance: s.outstandingBalance || s.outstanding_balance || 0,
          paymentTerms: s.paymentTerms || s.payment_terms || "Net 30",
          contactPerson: contact.contactPerson || "",
          phone: contact.phone || "",
          email: contact.email || "",
        };
      });
    },
    enabled: !!organizationId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.del(`/api/suppliers?id=${id}`);
    },
    onSuccess: () => {
      success("Supplier Deleted", { description: "Supplier has been removed successfully." });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (err: any) => {
      error("Error", { description: err.message || "Failed to delete supplier." });
    }
  });

  const handleDeleteSupplier = (id: string) => {
    deleteMutation.mutate(id);
  };

  const openPO = (supplier: any) => {
    setSelectedSupplier(supplier);
    setIsPODialogOpen(true);
  };

  const filteredSuppliers = suppliers.filter((s: any) =>
    (s.name && s.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.email && s.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.phone && s.phone.includes(searchQuery))
  );

  const exportColumns = [
    { key: "name", label: "Supplier Name" },
    { key: "contactPerson", label: "Contact Person" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "paymentTerms", label: "Payment Terms" },
    { key: "outstandingBalance", label: "Outstanding Payable (RWF)" },
  ];

  const exportData = filteredSuppliers.map((s: any) => ({
    name: s.name,
    contactPerson: s.contactPerson || "-",
    phone: s.phone || "-",
    email: s.email || "-",
    paymentTerms: s.paymentTerms,
    outstandingBalance: s.outstandingBalance,
  }));

  const bulkActions: BulkActionOption[] = [
    { label: "Activate", status: "ACTIVE", icon: UserCheck },
    { label: "Suspend", status: "INACTIVE", icon: UserX, confirmMessage: "This will suspend the selected suppliers." },
    { label: "Delete", icon: Trash2, variant: "destructive", confirmMessage: "This will permanently delete the selected suppliers. This action cannot be undone." },
  ];

  const handleBulkAction = async (action: BulkActionOption, ids: string[]) => {
    const body = action.label === "Delete"
      ? { action: "DELETE", ids }
      : { action: "STATUS", ids, status: action.status };
    try {
      const res = await api.post<{ success: boolean; data: { total: number; succeeded: number; failed: number } }>(
        "/api/agrovet/bulk/suppliers",
        body
      );
      const { succeeded = 0, failed = 0 } = res.data || {};
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      if (failed > 0) {
        error("Partially completed", `${succeeded} succeeded, ${failed} failed.`);
      } else {
        success("Success", `${action.label} applied to ${succeeded} supplier${succeeded === 1 ? "" : "s"}.`);
      }
    } catch (err: any) {
      error("Error", err.message || `Failed to ${action.label.toLowerCase()} selected suppliers`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Supplier Management</h1>
          <p className="text-slate-500">Manage vendors, purchase orders, and payables</p>
        </div>
        <Button onClick={() => navigate("/dashboard/suppliers/add")} className="bg-[#0aa9ad] hover:bg-[#07969a]">
          <Plus className="w-4 h-4 mr-2" /> Add Supplier
        </Button>
      </div>

      <AdvancedDataTable
        title="Supplier Directory"
        description="Manage vendors, purchase orders, and payables"
        data={exportData}
        exportColumns={exportColumns}
        exportFilename={`Suppliers_Export_${new Date().toISOString().split('T')[0]}`}
        searchTerm={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by name, email, or phone..."
        isLoading={isLoading}
        getRowId={isAgrovetOrg ? (s: any) => String(filteredSuppliers.find(fs => fs.name === s.name && fs.phone === s.phone)?.id ?? s.name) : undefined}
        bulkActions={isAgrovetOrg ? bulkActions : undefined}
        onBulkAction={isAgrovetOrg ? handleBulkAction : undefined}
        renderTable={(paginatedData, selection) => (
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                {selection && (
                  <TableHead className="w-10 pl-5">
                    <Checkbox
                      checked={paginatedData.length > 0 && paginatedData.every((s: any, i: number) => {
                        const orig = filteredSuppliers.find(fs => fs.name === s.name && fs.phone === s.phone) || filteredSuppliers[i];
                        return selection.isSelected(String(orig?.id ?? s.name));
                      })}
                      onCheckedChange={() =>
                        selection.toggleAll(
                          paginatedData.map((s: any, i: number) => {
                            const orig = filteredSuppliers.find(fs => fs.name === s.name && fs.phone === s.phone) || filteredSuppliers[i];
                            return String(orig?.id ?? s.name);
                          })
                        )
                      }
                      aria-label="Select all"
                    />
                  </TableHead>
                )}
                <TableHead className="font-semibold text-slate-700">Supplier Details</TableHead>
                <TableHead className="font-semibold text-slate-700">Contact Info</TableHead>
                <TableHead className="font-semibold text-slate-700">Payment Terms</TableHead>
                <TableHead className="font-semibold text-orange-600">Outstanding Payable</TableHead>
                <TableHead className="font-semibold text-right text-slate-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length > 0 ? paginatedData.map((s: any, index: number) => {
                const supplier = filteredSuppliers.find(fs => fs.name === s.name && fs.phone === s.phone) || filteredSuppliers[index];
                const rowId = String(supplier?.id ?? s.name);
                return (
                <TableRow key={supplier.id || index} className="hover:bg-slate-50/50 transition-colors">
                  {selection && (
                    <TableCell className="pl-5">
                      <Checkbox
                        checked={selection.isSelected(rowId)}
                        onCheckedChange={() => selection.toggle(rowId)}
                        aria-label={`Select ${supplier.name}`}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{supplier.name}</p>
                        <p className="text-xs text-slate-400">Rep: {supplier.contactPerson}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium text-slate-700">{supplier.phone}</p>
                    <p className="text-xs text-slate-500">{supplier.email || "No email"}</p>
                  </TableCell>
                  <TableCell>
                    <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-semibold">
                      {supplier.paymentTerms}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`font-bold ${supplier.outstandingBalance > 0 ? 'text-orange-600' : 'text-slate-900'}`}>
                      {supplier.outstandingBalance.toLocaleString()} RWF
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openPO(supplier)} className="text-slate-500 hover:text-[#0aa9ad]" title="Create Purchase Order">
                        <ShoppingBag className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-slate-500 hover:text-teal-600" title="Supplier Statement">
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/suppliers/edit/${supplier.id}`)} className="text-slate-500 hover:text-blue-600">
                        <Edit2 className="w-4 h-4" />
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
                              This will permanently delete the supplier {supplier.name}.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteSupplier(supplier.id)} className="bg-red-600 hover:bg-red-700" disabled={deleteMutation.isPending}>
                              {deleteMutation.isPending && deleteMutation.variables === supplier.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={selection ? 6 : 5} className="h-32 text-center text-slate-500">
                    {searchQuery ? "No suppliers found matching search." : "No suppliers found. Click 'Add Supplier'."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      />

      {/* Create PO Dialog */}
      <Dialog open={isPODialogOpen} onOpenChange={setIsPODialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
          </DialogHeader>
          {selectedSupplier && (
            <div className="py-4 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg text-sm text-slate-600 mb-4">
                Ordering from: <span className="font-bold text-slate-900">{selectedSupplier.name}</span>
              </div>
              <div className="space-y-2">
                <Label>Items to Order</Label>
                <Input placeholder="e.g. Paracetamol 500mg, Amoxil" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Expected Delivery Date</Label>
                  <Input type="date" />
                </div>
                <div className="space-y-2">
                  <Label>Estimated Total (RWF)</Label>
                  <Input type="number" placeholder="0" />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsPODialogOpen(false)}>Cancel</Button>
            <Button className="bg-[#09111f]">Generate PO Document</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
