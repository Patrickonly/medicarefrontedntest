import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, User, Loader2, MapPin, FileText, CreditCard, Building2, Users, Stethoscope, Tractor } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Trash2, Plus } from "lucide-react";

export default function CustomerFormPage() {
  const { id } = useParams<{ id: string }>();
  const isEditing = !!id;
  
  const { success, error } = useToast();
  const navigate = useNavigate();
  const { organizationId } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    customer_type: "Individual",
    status: "Active",
    creditLimit: 0,
    payment_terms: 0,
    province: "",
    district: "",
    sector: "",
    address: "",
    notes: "",
    tax_id: "",
    metadata: {} as any,
  });

  const { data: customer, isLoading: isFetching } = useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      if (!id) return null;
      return await api.get<any>(`/api/customers/${id}`);
    },
    enabled: isEditing && !!organizationId,
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.full_name || customer.name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        customer_type: customer.customer_type || "Individual",
        status: customer.status || "Active",
        creditLimit: Number(customer.credit_limit) || 0,
        payment_terms: Number(customer.payment_terms) || 0,
        province: customer.province || "",
        district: customer.district || "",
        sector: customer.sector || "",
        address: customer.address || "",
        notes: customer.notes || "",
        tax_id: customer.tax_id || "",
        metadata: customer.metadata || {},
      });
    }
  }, [customer]);

  const saveMutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEditing) {
        const res = await api.put(`/api/customers/${id}`, data);
        return res.data;
      } else {
        const res = await api.post("/api/customers", data);
        return res.data;
      }
    },
    onSuccess: () => {
      success(isEditing ? "Customer Updated" : "Customer Created", `${formData.name} has been saved successfully.`);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customerProfile", id] });
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      navigate(isEditing ? `/dashboard/customers/${id}/profile` : "/dashboard/customers");
    },
    onError: (err: any) => {
      error("Error", err.message || `Failed to ${isEditing ? 'update' : 'create'} customer.`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;

    saveMutation.mutate({
      full_name: formData.name,
      email: formData.email,
      phone: formData.phone,
      customer_type: formData.customer_type,
      status: formData.status,
      credit_limit: formData.creditLimit,
      payment_terms: formData.payment_terms,
      province: formData.province,
      district: formData.district,
      sector: formData.sector,
      address: formData.address,
      notes: formData.notes,
      tax_id: formData.tax_id,
      metadata: formData.metadata,
    });
  };

  const handleMetadataChange = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      metadata: {
        ...prev.metadata,
        [key]: value
      }
    }));
  };

  const handleAddAsset = () => {
    const currentAssets = Array.isArray(formData.metadata?.farm_assets) ? formData.metadata.farm_assets : [];
    handleMetadataChange('farm_assets', [...currentAssets, { type: "", quantity: "", unit: "" }]);
  };

  const handleAssetChange = (index: number, field: string, value: string) => {
    const currentAssets = [...(formData.metadata?.farm_assets || [])];
    currentAssets[index] = { ...currentAssets[index], [field]: value };
    handleMetadataChange('farm_assets', currentAssets);
  };

  const handleRemoveAsset = (index: number) => {
    const currentAssets = [...(formData.metadata?.farm_assets || [])];
    currentAssets.splice(index, 1);
    handleMetadataChange('farm_assets', currentAssets);
  };

  if (isEditing && isFetching) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0aa9ad]" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1200px] mx-auto pb-12">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate(isEditing ? `/dashboard/customers/${id}/profile` : "/dashboard/customers")}
          className="mb-4 text-muted-foreground hover:text-foreground -ml-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to {isEditing ? 'Profile' : 'Customers'}
        </Button>
        <h1 className="text-2xl font-bold text-foreground">{isEditing ? 'Edit Customer Profile' : 'Add New Customer'}</h1>
        <p className="text-sm text-muted-foreground">Fill in the comprehensive details below for the customer profile.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Basic Info Section */}
        <Card className="border-border shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-border pb-4 bg-background/50">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <User className="h-5 w-5 text-[#0aa9ad]" />
              Basic Information
            </CardTitle>
            <CardDescription>Personal details and contact info.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-3">
                <Label htmlFor="type" className="text-slate-700 font-medium">Customer Type <span className="text-red-500">*</span></Label>
                <Select
                  value={formData.customer_type}
                  onValueChange={(value) => setFormData({ ...formData, customer_type: value })}
                >
                  <SelectTrigger className="rounded-xl border-border focus:ring-[#0aa9ad]">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Individual">Individual</SelectItem>
                    <SelectItem value="Company">Business / Company</SelectItem>
                    <SelectItem value="Farmer">Farmer</SelectItem>
                    <SelectItem value="Cooperative">Cooperative</SelectItem>
                    <SelectItem value="Vet_Clinic">Veterinary Clinic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="name" className="text-slate-700 font-medium">Full Name / Contact Person <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  required
                  placeholder="e.g. Jean Pierre"
                  className="rounded-xl border-border focus-visible:ring-[#0aa9ad]"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="phone" className="text-slate-700 font-medium">Phone Number <span className="text-red-500">*</span></Label>
                <Input
                  id="phone"
                  required
                  placeholder="e.g. +250 788 000 000"
                  className="rounded-xl border-border focus-visible:ring-[#0aa9ad]"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="email" className="text-slate-700 font-medium">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="rounded-xl border-border focus-visible:ring-[#0aa9ad]"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              
              <div className="space-y-3">
                <Label htmlFor="status" className="text-slate-700 font-medium">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger className="rounded-xl border-border focus:ring-[#0aa9ad]">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                    <SelectItem value="Blacklisted">Blacklisted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CONDITIONAL SECTIONS BASED ON CUSTOMER TYPE */}
        
        {/* BUSINESS / COMPANY */}
        {formData.customer_type === 'Company' && (
          <Card className="border-indigo-100 shadow-sm rounded-2xl overflow-hidden bg-indigo-50/30">
            <CardHeader className="border-b border-indigo-100 pb-4 bg-indigo-50/50">
              <CardTitle className="text-lg font-semibold flex items-center gap-2 text-indigo-700">
                <Building2 className="h-5 w-5" />
                Business Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <Label className="text-slate-700 font-medium">Business Name <span className="text-red-500">*</span></Label>
                  <Input
                    required
                    placeholder="e.g. Acme Corp"
                    className="rounded-xl border-indigo-200 focus-visible:ring-indigo-500"
                    value={formData.metadata?.business_name || ""}
                    onChange={(e) => handleMetadataChange('business_name', e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-700 font-medium">Business Type</Label>
                  <Select
                    value={formData.metadata?.business_type || ""}
                    onValueChange={(value) => handleMetadataChange('business_type', value)}
                  >
                    <SelectTrigger className="rounded-xl border-indigo-200 focus:ring-indigo-500">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Agro Dealer">Agro Dealer</SelectItem>
                      <SelectItem value="Farm">Farm</SelectItem>
                      <SelectItem value="Veterinary Clinic">Veterinary Clinic</SelectItem>
                      <SelectItem value="Cooperative">Cooperative</SelectItem>
                      <SelectItem value="Retail Shop">Retail Shop</SelectItem>
                      <SelectItem value="Wholesaler">Wholesaler</SelectItem>
                      <SelectItem value="NGO">NGO</SelectItem>
                      <SelectItem value="Government">Government</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-700 font-medium">Registration Number</Label>
                  <Input
                    placeholder="e.g. REG-12345"
                    className="rounded-xl border-indigo-200 focus-visible:ring-indigo-500"
                    value={formData.metadata?.registration_number || ""}
                    onChange={(e) => handleMetadataChange('registration_number', e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-700 font-medium">TIN / VAT Number</Label>
                  <Input
                    placeholder="e.g. 102394829"
                    className="rounded-xl border-indigo-200 focus-visible:ring-indigo-500"
                    value={formData.tax_id}
                    onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-700 font-medium">Contact Person Position</Label>
                  <Input
                    placeholder="e.g. Manager"
                    className="rounded-xl border-indigo-200 focus-visible:ring-indigo-500"
                    value={formData.metadata?.contact_position || ""}
                    onChange={(e) => handleMetadataChange('contact_position', e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-700 font-medium">Business Phone</Label>
                  <Input
                    placeholder="e.g. +250 788 111 222"
                    className="rounded-xl border-indigo-200 focus-visible:ring-indigo-500"
                    value={formData.metadata?.business_phone || ""}
                    onChange={(e) => handleMetadataChange('business_phone', e.target.value)}
                  />
                </div>
                
                {/* Agrovet / Pharmacy Specific Fields */}
                {(formData.metadata?.business_type === 'Agro Dealer' || formData.metadata?.business_type === 'Veterinary Clinic' || formData.metadata?.business_type === 'Retail Shop' || formData.metadata?.business_type === 'Wholesaler') && (
                  <>
                    <div className="space-y-3">
                      <Label className="text-slate-700 font-medium text-sm flex items-center gap-1">
                        License Number <span className="text-xs font-normal text-muted-foreground">(Agrovet/Vet)</span>
                      </Label>
                      <Input
                        placeholder="e.g. MINAGRI/1234"
                        className="rounded-xl border-indigo-200 focus-visible:ring-indigo-500"
                        value={formData.metadata?.license_number || ""}
                        onChange={(e) => handleMetadataChange('license_number', e.target.value)}
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-slate-700 font-medium text-sm flex items-center gap-1">
                        Certified Staff <span className="text-xs font-normal text-muted-foreground">(Agronomist/Vet)</span>
                      </Label>
                      <Input
                        placeholder="e.g. Dr. Mugabo"
                        className="rounded-xl border-indigo-200 focus-visible:ring-indigo-500"
                        value={formData.metadata?.certified_staff || ""}
                        onChange={(e) => handleMetadataChange('certified_staff', e.target.value)}
                      />
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* COOPERATIVE */}
        {formData.customer_type === 'Cooperative' && (
          <Card className="border-amber-100 shadow-sm rounded-2xl overflow-hidden bg-amber-50/30">
            <CardHeader className="border-b border-amber-100 pb-4 bg-amber-50/50">
              <CardTitle className="text-lg font-semibold flex items-center gap-2 text-amber-700">
                <Users className="h-5 w-5" />
                Cooperative Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-slate-700 font-medium">Cooperative Name <span className="text-red-500">*</span></Label>
                  <Input
                    required
                    placeholder="e.g. Abunzubumwe Coop"
                    className="rounded-xl border-amber-200 focus-visible:ring-amber-500"
                    value={formData.metadata?.coop_name || ""}
                    onChange={(e) => handleMetadataChange('coop_name', e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-700 font-medium">Registration Number</Label>
                  <Input
                    placeholder="e.g. RCA/001/2024"
                    className="rounded-xl border-amber-200 focus-visible:ring-amber-500"
                    value={formData.metadata?.registration_number || ""}
                    onChange={(e) => handleMetadataChange('registration_number', e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-700 font-medium">Number of Members</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="e.g. 50"
                    className="rounded-xl border-amber-200 focus-visible:ring-amber-500"
                    value={formData.metadata?.member_count || ""}
                    onChange={(e) => handleMetadataChange('member_count', e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-700 font-medium">Cooperative Leader</Label>
                  <Input
                    placeholder="e.g. Jean Claude"
                    className="rounded-xl border-amber-200 focus-visible:ring-amber-500"
                    value={formData.metadata?.coop_leader || ""}
                    onChange={(e) => handleMetadataChange('coop_leader', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* VETERINARY CLINIC */}
        {formData.customer_type === 'Vet_Clinic' && (
          <Card className="border-emerald-100 shadow-sm rounded-2xl overflow-hidden bg-emerald-50/30">
            <CardHeader className="border-b border-emerald-100 pb-4 bg-emerald-50/50">
              <CardTitle className="text-lg font-semibold flex items-center gap-2 text-emerald-700">
                <Stethoscope className="h-5 w-5" />
                Clinic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-slate-700 font-medium">Clinic Name <span className="text-red-500">*</span></Label>
                  <Input
                    required
                    placeholder="e.g. Healthy Pets Clinic"
                    className="rounded-xl border-emerald-200 focus-visible:ring-emerald-500"
                    value={formData.metadata?.clinic_name || ""}
                    onChange={(e) => handleMetadataChange('clinic_name', e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-700 font-medium">License Number</Label>
                  <Input
                    placeholder="e.g. VET-1234"
                    className="rounded-xl border-emerald-200 focus-visible:ring-emerald-500"
                    value={formData.metadata?.license_number || ""}
                    onChange={(e) => handleMetadataChange('license_number', e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-700 font-medium">Lead Veterinarian</Label>
                  <Input
                    placeholder="e.g. Dr. Mugabo"
                    className="rounded-xl border-emerald-200 focus-visible:ring-emerald-500"
                    value={formData.metadata?.veterinarian_name || ""}
                    onChange={(e) => handleMetadataChange('veterinarian_name', e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-700 font-medium">Clinic Email</Label>
                  <Input
                    type="email"
                    placeholder="clinic@example.com"
                    className="rounded-xl border-emerald-200 focus-visible:ring-emerald-500"
                    value={formData.metadata?.clinic_email || ""}
                    onChange={(e) => handleMetadataChange('clinic_email', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* FARMER */}
        {formData.customer_type === 'Farmer' && (
          <Card className="border-green-100 shadow-sm rounded-2xl overflow-hidden bg-green-50/30">
            <CardHeader className="border-b border-green-100 pb-4 bg-green-50/50">
              <CardTitle className="text-lg font-semibold flex items-center gap-2 text-green-700">
                <Tractor className="h-5 w-5" />
                Farm Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-slate-700 font-medium">Farm Name</Label>
                  <Input
                    placeholder="e.g. Green Valley Farm"
                    className="rounded-xl border-green-200 focus-visible:ring-green-500"
                    value={formData.metadata?.farm_name || ""}
                    onChange={(e) => handleMetadataChange('farm_name', e.target.value)}
                  />
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-700 font-medium">Main Farming Activity</Label>
                  <Select
                    value={formData.metadata?.farming_activity || ""}
                    onValueChange={(value) => handleMetadataChange('farming_activity', value)}
                  >
                    <SelectTrigger className="rounded-xl border-green-200 focus:ring-green-500">
                      <SelectValue placeholder="Select activity" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Crop Farming">Crop Farming</SelectItem>
                      <SelectItem value="Livestock">Livestock</SelectItem>
                      <SelectItem value="Mixed Farming">Mixed Farming</SelectItem>
                      <SelectItem value="Poultry">Poultry</SelectItem>
                      <SelectItem value="Aquaculture">Aquaculture</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label className="text-slate-700 font-medium">Farm Size</Label>
                  <Input
                    placeholder="e.g. 5 Hectares"
                    className="rounded-xl border-green-200 focus-visible:ring-green-500"
                    value={formData.metadata?.farm_size || ""}
                    onChange={(e) => handleMetadataChange('farm_size', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* GLOBAL FARM ASSETS (Shown for all types because any customer can have a farm in Agrovet context) */}
        <Card className="border-border shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-border pb-4 bg-background/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Tractor className="h-5 w-5 text-green-600" />
                  Farm Assets (Optional)
                </CardTitle>
                <CardDescription>Record livestock or crops associated with this customer.</CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddAsset} className="h-8 text-xs text-green-700 border-green-200 hover:bg-green-50">
                <Plus className="w-3 h-3 mr-1" /> Add Asset
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {Array.isArray(formData.metadata?.farm_assets) && formData.metadata.farm_assets.length > 0 ? (
                <>
                  <div className="flex items-center gap-3 mb-1 px-1">
                    <Label className="flex-1 text-slate-500 font-medium text-xs uppercase tracking-wider">Asset Type</Label>
                    <Label className="w-24 text-slate-500 font-medium text-xs uppercase tracking-wider">Quantity</Label>
                    <Label className="w-32 text-slate-500 font-medium text-xs uppercase tracking-wider">Unit</Label>
                    <div className="w-9 flex-shrink-0"></div>
                  </div>
                  {formData.metadata.farm_assets.map((asset: any, index: number) => (
                    <div key={index} className="flex items-center gap-3">
                      <Input
                        placeholder="Type (e.g. Cows, Maize)"
                        className="flex-1 rounded-xl border-green-200 focus-visible:ring-green-500"
                        value={asset.type}
                        onChange={(e) => handleAssetChange(index, 'type', e.target.value)}
                      />
                      <Input
                        placeholder="Qty (e.g. 50)"
                        className="rounded-xl border-green-200 focus-visible:ring-green-500 w-24"
                        value={asset.quantity}
                        onChange={(e) => handleAssetChange(index, 'quantity', e.target.value)}
                      />
                      <Input
                        placeholder="Unit (e.g. Heads, Acres)"
                        className="rounded-xl border-green-200 focus-visible:ring-green-500 w-32"
                        value={asset.unit}
                        onChange={(e) => handleAssetChange(index, 'unit', e.target.value)}
                      />
                      <Button type="button" variant="ghost" size="icon" onClick={() => handleRemoveAsset(index)} className="w-9 h-9 flex-shrink-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-sm text-muted-foreground p-8 text-center border border-dashed border-border rounded-xl bg-muted/20">
                  No assets added yet. Click "Add Asset" to record livestock or crops.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Credit & Terms Section */}
        <Card className="border-border shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-border pb-4 bg-background/50">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-sky-500" />
              Credit & Billing
            </CardTitle>
            <CardDescription>Configure limits and payment terms.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="credit" className="text-slate-700 font-medium">Credit Limit (RWF) <span className="text-red-500">*</span></Label>
                <Input
                  id="credit"
                  type="number"
                  required
                  min="0"
                  className="rounded-xl border-border focus-visible:ring-sky-500"
                  value={formData.creditLimit}
                  onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">Set to 0 to disable credit sales for this customer.</p>
              </div>
              <div className="space-y-3">
                <Label htmlFor="terms" className="text-slate-700 font-medium">Payment Terms (Days)</Label>
                <Input
                  id="terms"
                  type="number"
                  min="0"
                  className="rounded-xl border-border focus-visible:ring-sky-500"
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">Number of days before an invoice becomes overdue.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location Section */}
        <Card className="border-border shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-border pb-4 bg-background/50">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <MapPin className="h-5 w-5 text-rose-500" />
              Location Details
            </CardTitle>
            <CardDescription>Address and geographic information.</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="space-y-3">
                <Label htmlFor="province" className="text-slate-700 font-medium">Province</Label>
                <Input
                  id="province"
                  placeholder="e.g. Kigali City"
                  className="rounded-xl border-border focus-visible:ring-rose-500"
                  value={formData.province}
                  onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="district" className="text-slate-700 font-medium">District</Label>
                <Input
                  id="district"
                  placeholder="e.g. Gasabo"
                  className="rounded-xl border-border focus-visible:ring-rose-500"
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="sector" className="text-slate-700 font-medium">Sector</Label>
                <Input
                  id="sector"
                  placeholder="e.g. Kimironko"
                  className="rounded-xl border-border focus-visible:ring-rose-500"
                  value={formData.sector}
                  onChange={(e) => setFormData({ ...formData, sector: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-3">
              <Label htmlFor="address" className="text-slate-700 font-medium">Detailed Address</Label>
              <Input
                id="address"
                placeholder="e.g. KG 11 Ave, Building 4"
                className="rounded-xl border-border focus-visible:ring-rose-500"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Additional Notes Section */}
        <Card className="border-border shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-border pb-4 bg-background/50">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-500" />
              Additional Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              <Label htmlFor="notes" className="text-slate-700 font-medium">Internal Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any special instructions or details about this customer..."
                className="rounded-xl border-border focus-visible:ring-slate-500 min-h-[100px]"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 pt-4 sticky bottom-4 z-20 bg-background/80 backdrop-blur-sm p-4 rounded-2xl border border-border/50 shadow-sm">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="rounded-xl bg-white shadow-sm hover:bg-slate-50"
            onClick={() => navigate(isEditing ? `/dashboard/customers/${id}/profile` : "/dashboard/customers")}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            size="lg"
            className="rounded-xl bg-[#0aa9ad] hover:bg-[#07969a] text-white shadow-lg shadow-teal-900/20 px-8"
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Saving...</> : <><Save className="mr-2 h-5 w-5" /> Save Customer</>}
          </Button>
        </div>
      </form>
    </div>
  );
}
