import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Edit2, Mail, MapPin, Phone, Trash2, Calendar, FileText, CreditCard, MoreVertical, TrendingUp, AlertCircle, BarChart3, Loader2, DollarSign, Package, CheckCircle2, XCircle, Building2, Users, Stethoscope, Tractor, AlertTriangle, BellRing, Banknote } from "lucide-react";
import { useState } from "react";
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
import { formatDistanceToNow } from "date-fns";

export default function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { success, error } = useToast();
  const queryClient = useQueryClient();

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customerProfile", id],
    queryFn: async () => {
      return await api.get<any>(`/api/customers/${id}`);
    },
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await api.del(`/api/customers/${id}`);
    },
    onSuccess: () => {
      success("Customer Deleted", "The customer profile has been permanently removed.");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      navigate("/dashboard/customers");
    },
    onError: (err: any) => {
      error("Delete Failed", err.message || "Failed to delete customer.");
    }
  });

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paymentReference, setPaymentReference] = useState("");

  const remindMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ success: boolean; message: string; data: any }>(`/api/customers/${id}/remind`, {});
      return res;
    },
    onSuccess: (res) => {
      success("Reminder Sent", res.message || "Reminder sent to customer.");
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to send reminder.");
    },
  });

  const paymentMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ success: boolean; data: any }>("/api/customers/payments", {
        customerId: id,
        amount: Number(paymentAmount),
        paymentMethod,
        reference: paymentReference || undefined,
      });
      return res.data;
    },
    onSuccess: (data) => {
      success("Payment Recorded", `New balance: ${Number(data?.new_balance ?? 0).toLocaleString()} RWF.`);
      setIsPaymentDialogOpen(false);
      setPaymentAmount("");
      setPaymentReference("");
      setPaymentMethod("CASH");
      queryClient.invalidateQueries({ queryKey: ["customerProfile", id] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to record payment.");
    },
  });

  const handleRecordPayment = () => {
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      error("Error", "Enter a valid payment amount.");
      return;
    }
    paymentMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-muted/30 pb-12">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-6 py-4">
          <Skeleton className="h-8 w-40" />
        </div>
        <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-8">
          <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <Skeleton className="h-24 w-24 rounded-full shrink-0" />
              <div className="space-y-3">
                <Skeleton className="h-7 w-48" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-5 w-32" />
              </div>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Skeleton className="h-10 w-32 rounded-xl" />
              <Skeleton className="h-10 w-10 rounded-xl" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[104px] w-full rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              <Skeleton className="h-[260px] w-full rounded-2xl" />
              <Skeleton className="h-[320px] w-full rounded-2xl" />
            </div>
            <div className="space-y-8">
              <Skeleton className="h-[200px] w-full rounded-2xl" />
              <Skeleton className="h-[240px] w-full rounded-2xl" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Customer Not Found</h2>
        <Button onClick={() => navigate("/dashboard/customers")} variant="outline">
          Back to Customers
        </Button>
      </div>
    );
  }

  // Calculate Credit Health
  const rawCreditLimit = customer.credit_limit ?? customer.creditLimit;
  const rawOutstandingBalance = customer.stats?.outstanding_balance ?? customer.outstandingBalance;
  
  const creditLimit = Number.isFinite(Number(rawCreditLimit)) ? Number(rawCreditLimit) : 0;
  const outstandingBalance = Number.isFinite(Number(rawOutstandingBalance)) ? Number(rawOutstandingBalance) : 0;
  const creditUsage = creditLimit > 0 ? (outstandingBalance / creditLimit) * 100 : 0;

  let creditStatus = { label: "Healthy", color: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 };
  if (creditUsage >= 100) {
    creditStatus = { label: "Limit Reached", color: "bg-red-100 text-red-700 border-red-200", icon: AlertCircle };
  } else if (creditUsage >= 80) {
    creditStatus = { label: "Near Limit", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: AlertTriangle };
  }

  const getInitials = (name: string) => {
    return name
      ?.split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2) || "C";
  };

  const farmAssets = customer.farm_assets || [];
  const topProducts = customer.top_products || [];
  const stats = customer.stats || {};

  return (
    <div className="min-h-screen bg-muted/30 pb-12">
      {/* Top Navigation */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border px-6 py-4 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/dashboard/customers")}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Customers
        </Button>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-8">
        
        {/* Header Section */}
        <div className="bg-card border border-border rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 rounded-full bg-gradient-to-br from-[#0aa9ad] to-[#07969a] flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-teal-900/20 shrink-0">
              {getInitials(customer.full_name)}
            </div>
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-black text-foreground">{customer.full_name}</h1>
                <Badge variant="outline" className="text-xs bg-muted/50">
                  {customer.id ? String(customer.id).padStart(5, '0') : "N/A"}
                </Badge>
                {customer.customer_type && (
                  <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">
                    {customer.customer_type}
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> {customer.phone || "N/A"}</div>
                {customer.email && <div className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {customer.email}</div>}
                {(customer.province || customer.district) && (
                  <div className="flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {customer.district}, {customer.province}</div>
                )}
                {customer.created_at && (
                  <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Since {new Date(customer.created_at).toLocaleDateString()}</div>
                )}
              </div>
              <div className="flex items-center gap-3 mt-2">
                <Badge className={customer.status === 'ACTIVE' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}>
                  {customer.status || "ACTIVE"}
                </Badge>
                <Badge variant="outline" className={`flex items-center gap-1 border ${creditStatus.color}`}>
                  <creditStatus.icon className="w-3 h-3" />
                  {creditStatus.label}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            {outstandingBalance > 0 && (
              <>
                <Button
                  className="flex-1 md:flex-none rounded-xl bg-[#0aa9ad] hover:bg-[#07969a] text-white"
                  onClick={() => setIsPaymentDialogOpen(true)}
                >
                  <Banknote className="w-4 h-4 mr-2" /> Record Payment
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 md:flex-none rounded-xl border-amber-300 text-amber-700 hover:bg-amber-50"
                  disabled={remindMutation.isPending}
                  onClick={() => remindMutation.mutate()}
                >
                  {remindMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <BellRing className="w-4 h-4 mr-2" />}
                  Remind
                </Button>
              </>
            )}
            <Button
              variant="outline"
              className="flex-1 md:flex-none rounded-xl"
              onClick={() => navigate(`/dashboard/customers/edit/${customer.id}`)}
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
                <DropdownMenuItem onClick={() => navigate(`/dashboard/customers/edit/${customer.id}`)}>
                  <Edit2 className="w-4 h-4 mr-2" /> Edit Profile
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FileText className="w-4 h-4 mr-2" /> Print Statement
                </DropdownMenuItem>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete Customer
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the customer profile for <strong>{customer.full_name}</strong> and remove all associated data. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-red-600 hover:bg-red-700">
                        {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Customer"}
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
            { label: "Total Orders", value: stats.total_orders || 0, icon: BarChart3, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Total Spent", value: `${(stats.total_spent || 0).toLocaleString()} RWF`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Outstanding Balance", value: `${outstandingBalance.toLocaleString()} RWF`, icon: AlertCircle, color: "text-orange-600", bg: "bg-orange-50" },
            { label: "Available Credit", value: `${(stats.available_credit || 0).toLocaleString()} RWF`, icon: CreditCard, color: "text-purple-600", bg: "bg-purple-50" },
            { label: "Average Order", value: `${(stats.average_order_value || 0).toLocaleString()} RWF`, icon: BarChart3, color: "text-indigo-600", bg: "bg-indigo-50" },
            { label: "Last Purchase", value: stats.last_purchase_date ? formatDistanceToNow(new Date(stats.last_purchase_date), { addSuffix: true }) : "Never", icon: Calendar, color: "text-slate-600", bg: "bg-slate-50" },
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
          
          {/* Left Column (Info & Credit) */}
          <div className="lg:col-span-2 space-y-8">
            <Card className="border-border shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-border pb-4">
                <CardTitle className="text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-[#0aa9ad]" /> Customer Information</CardTitle>
                <CardDescription>Comprehensive details and contact information.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
                  <div className="p-6 space-y-4">
                    <InfoRow label="Full Name" value={customer.full_name} />
                    <InfoRow label="Customer Code" value={customer.id ? String(customer.id).padStart(5, '0') : "-"} />
                    <InfoRow label="Phone" value={customer.phone} />
                    <InfoRow label="Email" value={customer.email || "-"} />
                    <InfoRow label="Customer Type" value={customer.customer_type || "Standard"} />
                    <InfoRow label="Payment Terms" value={customer.payment_terms ? `${customer.payment_terms} Days` : "None"} />
                  </div>
                  <div className="p-6 space-y-4 bg-muted/10">
                    <InfoRow label="Province" value={customer.province || "-"} />
                    <InfoRow label="District" value={customer.district || "-"} />
                    <InfoRow label="Sector" value={customer.sector || "-"} />
                    <InfoRow label="Address" value={customer.address || "-"} />
                    <div className="pt-2">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
                      <p className="text-sm text-foreground bg-white p-3 rounded-lg border border-border min-h-[60px]">
                        {customer.notes || "No notes available."}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* CONDITIONAL DETAILS CARD based on customer type */}
            {customer.customer_type === 'Company' && (
              <Card className="border-indigo-100 shadow-sm rounded-2xl overflow-hidden bg-indigo-50/10">
                <CardHeader className="bg-indigo-50/50 border-b border-indigo-100 pb-4">
                  <CardTitle className="text-lg flex items-center gap-2 text-indigo-700">
                    <Building2 className="w-5 h-5" /> Business Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-indigo-100/50">
                    <div className="p-6 space-y-4">
                      <InfoRow label="Business Name" value={customer.metadata?.business_name || "-"} />
                      <InfoRow label="Business Type" value={customer.metadata?.business_type || "-"} />
                      <InfoRow label="Registration Number" value={customer.metadata?.registration_number || "-"} />
                      <InfoRow label="TIN / VAT" value={customer.tax_id || "-"} />
                    </div>
                    <div className="p-6 space-y-4">
                      <InfoRow label="Contact Person" value={customer.full_name || "-"} />
                      <InfoRow label="Position" value={customer.metadata?.contact_position || "-"} />
                      <InfoRow label="Business Phone" value={customer.metadata?.business_phone || "-"} />
                      <InfoRow label="Business Email" value={customer.email || "-"} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {customer.customer_type === 'Cooperative' && (
              <Card className="border-amber-100 shadow-sm rounded-2xl overflow-hidden bg-amber-50/10">
                <CardHeader className="bg-amber-50/50 border-b border-amber-100 pb-4">
                  <CardTitle className="text-lg flex items-center gap-2 text-amber-700">
                    <Users className="w-5 h-5" /> Cooperative Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-amber-100/50">
                    <div className="p-6 space-y-4">
                      <InfoRow label="Cooperative Name" value={customer.metadata?.coop_name || "-"} />
                      <InfoRow label="Registration Number" value={customer.metadata?.registration_number || "-"} />
                      <InfoRow label="Number of Members" value={customer.metadata?.member_count || "-"} />
                    </div>
                    <div className="p-6 space-y-4">
                      <InfoRow label="Cooperative Leader" value={customer.metadata?.coop_leader || "-"} />
                      <InfoRow label="Contact Phone" value={customer.phone || "-"} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {customer.customer_type === 'Vet_Clinic' && (
              <Card className="border-emerald-100 shadow-sm rounded-2xl overflow-hidden bg-emerald-50/10">
                <CardHeader className="bg-emerald-50/50 border-b border-emerald-100 pb-4">
                  <CardTitle className="text-lg flex items-center gap-2 text-emerald-700">
                    <Stethoscope className="w-5 h-5" /> Clinic Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-emerald-100/50">
                    <div className="p-6 space-y-4">
                      <InfoRow label="Clinic Name" value={customer.metadata?.clinic_name || "-"} />
                      <InfoRow label="License Number" value={customer.metadata?.license_number || "-"} />
                    </div>
                    <div className="p-6 space-y-4">
                      <InfoRow label="Lead Veterinarian" value={customer.metadata?.veterinarian_name || "-"} />
                      <InfoRow label="Clinic Email" value={customer.metadata?.clinic_email || "-"} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {customer.customer_type === 'Farmer' && (
              <Card className="border-green-100 shadow-sm rounded-2xl overflow-hidden bg-green-50/10">
                <CardHeader className="bg-green-50/50 border-b border-green-100 pb-4">
                  <CardTitle className="text-lg flex items-center gap-2 text-green-700">
                    <Tractor className="w-5 h-5" /> Farm Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-green-100/50">
                    <div className="p-6 space-y-4">
                      <InfoRow label="Farm Name" value={customer.metadata?.farm_name || "-"} />
                      <InfoRow label="Farming Activity" value={customer.metadata?.farming_activity || "-"} />
                    </div>
                    <div className="p-6 space-y-4">
                      <InfoRow label="Farm Size" value={customer.metadata?.farm_size || "-"} />
                      <InfoRow label="Livestock / Crops" value={customer.metadata?.livestock_crops || "-"} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border-border shadow-sm rounded-2xl overflow-hidden">
              <CardHeader className="bg-muted/30 border-b border-border pb-4 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2"><CreditCard className="w-5 h-5 text-indigo-600" /> Credit Information</CardTitle>
                  <CardDescription>Credit limit, usage, and overdue metrics.</CardDescription>
                </div>
                <Badge variant="outline" className={`flex items-center gap-1.5 border px-3 py-1 text-sm ${creditStatus.color}`}>
                  <creditStatus.icon className="w-4 h-4" />
                  {creditStatus.label}
                </Badge>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Credit Limit</p>
                    <p className="text-xl font-bold">{creditLimit.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">RWF</span></p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Outstanding</p>
                    <p className="text-xl font-bold text-orange-600">{outstandingBalance.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">RWF</span></p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Available</p>
                    <p className="text-xl font-bold text-emerald-600">{(stats.available_credit || 0).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">RWF</span></p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Overdue</p>
                    <p className="text-xl font-bold text-red-600">{(stats.overdue_amount || 0).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">RWF</span></p>
                  </div>
                </div>

                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-muted-foreground">Credit Usage</span>
                    <span>{creditUsage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${creditUsage >= 100 ? 'bg-red-500' : creditUsage >= 80 ? 'bg-yellow-500' : 'bg-emerald-500'}`} 
                      style={{ width: `${Math.min(creditUsage, 100)}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FileText className="w-4 h-4" /></div>
                    <div>
                      <p className="text-xs text-muted-foreground">Outstanding Sales</p>
                      <p className="font-semibold">{stats.outstanding_sales_count || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-50 text-red-600 rounded-lg"><AlertTriangle className="w-4 h-4" /></div>
                    <div>
                      <p className="text-xs text-muted-foreground">Overdue Sales</p>
                      <p className="font-semibold">{stats.overdue_sales_count || 0}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stats.has_outstanding_balance ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {stats.has_outstanding_balance ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Has Debt</p>
                      <p className="font-semibold">{stats.has_outstanding_balance ? "Yes" : "No"}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column (Assets & Products) */}
          <div className="space-y-8">
            <Card className="border-border shadow-sm rounded-2xl">
              <CardHeader className="bg-muted/30 border-b border-border pb-4">
                <CardTitle className="text-lg flex items-center gap-2"><Tractor className="w-5 h-5 text-amber-600" /> Farm Assets</CardTitle>
                <CardDescription>Recorded livestock and crops.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {farmAssets.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-semibold text-slate-700">Asset Type</TableHead>
                        <TableHead className="font-semibold text-slate-700 text-right">Quantity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                    {farmAssets.map((asset: any, i: number) => {
                      const getEmoji = (type: string) => {
                        const t = type.toLowerCase();
                        if (t.includes('cattle') || t.includes('cow')) return '🐄';
                        if (t.includes('goat')) return '🐐';
                        if (t.includes('chicken') || t.includes('poultry')) return '🐓';
                        if (t.includes('maize') || t.includes('corn')) return '🌽';
                        if (t.includes('potato')) return '🥔';
                        if (t.includes('coffee')) return '☕';
                        return '🌱';
                      };
                      return (
                        <TableRow key={i} className="hover:bg-muted/50 transition-colors">
                          <TableCell className="flex items-center gap-3">
                            <span className="text-xl">{getEmoji(asset.type || asset.name)}</span>
                            <span className="font-medium text-sm">{asset.type || asset.name}</span>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                              {asset.quantity} {asset.unit || ''}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                    <Tractor className="w-8 h-8 opacity-20" />
                    <p>No farm assets recorded</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm rounded-2xl">
              <CardHeader className="bg-muted/30 border-b border-border pb-4">
                <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-600" /> Top Purchased Products</CardTitle>
                <CardDescription>Most frequent purchases by quantity.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {topProducts.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="font-semibold text-slate-700">Product Name</TableHead>
                        <TableHead className="font-semibold text-slate-700 text-center">Orders</TableHead>
                        <TableHead className="font-semibold text-slate-700 text-right">Total Qty</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topProducts.map((p: any, i: number) => (
                        <TableRow key={p.product_id || i} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium text-sm max-w-[200px] truncate" title={p.name}>
                            {p.name}
                          </TableCell>
                          <TableCell className="text-center text-xs text-muted-foreground">
                            {p.order_count}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge variant="outline" className="bg-slate-50 text-slate-700">
                              {p.quantity}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-12 text-center text-muted-foreground flex flex-col items-center gap-2">
                    <BarChart3 className="w-8 h-8 opacity-20" />
                    <p>No purchase history yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[420px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              {customer.full_name} owes {outstandingBalance.toLocaleString()} RWF. This sends them a payment confirmation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Amount (RWF)</Label>
              <Input
                type="number"
                min={1}
                placeholder="e.g. 5000"
                className="rounded-xl"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="MOMO">Mobile Money</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reference (optional)</Label>
              <Input
                placeholder="e.g. MP-12345"
                className="rounded-xl"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
            <Button
              className="rounded-xl bg-[#0aa9ad] hover:bg-[#07969a] text-white"
              onClick={handleRecordPayment}
              disabled={paymentMutation.isPending}
            >
              {paymentMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
