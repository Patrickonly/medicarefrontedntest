import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Edit2, Mail, MapPin, Phone, Trash2, Calendar, FileText, CreditCard, MoreVertical, TrendingUp, AlertCircle, BarChart3, Loader2, DollarSign, Package, CheckCircle2, XCircle, Building2, Users, Stethoscope, Tractor, AlertTriangle, User, Globe, Briefcase, ShieldAlert, Clock } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDistanceToNow, format } from "date-fns";

export default function SupplierProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      // API currently doesn't have a single GET /api/suppliers/:id route
      const res = await api.get<any[]>("/api/suppliers");
      return res || [];
    },
    enabled: !!id,
  });

  const supplier = suppliers?.find(s => String(s.id) === String(id));

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.del(`/api/suppliers?id=${id}`);
    },
    onSuccess: () => {
      success("Supplier Deleted", "The supplier profile has been permanently removed.");
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      navigate("/dashboard/suppliers");
    },
    onError: (err: any) => {
      error("Delete Failed", err.message || "Failed to delete supplier.");
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-[#0aa9ad]" />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Supplier Not Found</h2>
        <Button onClick={() => navigate("/dashboard/suppliers")} variant="outline">
          Back to Suppliers
        </Button>
      </div>
    );
  }

  let contact: any = {};
  try {
    contact = JSON.parse(supplier.contact_info || "{}");
  } catch {
    contact = { contactPerson: supplier.contact_info || "" };
  }

  const outstandingBalance = Number(supplier.outstanding_balance || supplier.outstandingBalance || 0);

  const getInitials = (name: string) => {
    return name
      ?.split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2) || "S";
  };

  return (
    <div className="min-h-screen bg-muted/30 pb-12">
      {/* Top Navigation */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-6 py-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard/suppliers")}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Suppliers
        </Button>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-8">
        
        {/* Header Section */}
        <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-[#0aa9ad] to-[#07969a] flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-teal-900/20 shrink-0">
              {getInitials(supplier.name)}
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-black text-foreground">{supplier.name}</h1>
                <Badge variant="outline" className="text-xs bg-muted/50">
                  {supplier.id ? String(supplier.id).padStart(5, '0') : "N/A"}
                </Badge>
                {supplier.supplier_type && (
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">
                    {supplier.supplier_type}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> {contact.phone || "N/A"}</div>
                {contact.email && <div className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {contact.email}</div>}
                {(contact.country || contact.address) && (
                  <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {contact.address || ""}{contact.address && contact.country ? ", " : ""}{contact.country || ""}</div>
                )}
                {supplier.created_at && (
                  <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Since {new Date(supplier.created_at).toLocaleDateString()}</div>
                )}
              </div>
              <div className="flex items-center gap-3 mt-2">
                <Badge className={supplier.status === 'ACTIVE' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}>
                  {supplier.status || "ACTIVE"}
                </Badge>
                {supplier.approval_status === "APPROVED" && <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700"><CheckCircle2 className="w-3 h-3 mr-1"/> Approved</Badge>}
                {supplier.approval_status === "PENDING" && <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700"><Clock className="w-3 h-3 mr-1"/> Pending Review</Badge>}
                {supplier.approval_status === "REJECTED" && <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700"><ShieldAlert className="w-3 h-3 mr-1"/> Rejected</Badge>}

                {supplier.risk_level === "HIGH" && <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700"><ShieldAlert className="w-3 h-3 mr-1"/> High Risk</Badge>}
                {supplier.risk_level === "MEDIUM" && <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700"><ShieldAlert className="w-3 h-3 mr-1"/> Medium Risk</Badge>}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <Button
              variant="outline"
              className="flex-1 md:flex-none rounded-xl"
              onClick={() => navigate(`/dashboard/suppliers/edit/${supplier.id}`)}
            >
              <Edit2 className="w-4 h-4 mr-2" /> Edit
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="rounded-xl">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                <DropdownMenuItem onClick={() => navigate(`/dashboard/suppliers/edit/${supplier.id}`)}>
                  <Edit2 className="w-4 h-4 mr-2" /> Edit Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FileText className="w-4 h-4 mr-2" /> Print Statement
                </DropdownMenuItem>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Supplier
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the supplier profile for <strong>{supplier.name}</strong> and remove all associated data. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-red-600 hover:bg-red-700">
                        {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Supplier"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: "Performance Rating", value: `${supplier.performance_rating || 5} / 5`, icon: BarChart3, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Lead Time", value: `${contact.leadTimeDays || '-'} Days`, icon: Clock, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Outstanding Payable", value: `${outstandingBalance.toLocaleString()} RWF`, icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-50" },
            { label: "Credit Limit", value: contact.creditLimit ? `${Number(contact.creditLimit).toLocaleString()} RWF` : "Unlimited", icon: CreditCard, color: "text-purple-600", bg: "bg-purple-50" },
            { label: "Missed Leads", value: supplier.lead_missing || 0, icon: ShieldAlert, color: "text-red-600", bg: "bg-red-50" },
            { label: "Last Order", value: supplier.last_order_date ? formatDistanceToNow(new Date(supplier.last_order_date), { addSuffix: true }) : "Never", icon: Calendar, color: "text-slate-600", bg: "bg-slate-50" },
          ].map((stat, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5 shadow-sm flex flex-col items-start gap-3">
              <div className={`p-2.5 rounded-xl ${stat.bg} ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{stat.label}</p>
                <p className="text-lg font-black text-foreground mt-0.5">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-border shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-border pb-4">
                <CardTitle className="text-lg flex items-center gap-2"><Briefcase className="w-5 h-5 text-[#0aa9ad]" /> Business Details</CardTitle>
                <CardDescription>Legal and operational details for this vendor.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                  <div className="p-6 space-y-4">
                    <InfoRow label="Supplier Name" value={supplier.name} />
                    <InfoRow label="Business Category" value={contact.businessCategory || "-"} />
                    <InfoRow label="Company Size" value={contact.companySize || "-"} />
                    <InfoRow label="Registration No." value={contact.registrationNumber || "-"} />
                    <InfoRow label="Tax ID / VAT" value={contact.taxId || "-"} />
                    <InfoRow label="National ID" value={contact.nationalId || "-"} />
                    <InfoRow label="Specialization" value={contact.specialization || "-"} />
                    <InfoRow label="Experience" value={contact.experienceLevel || "-"} />
                  </div>
                  <div className="p-6 space-y-4 bg-muted/10">
                    <InfoRow label="Primary Contact" value={contact.contactPerson || "-"} />
                    <InfoRow label="Phone" value={contact.phone || "-"} />
                    <InfoRow label="Email" value={contact.email || "-"} />
                    <InfoRow label="Country" value={contact.country || "-"} />
                    <InfoRow label="Website" value={contact.website || "-"} />
                    <div className="pt-2">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Internal Notes</p>
                      <p className="text-sm text-foreground bg-white p-3 rounded-lg border border-border min-h-[60px]">
                        {contact.internalNotes || "No notes available."}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-border pb-4">
                <CardTitle className="text-lg flex items-center gap-2"><CreditCard className="w-5 h-5 text-indigo-600" /> Procurement & Payment Settings</CardTitle>
                <CardDescription>Payment structures and procurement policies.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                  <div className="p-6 space-y-4">
                    <InfoRow label="Payment Terms" value={supplier.payment_terms || "-"} />
                    <InfoRow label="Preferred Method" value={contact.preferredPaymentMethod || "-"} />
                    <InfoRow label="Currency" value={contact.currency || "RWF"} />
                    <InfoRow label="Credit Limit" value={contact.creditLimit ? `${Number(contact.creditLimit).toLocaleString()} RWF` : "No Limit"} />
                  </div>
                  <div className="p-6 space-y-4 bg-muted/10">
                    <InfoRow label="Delivery Scope" value={contact.deliveryAvailability || "-"} />
                    <InfoRow label="Lead Time" value={contact.leadTimeDays ? `${contact.leadTimeDays} Days` : "-"} />
                    <InfoRow label="Min Order Value" value={contact.minimumOrderValue ? `${Number(contact.minimumOrderValue).toLocaleString()} RWF` : "-"} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column (Purchase Orders) */}
          <div className="space-y-8">
            <Card className="border-border shadow-sm rounded-2xl">
              <CardHeader className="bg-muted/30 border-b border-border pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2"><Package className="w-5 h-5 text-emerald-600" /> Recent Purchase Orders</CardTitle>
                  <CardDescription>Latest orders placed with this supplier.</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                 <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                   <Package className="w-8 h-8 opacity-20" />
                   <p>No purchase orders yet</p>
                   <Button variant="outline" className="mt-2" onClick={() => navigate('/dashboard/purchases/new')}>Create PO</Button>
                 </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm rounded-2xl">
              <CardHeader className="bg-muted/30 border-b border-border pb-4">
                <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-blue-600" /> Supplied Products</CardTitle>
                <CardDescription>Products sourced from this vendor.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                 <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                   <BarChart3 className="w-8 h-8 opacity-20" />
                   <p>No products linked yet</p>
                 </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}

// Helper component for Info rows
function InfoRow({ label, value }: { label: string, value: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 py-1">
      <span className="text-sm text-muted-foreground min-w-[120px]">{label}</span>
      <span className="text-sm font-medium text-foreground text-right">{value}</span>
    </div>
  );
}
