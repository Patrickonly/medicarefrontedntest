import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Edit2, FileText, Plus, Trash2, UserSquare2, Loader2, UserCheck, UserX } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdvancedDataTable, type BulkActionOption } from "@/components/shared/AdvancedDataTable";

export default function CustomersPage() {
  const { success, error } = useToast();
  const { organizationId, isAgrovetOrg } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [isStatementDialogOpen, setIsStatementDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/customers");
      return (res || []).map((c: any) => ({
        ...c,
        outstandingBalance: c.currentBalance || c.current_balance || 0,
        creditLimit: c.creditLimit || c.credit_limit || 0,
        totalPurchases: c.totalPurchases || c.total_purchases || 0,
      }));
    },
    enabled: !!organizationId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.del(`/api/customers?id=${id}`);
    },
    onSuccess: () => {
      success("Customer Deleted", { description: "Customer has been removed successfully." });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (err: any) => {
      error("Error", { description: err.message || "Failed to delete customer." });
    }
  });

  const handleDeleteCustomer = (id: string) => {
    deleteMutation.mutate(id);
  };

  const openStatement = (customer: any) => {
    setSelectedCustomer(customer);
    setIsStatementDialogOpen(true);
  };

  const filteredCustomers = customers.filter((c: any) =>
    (c.name && c.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.phone && c.phone.includes(searchQuery))
  );

  const exportColumns = [
    { key: "name", label: "Customer Name" },
    { key: "phone", label: "Phone" },
    { key: "email", label: "Email" },
    { key: "creditLimit", label: "Credit Limit (RWF)" },
    { key: "outstandingBalance", label: "Outstanding Balance (RWF)" },
    { key: "totalPurchases", label: "Total Purchases" },
  ];

  const exportData = filteredCustomers.map((c: any) => ({
    name: c.name,
    phone: c.phone || "-",
    email: c.email || "-",
    creditLimit: c.creditLimit,
    outstandingBalance: c.outstandingBalance,
    totalPurchases: c.totalPurchases,
  }));

  const bulkActions: BulkActionOption[] = [
    { label: "Activate", status: "ACTIVE", icon: UserCheck },
    { label: "Suspend", status: "INACTIVE", icon: UserX, confirmMessage: "This will suspend the selected customers." },
    { label: "Delete", icon: Trash2, variant: "destructive", confirmMessage: "This will permanently delete the selected customers. This action cannot be undone." },
  ];

  const handleBulkAction = async (action: BulkActionOption, ids: string[]) => {
    const body = action.label === "Delete"
      ? { action: "DELETE", ids }
      : { action: "STATUS", ids, status: action.status };
    try {
      const res = await api.post<{ success: boolean; data: { total: number; succeeded: number; failed: number } }>(
        "/api/agrovet/bulk/customers",
        body
      );
      const { succeeded = 0, failed = 0 } = res.data || {};
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      if (failed > 0) {
        error("Partially completed", `${succeeded} succeeded, ${failed} failed.`);
      } else {
        success("Success", `${action.label} applied to ${succeeded} customer${succeeded === 1 ? "" : "s"}.`);
      }
    } catch (err: any) {
      error("Error", err.message || `Failed to ${action.label.toLowerCase()} selected customers`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer Management</h1>
          <p className="text-slate-500">Track profiles, credit limits, and outstanding balances</p>
        </div>
        <Button onClick={() => navigate("/dashboard/customers/add")} className="bg-[#0aa9ad] hover:bg-[#07969a]">
          <Plus className="w-4 h-4 mr-2" /> Add Customer
        </Button>
      </div>

      <AdvancedDataTable
        title="Customer Directory"
        description="Track profiles, credit limits, and outstanding balances"
        data={exportData}
        exportColumns={exportColumns}
        exportFilename={`Customers_Export_${new Date().toISOString().split('T')[0]}`}
        searchTerm={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by name, email, or phone..."
        isLoading={isLoading}
        getRowId={isAgrovetOrg ? (c: any) => String(filteredCustomers.find(fc => fc.name === c.name && fc.phone === c.phone)?.id ?? c.name) : undefined}
        bulkActions={isAgrovetOrg ? bulkActions : undefined}
        onBulkAction={isAgrovetOrg ? handleBulkAction : undefined}
        renderTable={(paginatedData, selection) => (
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                {selection && (
                  <TableHead className="w-10 pl-5">
                    <Checkbox
                      checked={paginatedData.length > 0 && paginatedData.every((c: any, i: number) => {
                        const orig = filteredCustomers.find(fc => fc.name === c.name && fc.phone === c.phone) || filteredCustomers[i];
                        return selection.isSelected(String(orig?.id ?? c.name));
                      })}
                      onCheckedChange={() =>
                        selection.toggleAll(
                          paginatedData.map((c: any, i: number) => {
                            const orig = filteredCustomers.find(fc => fc.name === c.name && fc.phone === c.phone) || filteredCustomers[i];
                            return String(orig?.id ?? c.name);
                          })
                        )
                      }
                      aria-label="Select all"
                    />
                  </TableHead>
                )}
                <TableHead className="font-semibold text-slate-700">Customer</TableHead>
                <TableHead className="font-semibold text-slate-700">Contact Info</TableHead>
                <TableHead className="font-semibold text-slate-700">Credit Limit</TableHead>
                <TableHead className="font-semibold text-orange-600">Outstanding Balance</TableHead>
                <TableHead className="font-semibold text-slate-700">Total Purchases</TableHead>
                <TableHead className="font-semibold text-right text-slate-700">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length > 0 ? paginatedData.map((c: any, index: number) => {
                  const customer = filteredCustomers.find(fc => fc.name === c.name && fc.phone === c.phone) || filteredCustomers[index];
                  const rowId = String(customer?.id ?? c.name);
                  const limitRatio = customer.creditLimit > 0 ? (customer.outstandingBalance / customer.creditLimit) * 100 : 0;
                  const isOverdue = limitRatio > 90;

                  return (
                    <TableRow key={customer.id || index} className="hover:bg-slate-50/50 transition-colors">
                      {selection && (
                        <TableCell className="pl-5">
                          <Checkbox
                            checked={selection.isSelected(rowId)}
                            onCheckedChange={() => selection.toggle(rowId)}
                            aria-label={`Select ${customer.name}`}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                            <UserSquare2 className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{customer.name}</p>
                            <p className="text-xs text-slate-400">ID: {String(customer.id).slice(0,8)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-slate-700">{customer.phone}</p>
                        <p className="text-xs text-slate-500">{customer.email || "No email"}</p>
                      </TableCell>
                      <TableCell className="font-medium">{customer.creditLimit.toLocaleString()} RWF</TableCell>
                      <TableCell>
                        <span className={`font-bold ${isOverdue ? 'text-red-600' : 'text-slate-900'}`}>
                          {customer.outstandingBalance.toLocaleString()} RWF
                        </span>
                        {customer.creditLimit > 0 && (
                          <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                            <div className={`h-1.5 rounded-full ${isOverdue ? 'bg-red-500' : 'bg-orange-400'}`} style={{ width: `${Math.min(limitRatio, 100)}%` }}></div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{customer.totalPurchases}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => openStatement(customer)} className="text-slate-500 hover:text-[#0aa9ad]">
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/dashboard/customers/edit/${customer.id}`)} className="text-slate-500 hover:text-blue-600">
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
                                  This will permanently delete {customer.name}.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteCustomer(customer.id)} className="bg-red-600 hover:bg-red-700" disabled={deleteMutation.isPending}>
                                  {deleteMutation.isPending && deleteMutation.variables === customer.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
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
                    <TableCell colSpan={selection ? 7 : 6} className="h-32 text-center text-slate-500">
                      {searchQuery ? "No customers found matching search." : "No customers found. Click 'Add Customer'."}
                    </TableCell>
                  </TableRow>
                )}
            </TableBody>
          </Table>
        )}
      />

      {/* Customer Statement Dialog */}
      <Dialog open={isStatementDialogOpen} onOpenChange={setIsStatementDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Customer Statement</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="py-4 space-y-6">
              <div className="flex justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Account Name</p>
                  <p className="text-lg font-black text-slate-900">{selectedCustomer.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Outstanding Balance</p>
                  <p className="text-xl font-black text-orange-600">{selectedCustomer.outstandingBalance.toLocaleString()} RWF</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-slate-900 mb-3 border-b border-slate-200 pb-2">Recent Transactions</h4>
                <div className="space-y-3">
                  {/* Mocked Transactions */}
                  <div className="flex justify-between items-center text-sm">
                    <div>
                      <p className="font-semibold">Invoice #INV-9821</p>
                      <p className="text-xs text-slate-500">Oct 24, 2026 - Credit Sale</p>
                    </div>
                    <div className="text-right">
                      <p className="text-orange-600 font-medium">+15,000 RWF</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <div>
                      <p className="font-semibold">Payment Received</p>
                      <p className="text-xs text-slate-500">Oct 10, 2026 - MoMo Transfer</p>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-600 font-medium">-10,000 RWF</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsStatementDialogOpen(false)}>Close</Button>
            <Button className="bg-[#09111f]">Print Statement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
