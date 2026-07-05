import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, Plus, Edit, Trash2, Loader2, MoreHorizontal, CheckCircle2, XCircle,
  Eye, Mail, Phone, Globe, MapPin, FileText, Hash, BadgeCheck, Calendar, Tags,
  Home, ChevronRight, PlusCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdvancedDataTable, type BulkActionOption } from "@/components/shared/AdvancedDataTable";

const isActiveStatus = (status?: string) => String(status ?? "").toLowerCase() === "active" || String(status ?? "") === "";

// --- Premium KPI card ---
type KpiAccent = "teal" | "emerald" | "indigo" | "slate";
interface KpiCardDef {
  title: string;
  value: number;
  hint: string;
  icon: any;
  accent: KpiAccent;
}

// Each card carries a distinct soft-colored background + matching border and a
// solid icon chip, so the four KPIs read as clearly different at a glance.
const kpiAccent: Record<KpiAccent, { card: string; title: string; value: string; hint: string; icon: string; blob: string }> = {
  teal: {
    card: "bg-gradient-to-br from-teal-50 to-cyan-50/60 border-teal-100",
    title: "text-teal-700/80",
    value: "text-teal-950",
    hint: "text-teal-600/70",
    icon: "bg-[#0aa9ad] text-white",
    blob: "bg-teal-300/30",
  },
  emerald: {
    card: "bg-gradient-to-br from-emerald-50 to-green-50/60 border-emerald-100",
    title: "text-emerald-700/80",
    value: "text-emerald-950",
    hint: "text-emerald-600/70",
    icon: "bg-emerald-500 text-white",
    blob: "bg-emerald-300/30",
  },
  indigo: {
    card: "bg-gradient-to-br from-indigo-50 to-violet-50/60 border-indigo-100",
    title: "text-indigo-700/80",
    value: "text-indigo-950",
    hint: "text-indigo-600/70",
    icon: "bg-indigo-500 text-white",
    blob: "bg-indigo-300/30",
  },
  slate: {
    card: "bg-gradient-to-br from-slate-50 to-slate-100/60 border-slate-200",
    title: "text-slate-600",
    value: "text-slate-900",
    hint: "text-slate-500",
    icon: "bg-slate-500 text-white",
    blob: "bg-slate-300/30",
  },
};

