import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Tags, Plus, Edit, Trash2, Loader2, CheckCircle2, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AdvancedDataTable, type BulkActionOption } from "@/components/shared/AdvancedDataTable";

interface OrganizationType {
  id: string;
  name: string;
  description?: string | null;
  status: "active" | "inactive";
}

const emptyForm = { name: "", description: "", status: "active" as "active" | "inactive" };

export default function OrganizationTypesPage() {
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<OrganizationType | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [typeToDelete, setTypeToDelete] = useState<OrganizationType | null>(null);

  const { data: types = [], isLoading } = useQuery({
    queryKey: ["admin-organization-types"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: OrganizationType[] }>("/api/organization-types");
      return res.data || [];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (editingType?.id) {
        return await api.put(`/api/organization-types?id=${editingType.id}`, data);
      }
      return await api.post("/api/organization-types", data);
    },
    onSuccess: () => {
      success("Success", `Organization type ${editingType ? "updated" : "created"} successfully`);
      queryClient.invalidateQueries({ queryKey: ["admin-organization-types"] });
      closeDialog();
    },
    onError: (err: any) => error("Error", err?.message || "Failed to save organization type"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => api.delete(`/api/organization-types?id=${id}`),
    onSuccess: () => {
      success("Success", "Organization type deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-organization-types"] });
      setTypeToDelete(null);
    },
    onError: (err: any) => error("Error", err?.message || "Failed to delete organization type"),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "inactive" }) =>
      api.put(`/api/organization-types?id=${id}`, { status }),
    onSuccess: () => {
      success("Success", "Status updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-organization-types"] });
    },
    onError: (err: any) => error("Error", err?.message || "Failed to update status"),
  });

  const filteredTypes = types.filter((t) =>
    t.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.description || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- Bulk actions (checkbox toolbar) ---
  const bulkActions: BulkActionOption[] = [
    { label: "Activate", status: "active", icon: CheckCircle2 },
    { label: "Deactivate", status: "inactive", icon: XCircle, confirmMessage: "This will hide the selected types from registration." },
    { label: "Delete", icon: Trash2, variant: "destructive", confirmMessage: "This will permanently delete the selected organization types. This action cannot be undone." },
  ];

  // Single-row API, so bulk fans out per selected id and reports a combined result.
  const handleBulkAction = async (action: BulkActionOption, ids: string[]) => {
    const results = await Promise.allSettled(
      ids.map((id) =>
        action.label === "Delete"
          ? api.delete(`/api/organization-types?id=${id}`)
          : api.put(`/api/organization-types?id=${id}`, { status: action.status })
      )
    );
    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - succeeded;
    queryClient.invalidateQueries({ queryKey: ["admin-organization-types"] });
    if (failed > 0) error("Partially completed", `${succeeded} succeeded, ${failed} failed.`);
    else success("Success", `${action.label} applied to ${succeeded} type${succeeded === 1 ? "" : "s"}.`);
  };

  const openDialog = (type?: OrganizationType) => {
    if (type) {
      setEditingType(type);
      setFormData({ name: type.name || "", description: type.description || "", status: type.status || "active" });
    } else {
      setEditingType(null);
      setFormData(emptyForm);
    }
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingType(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      error("Error", "Organization type name is required");
      return;
    }
    saveMutation.mutate(formData);
  };

  const exportColumns = [
    { key: "name", label: "Name" },
    { key: "description", label: "Description" },
    { key: "status", label: "Status" },
  ];
  const exportData = filteredTypes.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description || "—",
    status: t.status === "active" ? "Active" : "Inactive",
  }));

  return (
    <div className="mx-auto min-h-screen max-w-[1400px] space-y-6 bg-slate-50/30 p-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Organization Types</h1>
          <p className="text-sm text-slate-500">Manage the organization types available during registration.</p>
        </div>
        <Button onClick={() => openDialog()} className="bg-[#0aa9ad] text-white hover:bg-[#07969a]">
          <Plus className="mr-2 h-4 w-4" /> New Organization Type
        </Button>
      </div>

      <AdvancedDataTable
        title="Organization Types"
        description="Select types to export, change status, or delete in bulk."
        data={exportData}
        exportColumns={exportColumns}
        exportFilename={`Organization_Types_${new Date().toISOString().split("T")[0]}`}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search organization types..."
        isLoading={isLoading}
        getRowId={(t: any) => String(t.id)}
        bulkActions={bulkActions}
        onBulkAction={handleBulkAction}
        renderTable={(paginatedData, selection) => (
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-slate-100">
                {selection && (
                  <TableHead className="w-10 pl-5">
                    <Checkbox
                      checked={paginatedData.length > 0 && paginatedData.every((t: any) => selection.isSelected(String(t.id)))}
                      onCheckedChange={() => selection.toggleAll(paginatedData.map((t: any) => String(t.id)))}
                      aria-label="Select all"
                    />
                  </TableHead>
                )}
                <TableHead className="font-bold text-slate-600">Name</TableHead>
                <TableHead className="font-bold text-slate-600">Description</TableHead>
                <TableHead className="font-bold text-slate-600">Status</TableHead>
                <TableHead className="pr-6 text-right font-bold text-slate-600">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map((row: any) => {
                  const type = types.find((t) => String(t.id) === String(row.id)) || row;
                  return (
                    <TableRow key={type.id} className="border-slate-100 transition-colors hover:bg-slate-50/50">
                      {selection && (
                        <TableCell className="pl-5">
                          <Checkbox
                            checked={selection.isSelected(String(type.id))}
                            onCheckedChange={() => selection.toggle(String(type.id))}
                            aria-label={`Select ${type.name}`}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-semibold text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-[#0aa9ad]">
                            <Tags className="h-4 w-4" />
                          </div>
                          {type.name}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[360px] truncate text-sm text-slate-600">{type.description || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={type.status === "active"}
                            disabled={statusMutation.isPending}
                            onCheckedChange={(checked) => statusMutation.mutate({ id: type.id, status: checked ? "active" : "inactive" })}
                          />
                          <Badge className={type.status === "active" ? "border-none bg-emerald-100 text-emerald-700" : "border-none bg-slate-100 text-slate-600"}>
                            {type.status === "active" ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openDialog(type)} className="text-slate-400 hover:text-[#0aa9ad]">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setTypeToDelete(type)} className="text-slate-400 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={selection ? 5 : 4} className="h-24 text-center text-slate-500">
                    No organization types found.
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
            <DialogTitle>{editingType ? "Edit Organization Type" : "New Organization Type"}</DialogTitle>
            <DialogDescription>
              {editingType ? "Update this organization type." : "Add a new organization type for registration."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g. Hospital, Clinic, Pharmacy"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-xl border-slate-200"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                placeholder="Short description shown to admins"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="flex min-h-[80px] w-full rounded-xl border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-950"
                rows={3}
              />
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
              <div>
                <Label htmlFor="status">Active</Label>
                <p className="text-xs text-slate-500">Inactive types are hidden from registration.</p>
              </div>
              <Switch
                id="status"
                checked={formData.status === "active"}
                onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? "active" : "inactive" })}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={closeDialog} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending} className="rounded-xl bg-[#0aa9ad] text-white hover:bg-[#07969a]">
                {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Single-row Delete Confirmation */}
      <AlertDialog open={!!typeToDelete} onOpenChange={(open) => !open && setTypeToDelete(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{typeToDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This organization type will no longer be available during registration. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => typeToDelete && deleteMutation.mutate(typeToDelete.id)}
              disabled={deleteMutation.isPending}
              className="rounded-xl bg-red-600 text-white hover:bg-red-700"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
