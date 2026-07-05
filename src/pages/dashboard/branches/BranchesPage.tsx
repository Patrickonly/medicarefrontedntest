import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
  Building, Plus, Edit, Loader2, MoreHorizontal, CheckCircle2, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AdvancedDataTable, type BulkActionOption } from "@/components/shared/AdvancedDataTable";

const isActiveStatus = (s?: string) => String(s ?? "").toLowerCase() === "active" || String(s ?? "") === "";

export default function BranchesPage() {
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const { userRole, organizationId } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const isSuperAdmin = userRole === "super_admin";

  // Super Admin has no organization of their own, so they must pick which
  // organization's branches to view (there is no "list all branches" route).
  const [viewOrgId, setViewOrgId] = useState("");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    contact_phone: "",
    status: "active",
    organizationId: "",
  });

  const { data: organizations = [] } = useQuery({
    queryKey: ["admin_organizations_list"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>("/api/admin/organizations");
      return res.data || [];
    },
    enabled: isSuperAdmin,
  });

  useEffect(() => {
    if (isSuperAdmin && !viewOrgId && organizations.length > 0) {
      setViewOrgId(organizations[0].id);
    }
  }, [isSuperAdmin, viewOrgId, organizations]);

  const { data: branches = [], isLoading } = useQuery({
    queryKey: ["branches", isSuperAdmin ? viewOrgId : "org"],
    queryFn: async () => {
      const endpoint = isSuperAdmin ? `/api/branches?organizationId=${viewOrgId}` : "/api/branches";
      const res = await api.get<{ success: boolean; data: any[] }>(endpoint, !isSuperAdmin && organizationId ? { organizationId } : undefined);
      return res.data || [];
    },
    enabled: isSuperAdmin ? !!viewOrgId : true,
  });

  const branchEndpoint = isSuperAdmin ? "/api/admin/branches" : "/api/branches";
  const branchHeaders = !isSuperAdmin && organizationId ? { organizationId } : undefined;

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (editingBranch?.id) {
        return await api.put(branchEndpoint, { ...data, id: editingBranch.id }, branchHeaders);
      }
      return await api.post(branchEndpoint, data, branchHeaders);
    },
    onSuccess: () => {
      success("Success", `Branch ${editingBranch ? "updated" : "created"} successfully`);
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      closeDialog();
    },
    onError: (err: any) => error("Error", err.message || "Failed to save branch"),
  });

  // Inline (single-row) status toggle from the row menu.
  const statusMutation = useMutation({
    mutationFn: async (branch: any) => {
      const newStatus = isActiveStatus(branch.status) ? "inactive" : "active";
      await api.put(branchEndpoint, { ...branch, id: branch.id, status: newStatus }, branchHeaders);
    },
    onSuccess: () => {
      success("Success", "Branch status updated");
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
    onError: (err: any) => error("Error", err.message || "Failed to update status"),
  });

  const filteredBranches = branches.filter((branch: any) =>
    branch.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    branch.location?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- Bulk actions: status change only (the API has no branch delete). ---
  const bulkActions: BulkActionOption[] = [
    { label: "Activate", status: "active", icon: CheckCircle2 },
    { label: "Deactivate", status: "inactive", icon: XCircle, confirmMessage: "This will set the selected branches to inactive." },
  ];

  const handleBulkAction = async (action: BulkActionOption, ids: string[]) => {
    const byId = new Map(branches.map((b: any) => [String(b.id), b]));
    const targets = ids.map((id) => byId.get(String(id))).filter(Boolean) as any[];
    const results = await Promise.allSettled(
      targets.map((b) => api.put(branchEndpoint, { ...b, id: b.id, status: action.status }, branchHeaders))
    );
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - succeeded;
    queryClient.invalidateQueries({ queryKey: ["branches"] });
    if (failed > 0) error("Partially completed", `${succeeded} succeeded, ${failed} failed.`);
    else success("Success", `${action.label} applied to ${succeeded} branch${succeeded === 1 ? "" : "es"}.`);
  };

  const orgNameOf = (branch: any) =>
    organizations.find((o: any) => o.id === branch.organizationId || o.id === branch.organization_id)?.name ||
    branch.organizationId || "-";

  const openDialog = (branch?: any) => {
    if (branch) {
      setEditingBranch(branch);
      setFormData({
        name: branch.name || "",
        location: branch.location || "",
        contact_phone: branch.contact_phone || branch.contactPhone || "",
        status: branch.status || "active",
        organizationId: branch.organizationId || branch.organization_id || "",
      });
    } else {
      setEditingBranch(null);
      setFormData({ name: "", location: "", contact_phone: "", status: "active", organizationId: isSuperAdmin ? "" : (organizationId || "") });
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingBranch(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      error("Error", "Branch name is required");
      return;
    }
    if (isSuperAdmin && !formData.organizationId) {
      error("Error", "Organization is required");
      return;
    }
    saveMutation.mutate(formData);
  };

  const exportColumns = [
    { key: "name", label: "Branch Name" },
    ...(isSuperAdmin ? [{ key: "organization", label: "Organization" }] : []),
    { key: "location", label: "Location" },
    { key: "phone", label: "Phone" },
    { key: "status", label: "Status" },
  ];
  const exportData = filteredBranches.map((b: any) => ({
    id: b.id,
    name: b.name || "—",
    organization: orgNameOf(b),
    location: b.location || "—",
    phone: b.contact_phone || b.contactPhone || "—",
    status: isActiveStatus(b.status) ? "Active" : "Inactive",
  }));

  const renderStatusBadge = (status?: string) =>
    isActiveStatus(status) ? (
      <Badge className="border-none bg-emerald-100 text-emerald-700 hover:bg-emerald-200">Active</Badge>
    ) : (
      <Badge className="border-none bg-slate-100 text-slate-600 hover:bg-slate-200">Inactive</Badge>
    );

  return (
    <div className="mx-auto min-h-screen max-w-[1600px] bg-slate-50/30 p-6">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Branches</h1>
          <p className="text-sm text-slate-500">Manage {isSuperAdmin ? "platform-wide branches" : "your organization's branches"}.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {isSuperAdmin && (
            <Select value={viewOrgId} onValueChange={setViewOrgId}>
              <SelectTrigger className="w-full rounded-xl border-slate-200 bg-white sm:w-56">
                <SelectValue placeholder="Select an organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org: any) => (
                  <SelectItem key={org.id} value={String(org.id)}>{org.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={() => openDialog()} className="bg-[#0aa9ad] text-white hover:bg-[#07969a]">
            <Plus className="mr-2 h-4 w-4" /> Add Branch
          </Button>
        </div>
      </div>

      <AdvancedDataTable
        title="Branch Directory"
        description="Select branches to export or change status in bulk."
        data={exportData}
        exportColumns={exportColumns}
        exportFilename={`Branches_Export_${new Date().toISOString().split("T")[0]}`}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search branches..."
        isLoading={isLoading}
        getRowId={(b: any) => String(b.id)}
        bulkActions={bulkActions}
        onBulkAction={handleBulkAction}
        renderTable={(paginatedData, selection) => (
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-slate-100">
                {selection && (
                  <TableHead className="w-10 pl-5">
                    <Checkbox
                      checked={paginatedData.length > 0 && paginatedData.every((b: any) => selection.isSelected(String(b.id)))}
                      onCheckedChange={() => selection.toggleAll(paginatedData.map((b: any) => String(b.id)))}
                      aria-label="Select all"
                    />
                  </TableHead>
                )}
                <TableHead className="w-[300px] font-bold text-slate-600">Branch Name</TableHead>
                {isSuperAdmin && <TableHead className="font-bold text-slate-600">Organization</TableHead>}
                <TableHead className="font-bold text-slate-600">Location</TableHead>
                <TableHead className="font-bold text-slate-600">Status</TableHead>
                <TableHead className="pr-6 text-right font-bold text-slate-600">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map((row: any) => {
                  const branch = branches.find((b: any) => String(b.id) === String(row.id)) || row;
                  return (
                    <TableRow key={branch.id} className="border-slate-100 transition-colors hover:bg-slate-50/50">
                      {selection && (
                        <TableCell className="pl-5">
                          <Checkbox
                            checked={selection.isSelected(String(branch.id))}
                            onCheckedChange={() => selection.toggle(String(branch.id))}
                            aria-label={`Select ${branch.name}`}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-[#0aa9ad]">
                            <Building className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900">{branch.name}</span>
                            <span className="text-xs text-slate-500">{branch.contact_phone || branch.contactPhone || "-"}</span>
                          </div>
                        </div>
                      </TableCell>
                      {isSuperAdmin && <TableCell className="text-sm text-slate-600">{orgNameOf(branch)}</TableCell>}
                      <TableCell className="text-sm text-slate-600">{branch.location || "-"}</TableCell>
                      <TableCell>{renderStatusBadge(branch.status)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[180px] rounded-xl">
                            <DropdownMenuItem onClick={() => openDialog(branch)} className="cursor-pointer gap-2">
                              <Edit className="h-4 w-4 text-slate-500" /> Edit Branch
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => statusMutation.mutate(branch)} className="cursor-pointer gap-2">
                              {isActiveStatus(branch.status) ? (
                                <><XCircle className="h-4 w-4 text-amber-500" /> Set Inactive</>
                              ) : (
                                <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Set Active</>
                              )}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={(selection ? 1 : 0) + (isSuperAdmin ? 5 : 4)} className="h-24 text-center text-slate-500">
                    No branches found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      />

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingBranch ? "Edit Branch" : "Add Branch"}</DialogTitle>
            <DialogDescription>
              {editingBranch ? "Update the details for this branch." : "Register a new branch location."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            {isSuperAdmin && (
              <div className="space-y-2">
                <Label htmlFor="organizationId">Organization</Label>
                <select
                  id="organizationId"
                  aria-label="Organization"
                  value={formData.organizationId}
                  onChange={(e) => setFormData({ ...formData, organizationId: e.target.value })}
                  className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={!!editingBranch}
                >
                  <option value="" disabled>Select an Organization...</option>
                  {organizations.map((org: any) => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Branch Name</Label>
              <Input id="name" placeholder="e.g. Downtown Clinic" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="rounded-xl border-slate-200" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location / Address</Label>
              <Input id="location" placeholder="123 Main St..." value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="rounded-xl border-slate-200" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contact_phone">Contact Phone</Label>
                <Input id="contact_phone" placeholder="+250 788 123 456" value={formData.contact_phone} onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })} className="rounded-xl border-slate-200" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  aria-label="Branch status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={closeDialog} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending} className="rounded-xl bg-[#0aa9ad] text-white hover:bg-[#07969a]">
                {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Branch"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