function PremiumKpiCard({ kpi }: { kpi: KpiCardDef }) {
  const a = kpiAccent[kpi.accent];
  return (
    <Card
      className={`group relative overflow-hidden rounded-2xl border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${a.card}`}
    >
      {/* decorative blob */}
      <div className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl ${a.blob}`} />
      <CardContent className="relative p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className={`text-xs font-bold uppercase tracking-[0.12em] ${a.title}`}>{kpi.title}</p>
            <p className={`mt-3 text-3xl font-black leading-none tracking-tight tabular-nums ${a.value}`}>
              {kpi.value.toLocaleString()}
            </p>
            <p className={`mt-2 truncate text-xs font-medium ${a.hint}`}>{kpi.hint}</p>
          </div>
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm transition-transform duration-300 group-hover:scale-110 ${a.icon}`}>
            <kpi.icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Up-to-two-letter initials from an organization name, for the row avatar.
const orgInitials = (name?: string) =>
  String(name ?? "")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase() || "?";

// Read the first present key from a loosely-typed org row.
const firstOf = (obj: any, keys: string[]): string | undefined => {
  for (const k of keys) {
    if (obj != null && obj[k] != null && String(obj[k]).trim() !== "") return String(obj[k]);
  }
  return undefined;
};

// Compose a single-line address from whatever address fields are present.
const composeAddress = (org: any): string | undefined => {
  const a = org?.address ?? org;
  const parts = [
    firstOf(a, ["street"]),
    firstOf(a, ["city"]),
    firstOf(a, ["state"]),
    firstOf(a, ["postalCode", "postal_code"]),
    firstOf(a, ["country"]),
  ].filter(Boolean);
  return parts.length ? parts.join(", ") : undefined;
};

export default function OrganizationsPage() {
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog / confirm state (delete + status confirm live here; create/edit are
  // now full pages, not popups).
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [detailsOrg, setDetailsOrg] = useState<any>(null);
  const [editingOrg, setEditingOrg] = useState<any>(null);
  const [statusConfirmOrg, setStatusConfirmOrg] = useState<any>(null);

  const { data: organizations = [], isLoading } = useQuery({
    queryKey: ["admin_organizations"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>("/api/admin/organizations");
      return res.data || [];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/admin/organizations?id=${id}`);
    },
    onSuccess: () => {
      success("Success", "Organization deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["admin_organizations"] });
      setIsDeleteDialogOpen(false);
      setEditingOrg(null);
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to delete organization");
    },
  });

  const filteredOrgs = organizations.filter((org: any) =>
    org.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // --- Bulk actions (checkbox toolbar above the table) ---
  const bulkActions: BulkActionOption[] = [
    { label: "Activate", status: "active", icon: CheckCircle2 },
    {
      label: "Deactivate",
      status: "inactive",
      icon: XCircle,
      confirmMessage: "This will set the selected organizations to inactive.",
    },
    {
      label: "Delete",
      icon: Trash2,
      variant: "destructive",
      confirmMessage: "This will permanently delete the selected organizations and all associated data. This action cannot be undone.",
    },
  ];

  // The admin org API is single-row (PUT for status, DELETE ?id=), so bulk is
  // applied by fanning out per selected id and reporting a combined result.
  const handleBulkAction = async (action: BulkActionOption, ids: string[]) => {
    const byId = new Map(organizations.map((o: any) => [String(o.id), o]));
    const targets = ids.map((id) => byId.get(String(id))).filter(Boolean) as any[];

    const results = await Promise.allSettled(
      targets.map((org) =>
        action.label === "Delete"
          ? api.delete(`/api/admin/organizations?id=${org.id}`)
          : api.put(`/api/admin/organizations`, { ...org, id: org.id, status: action.status })
      )
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - succeeded;
    queryClient.invalidateQueries({ queryKey: ["admin_organizations"] });

    if (failed > 0) {
      error("Partially completed", `${succeeded} succeeded, ${failed} failed.`);
    } else {
      success("Success", `${action.label} applied to ${succeeded} organization${succeeded === 1 ? "" : "s"}.`);
    }
  };

  // Inline (single-row) status toggle - confirmed via a popup before applying.
  const statusMutation = useMutation({
    mutationFn: async (org: any) => {
      const newStatus = isActiveStatus(org.status) ? "inactive" : "active";
      await api.put(`/api/admin/organizations`, { ...org, id: org.id, status: newStatus });
    },
    onSuccess: () => {
      success("Success", "Organization status updated");
      queryClient.invalidateQueries({ queryKey: ["admin_organizations"] });
      setStatusConfirmOrg(null);
    },
    onError: (err: any) => error("Error", err.message || "Failed to update status"),
  });

  const openDetails = (org: any) => setDetailsOrg(org);

  // Columns used for PDF / Excel / CSV export.
  const exportColumns = [
    { key: "name", label: "Organization" },
    { key: "type", label: "Type" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "status", label: "Status" },
  ];

  const exportData = filteredOrgs.map((o: any) => ({
    id: o.id,
    name: o.name || "—",
    type: (o.type || "Healthcare").replace(/^\w/, (c: string) => c.toUpperCase()),
    email: o.email || "—",
    phone: o.phone || "—",
    status: isActiveStatus(o.status) ? "Active" : "Inactive",
  }));

  const renderStatusBadge = (status?: string) =>
    isActiveStatus(status) ? (
      <Badge className="border-none bg-emerald-100 text-emerald-700 hover:bg-emerald-200">Active</Badge>
    ) : (
      <Badge className="border-none bg-slate-100 text-slate-600 hover:bg-slate-200">Inactive</Badge>
    );

  // Premium KPI cards above the table - a quick overview of the tenant base.
  const totalOrgs = organizations.length;
  const activeOrgs = organizations.filter((o: any) => isActiveStatus(o.status)).length;
  const inactiveOrgs = totalOrgs - activeOrgs;
  const distinctTypes = new Set(
    organizations.map((o: any) => String(o.type || "healthcare").toLowerCase())
  ).size;
  const activeRate = totalOrgs > 0 ? Math.round((activeOrgs / totalOrgs) * 100) : 0;

  const kpiCards: KpiCardDef[] = [
    { title: "Total Organizations", value: totalOrgs, hint: "All tenants on the platform", icon: Building2, accent: "teal" },
    { title: "Active", value: activeOrgs, hint: `${activeRate}% of all organizations`, icon: CheckCircle2, accent: "emerald" },
    { title: "Inactive", value: inactiveOrgs, hint: "Not currently live", icon: XCircle, accent: "slate" },
    { title: "Organization Types", value: distinctTypes, hint: "Distinct tenant categories", icon: Tags, accent: "indigo" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-4">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/dashboard" className="flex items-center gap-1.5 text-slate-500 hover:text-[#0aa9ad]">
                  <Home className="h-3.5 w-3.5" /> Home
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator><ChevronRight className="h-3.5 w-3.5 text-slate-300" /></BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage className="font-semibold text-slate-900">Organizations</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Title row */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h1 className="font-display text-[28px] font-extrabold tracking-tight text-slate-900">Organizations</h1>
            <p className="mt-1 text-sm text-slate-500">Manage all tenant organizations on the platform.</p>
          </div>
          <Button
            onClick={() => navigate("/dashboard/organizations/add")}
            className="group h-11 gap-2 rounded-xl bg-[#0aa9ad] px-5 font-semibold text-white shadow-sm shadow-[#0aa9ad]/20 transition-all hover:bg-[#07969a] hover:shadow-md"
          >
            <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" /> New Organization
          </Button>
        </div>

        {/* Premium KPI cards */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((kpi) => (
            <PremiumKpiCard key={kpi.title} kpi={kpi} />
          ))}
        </div>

        <AdvancedDataTable
        title="Platform Tenants"
        description="Select organizations to export, change status, or delete in bulk."
        data={exportData}
        exportColumns={exportColumns}
        exportFilename={`Organizations_Export_${new Date().toISOString().split("T")[0]}`}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search organizations..."
        isLoading={isLoading}
        getRowId={(o: any) => String(o.id)}
        bulkActions={bulkActions}
        onBulkAction={handleBulkAction}
        renderTable={(paginatedData, selection) => (
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-slate-100">
                {selection && (
                  <TableHead className="w-10 pl-5">
                    <Checkbox
                      checked={
                        paginatedData.length > 0 &&
                        paginatedData.every((o: any) => selection.isSelected(String(o.id)))
                      }
                      onCheckedChange={() => selection.toggleAll(paginatedData.map((o: any) => String(o.id)))}
                      aria-label="Select all"
                    />
                  </TableHead>
                )}
                <TableHead className="w-[300px] font-bold text-slate-600">Organization</TableHead>
                <TableHead className="font-bold text-slate-600">Type</TableHead>
                <TableHead className="font-bold text-slate-600">Contact</TableHead>
                <TableHead className="font-bold text-slate-600">Status</TableHead>
                <TableHead className="pr-6 text-right font-bold text-slate-600">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.length > 0 ? (
                paginatedData.map((row: any) => {
                  const org = organizations.find((o: any) => String(o.id) === String(row.id)) || row;
                  return (
                    <TableRow key={org.id} className="border-slate-100 transition-colors hover:bg-slate-50/50">
                      {selection && (
                        <TableCell className="pl-5">
                          <Checkbox
                            checked={selection.isSelected(String(org.id))}
                            onCheckedChange={() => selection.toggle(String(org.id))}
                            aria-label={`Select ${org.name}`}
                          />
                        </TableCell>
                      )}
                      <TableCell className="font-medium">
                        <button
                          type="button"
                          onClick={() => openDetails(org)}
                          className="group flex items-center gap-3 text-left"
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#0aa9ad]/15 bg-[#0aa9ad]/10 text-sm font-black uppercase text-[#0aa9ad]">
                            {orgInitials(org.name)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900 group-hover:text-[#0aa9ad] group-hover:underline">
                              {org.name}
                            </span>
                            <span className="text-xs text-slate-500">{org.email || org.website || "No contact email"}</span>
                          </div>
                        </button>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-white capitalize text-slate-600">
                          {org.type || "Healthcare"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-slate-600">
                        <div>{org.email || "-"}</div>
                        <div className="text-xs">{org.phone || "-"}</div>
                      </TableCell>
                      <TableCell>{renderStatusBadge(org.status)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            onClick={() => openDetails(org)}
                            title="View more info"
                            className="h-8 w-8 rounded-full p-0 text-[#0aa9ad] hover:bg-[#0aa9ad]/10 hover:text-[#07969a]"
                          >
                            <PlusCircle className="h-[18px] w-[18px]" />
                            <span className="sr-only">View more info for {org.name}</span>
                          </Button>
                          <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-900">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-[180px] rounded-xl">
                            <DropdownMenuItem onClick={() => openDetails(org)} className="cursor-pointer gap-2">
                              <Eye className="h-4 w-4 text-slate-500" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => navigate(`/dashboard/organizations/edit/${org.id}`)} className="cursor-pointer gap-2">
                              <Edit className="h-4 w-4 text-slate-500" /> Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setStatusConfirmOrg(org)} className="cursor-pointer gap-2">
                              {isActiveStatus(org.status) ? (
                                <><XCircle className="h-4 w-4 text-amber-500" /> Set Inactive</>
                              ) : (
                                <><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Set Active</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => { setEditingOrg(org); setIsDeleteDialogOpen(true); }}
                              className="cursor-pointer gap-2 text-red-600 focus:bg-red-50 focus:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={selection ? 6 : 5} className="h-24 text-center text-slate-500">
                    No organizations found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
        />
      </div>

      {/* Status change confirmation */}
      <AlertDialog open={!!statusConfirmOrg} onOpenChange={(open) => !open && setStatusConfirmOrg(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusConfirmOrg && isActiveStatus(statusConfirmOrg.status) ? "Deactivate" : "Activate"} organization?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusConfirmOrg && isActiveStatus(statusConfirmOrg.status) ? (
                <>This will set <strong>{statusConfirmOrg?.name}</strong> to <strong>inactive</strong>. Its users will lose access until reactivated.</>
              ) : (
                <>This will set <strong>{statusConfirmOrg?.name}</strong> to <strong>active</strong> and restore platform access.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); statusMutation.mutate(statusConfirmOrg); }}
              disabled={statusMutation.isPending}
              className={`rounded-xl text-white ${
                statusConfirmOrg && isActiveStatus(statusConfirmOrg.status)
                  ? "bg-amber-500 hover:bg-amber-600"
                  : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {statusMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : statusConfirmOrg && isActiveStatus(statusConfirmOrg.status) ? (
                "Yes, deactivate"
              ) : (
                "Yes, activate"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Details */}
      <Dialog open={!!detailsOrg} onOpenChange={(open) => !open && setDetailsOrg(null)}>
        <DialogContent className="rounded-2xl p-0 sm:max-w-[520px] overflow-hidden">
          {detailsOrg && (() => {
            const website = firstOf(detailsOrg, ["website"]);
            const taxId = firstOf(detailsOrg, ["taxId", "tax_id"]);
            const regNo = firstOf(detailsOrg, ["registrationNumber", "registration_number"]);
            const licenseNo = firstOf(detailsOrg, ["licenseNumber", "license_number"]);
            const businessUnit = firstOf(detailsOrg, ["businessUnit", "business_unit"]);
            const address = composeAddress(detailsOrg);
            const created = firstOf(detailsOrg, ["created_at", "createdAt"]);
            const createdLabel = created ? new Date(created).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : undefined;

            const details: { icon: any; label: string; value?: string }[] = [
              { icon: Mail, label: "Email", value: firstOf(detailsOrg, ["email"]) },
              { icon: Phone, label: "Phone", value: firstOf(detailsOrg, ["phone"]) },
              { icon: Globe, label: "Website", value: website },
              { icon: MapPin, label: "Address", value: address },
              { icon: Hash, label: "Tax ID", value: taxId },
              { icon: FileText, label: "Registration No.", value: regNo },
              { icon: BadgeCheck, label: "License No.", value: licenseNo },
              { icon: Building2, label: "Business Unit", value: businessUnit },
              { icon: Calendar, label: "Created", value: createdLabel },
            ].filter((d) => d.value);

            return (
              <>
                {/* Header */}
                <div className="flex items-start gap-4 border-b border-slate-100 bg-slate-50/60 p-6">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#0aa9ad]/15 bg-[#0aa9ad]/10 text-lg font-black uppercase text-[#0aa9ad]">
                    {orgInitials(detailsOrg.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <DialogHeader className="space-y-1 text-left">
                      <DialogTitle className="truncate text-xl font-black text-slate-900">{detailsOrg.name}</DialogTitle>
                      <DialogDescription className="sr-only">Organization details</DialogDescription>
                    </DialogHeader>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="bg-white capitalize text-slate-600">{detailsOrg.type || "Healthcare"}</Badge>
                      {renderStatusBadge(detailsOrg.status)}
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="max-h-[55vh] overflow-y-auto p-6">
                  {details.length > 0 ? (
                    <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                      {details.map((d) => (
                        <div key={d.label} className="flex items-start gap-3">
                          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 text-slate-400">
                            <d.icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{d.label}</p>
                            <p className="mt-0.5 break-words text-sm font-semibold text-slate-800">{d.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="py-6 text-center text-sm text-slate-500">No additional details recorded for this organization.</p>
                  )}
                </div>

                {/* Footer */}
                <DialogFooter className="gap-2 border-t border-slate-100 bg-slate-50/60 p-4">
                  <Button variant="outline" className="rounded-xl" onClick={() => setDetailsOrg(null)}>Close</Button>
                  <Button
                    className="rounded-xl bg-[#0aa9ad] text-white hover:bg-[#07969a]"
                    onClick={() => { const id = detailsOrg?.id; setDetailsOrg(null); navigate(`/dashboard/organizations/edit/${id}`); }}
                  >
                    <Edit className="mr-2 h-4 w-4" /> Edit
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Single-row Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{editingOrg?.name}</strong> and remove all associated data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(editingOrg?.id)}
              disabled={deleteMutation.isPending}
              className="rounded-xl bg-red-600 text-white hover:bg-red-700"
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Yes, delete organization"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
