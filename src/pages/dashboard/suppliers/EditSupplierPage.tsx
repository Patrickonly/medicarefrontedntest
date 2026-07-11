import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building2, Save, Loader2, User, ChevronRight, ChevronLeft, Briefcase, FileText, CheckCircle2, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function EditSupplierPage() {
  const { success, error } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { organizationId } = useAuth();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const [formData, setFormData] = useState({
    supplier_type: "COMPANY" as "COMPANY" | "INDIVIDUAL",
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    country: "",
    address: "",
    
    // Company specific
    registrationNumber: "",
    taxId: "",
    businessCategory: "",
    companySize: "",
    website: "",

    // Individual specific
    nationalId: "",
    specialization: "",
    experienceLevel: "",

    // Payment
    paymentTerms: "Net 30",
    preferredPaymentMethod: "Bank Transfer",
    currency: "RWF",
    creditLimit: "",

    // Procurement
    approval_status: "APPROVED",
    risk_level: "LOW",
    leadTimeDays: "",
    minimumOrderValue: "",
    deliveryAvailability: "Local",
    internalNotes: ""
  });

  const { data: supplier, isLoading } = useQuery({
    queryKey: ["supplier", id],
    queryFn: async () => {
      // There is no single-supplier GET endpoint — fetch the org's full list
      const res = await api.get<any[]>("/api/suppliers");
      return (res || []).find((s: any) => String(s.id) === String(id));
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (supplier) {
      let contact: any = {};
      try {
        contact = JSON.parse(supplier.contact_info || "{}");
      } catch {
        contact = { contactPerson: supplier.contact_info || "" };
      }

      setFormData({
        supplier_type: supplier.supplier_type || "COMPANY",
        name: supplier.name || "",
        contactPerson: contact.contactPerson || "",
        phone: contact.phone || "",
        email: contact.email || "",
        country: contact.country || "",
        address: contact.address || "",
        
        registrationNumber: contact.registrationNumber || "",
        taxId: contact.taxId || "",
        businessCategory: contact.businessCategory || "",
        companySize: contact.companySize || "",
        website: contact.website || "",

        nationalId: contact.nationalId || "",
        specialization: contact.specialization || "",
        experienceLevel: contact.experienceLevel || "",

        paymentTerms: supplier.payment_terms || supplier.paymentTerms || "Net 30",
        preferredPaymentMethod: contact.preferredPaymentMethod || "Bank Transfer",
        currency: contact.currency || "RWF",
        creditLimit: contact.creditLimit || "",

        approval_status: supplier.approval_status || "APPROVED",
        risk_level: supplier.risk_level || "LOW",
        leadTimeDays: contact.leadTimeDays || "",
        minimumOrderValue: contact.minimumOrderValue || "",
        deliveryAvailability: contact.deliveryAvailability || "Local",
        internalNotes: contact.internalNotes || ""
      });
    }
  }, [supplier]);

  const updateForm = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.put(`/api/suppliers?id=${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      success("Supplier Updated", `${formData.name}'s details have been updated.`);
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplier", id] });
      navigate("/dashboard/suppliers");
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to update supplier.");
    }
  });

  const handleSubmit = () => {
    if (!id) return;

    // Package dynamic fields into contact_info JSON blob
    const dynamicFields = {
      contactPerson: formData.contactPerson,
      phone: formData.phone,
      email: formData.email,
      country: formData.country,
      address: formData.address,
      registrationNumber: formData.registrationNumber,
      taxId: formData.taxId,
      businessCategory: formData.businessCategory,
      companySize: formData.companySize,
      website: formData.website,
      nationalId: formData.nationalId,
      specialization: formData.specialization,
      experienceLevel: formData.experienceLevel,
      preferredPaymentMethod: formData.preferredPaymentMethod,
      currency: formData.currency,
      creditLimit: formData.creditLimit,
      leadTimeDays: formData.leadTimeDays,
      minimumOrderValue: formData.minimumOrderValue,
      deliveryAvailability: formData.deliveryAvailability,
      internalNotes: formData.internalNotes
    };

    updateMutation.mutate({
      id,
      data: {
        name: formData.name,
        supplier_type: formData.supplier_type,
        approval_status: formData.approval_status,
        risk_level: formData.risk_level,
        contact_info: JSON.stringify(dynamicFields),
        payment_terms: formData.paymentTerms,
      }
    });
  };

  const nextStep = () => {
    if (currentStep === 2) {
      if (!formData.name || !formData.phone) {
        error("Missing Fields", "Please fill in the required display name and phone number.");
        return;
      }
    }
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  };

  const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

  if (isLoading) {
    return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="min-h-screen bg-muted/30 pb-12 pt-6">
      <div className="max-w-[1600px] mx-auto px-6">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard/suppliers")}
            className="mb-4 text-muted-foreground hover:text-foreground -ml-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Suppliers
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Edit Supplier</h1>
          <p className="text-muted-foreground mt-1">Update details for {formData.name}</p>
        </div>

        {/* Stepper Progress */}
        <div className="flex items-center justify-between mb-8 relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-border rounded-full z-0"></div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-[#0aa9ad] transition-all duration-300 rounded-full z-0" style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}></div>
          
          {[
            { step: 1, label: "Type", icon: Briefcase },
            { step: 2, label: "Basic Info", icon: User },
            { step: 3, label: "Details", icon: FileText },
            { step: 4, label: "Settings", icon: ShieldAlert },
          ].map((s) => (
            <div key={s.step} className="relative z-10 flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 border-background transition-colors ${currentStep >= s.step ? "bg-[#0aa9ad] text-white" : "bg-muted text-muted-foreground"}`}>
                <s.icon className="w-4 h-4" />
              </div>
              <span className={`text-xs font-semibold ${currentStep >= s.step ? "text-[#0aa9ad]" : "text-muted-foreground"}`}>{s.label}</span>
            </div>
          ))}
        </div>

        <Card className="border-border shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-border bg-card/50">
            <CardTitle className="text-xl">
              {currentStep === 1 && "Select Supplier Type"}
              {currentStep === 2 && "Basic Information"}
              {currentStep === 3 && (formData.supplier_type === "COMPANY" ? "Company Specifics" : "Individual Specifics")}
              {currentStep === 4 && "Procurement & Payment Settings"}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && "Choose whether you are onboarding a registered business or an individual contractor."}
              {currentStep === 2 && "Enter the core contact details."}
              {currentStep === 3 && "Provide legal and operational specifics."}
              {currentStep === 4 && "Configure how and when this supplier is paid."}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-8">
            {/* STEP 1 */}
            {currentStep === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div 
                  className={`border-2 rounded-2xl p-6 cursor-pointer transition-all ${formData.supplier_type === "COMPANY" ? "border-[#0aa9ad] bg-[#0aa9ad]/5" : "border-border hover:border-slate-300"}`}
                  onClick={() => updateForm({ supplier_type: "COMPANY" })}
                >
                  <Building2 className={`w-10 h-10 mb-4 ${formData.supplier_type === "COMPANY" ? "text-[#0aa9ad]" : "text-muted-foreground"}`} />
                  <h3 className="text-lg font-bold mb-2">Registered Company</h3>
                  <p className="text-sm text-muted-foreground">For established businesses, distributors, and large vendors.</p>
                </div>
                <div 
                  className={`border-2 rounded-2xl p-6 cursor-pointer transition-all ${formData.supplier_type === "INDIVIDUAL" ? "border-[#0aa9ad] bg-[#0aa9ad]/5" : "border-border hover:border-slate-300"}`}
                  onClick={() => updateForm({ supplier_type: "INDIVIDUAL" })}
                >
                  <User className={`w-10 h-10 mb-4 ${formData.supplier_type === "INDIVIDUAL" ? "text-[#0aa9ad]" : "text-muted-foreground"}`} />
                  <h3 className="text-lg font-bold mb-2">Individual / Freelancer</h3>
                  <p className="text-sm text-muted-foreground">For independent contractors, farmers, or specialized technicians.</p>
                </div>
              </div>
            )}

            {/* STEP 2 */}
            {currentStep === 2 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3 md:col-span-2">
                  <Label className="font-semibold">{formData.supplier_type === "COMPANY" ? "Company Name" : "Full Name"} <span className="text-red-500">*</span></Label>
                  <Input 
                    value={formData.name} onChange={e => updateForm({ name: e.target.value })} 
                    placeholder={formData.supplier_type === "COMPANY" ? "e.g. Global Pharma Ltd" : "e.g. John Doe"} 
                    className="h-11 rounded-xl border-border focus-visible:ring-[#0aa9ad]"
                  />
                </div>
                {formData.supplier_type === "COMPANY" && (
                  <div className="space-y-3">
                    <Label className="font-semibold">Primary Contact Person</Label>
                    <Input value={formData.contactPerson} onChange={e => updateForm({ contactPerson: e.target.value })} placeholder="e.g. Jane Smith" className="h-11 rounded-xl border-border focus-visible:ring-[#0aa9ad]" />
                  </div>
                )}
                <div className="space-y-3">
                  <Label className="font-semibold">Phone Number <span className="text-red-500">*</span></Label>
                  <Input value={formData.phone} onChange={e => updateForm({ phone: e.target.value })} placeholder="+250 788 000 000" className="h-11 rounded-xl border-border focus-visible:ring-[#0aa9ad]" />
                </div>
                <div className="space-y-3">
                  <Label className="font-semibold">Email Address</Label>
                  <Input type="email" value={formData.email} onChange={e => updateForm({ email: e.target.value })} placeholder="email@example.com" className="h-11 rounded-xl border-border focus-visible:ring-[#0aa9ad]" />
                </div>
                <div className="space-y-3">
                  <Label className="font-semibold">Country / Location</Label>
                  <Input value={formData.country} onChange={e => updateForm({ country: e.target.value })} placeholder="e.g. Rwanda" className="h-11 rounded-xl border-border focus-visible:ring-[#0aa9ad]" />
                </div>
                <div className="space-y-3 md:col-span-2">
                  <Label className="font-semibold">Full Address</Label>
                  <Input value={formData.address} onChange={e => updateForm({ address: e.target.value })} placeholder="Street address, City, etc." className="h-11 rounded-xl border-border focus-visible:ring-[#0aa9ad]" />
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {currentStep === 3 && formData.supplier_type === "COMPANY" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="font-semibold">Registration Number</Label>
                  <Input value={formData.registrationNumber} onChange={e => updateForm({ registrationNumber: e.target.value })} placeholder="TIN or Reg No." className="h-11 rounded-xl border-border focus-visible:ring-[#0aa9ad]" />
                </div>
                <div className="space-y-3">
                  <Label className="font-semibold">Tax ID / VAT Number</Label>
                  <Input value={formData.taxId} onChange={e => updateForm({ taxId: e.target.value })} placeholder="VAT No." className="h-11 rounded-xl border-border focus-visible:ring-[#0aa9ad]" />
                </div>
                <div className="space-y-3">
                  <Label className="font-semibold">Business Category</Label>
                  <Select value={formData.businessCategory} onValueChange={val => updateForm({ businessCategory: val })}>
                    <SelectTrigger className="h-11 rounded-xl border-border focus-visible:ring-[#0aa9ad]"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pharma">Pharma</SelectItem>
                      <SelectItem value="Agriculture">Agriculture</SelectItem>
                      <SelectItem value="Hardware">Hardware</SelectItem>
                      <SelectItem value="Services">Services</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label className="font-semibold">Company Size</Label>
                  <Select value={formData.companySize} onValueChange={val => updateForm({ companySize: val })}>
                    <SelectTrigger className="h-11 rounded-xl border-border focus-visible:ring-[#0aa9ad]"><SelectValue placeholder="Select size" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Small">Small (1-50)</SelectItem>
                      <SelectItem value="Medium">Medium (51-250)</SelectItem>
                      <SelectItem value="Large">Large (250+)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3 md:col-span-2">
                  <Label className="font-semibold">Website</Label>
                  <Input value={formData.website} onChange={e => updateForm({ website: e.target.value })} placeholder="https://www.example.com" className="h-11 rounded-xl border-border focus-visible:ring-[#0aa9ad]" />
                </div>
              </div>
            )}

            {currentStep === 3 && formData.supplier_type === "INDIVIDUAL" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="font-semibold">National ID / Passport</Label>
                  <Input value={formData.nationalId} onChange={e => updateForm({ nationalId: e.target.value })} placeholder="ID Number" className="h-11 rounded-xl border-border focus-visible:ring-[#0aa9ad]" />
                </div>
                <div className="space-y-3">
                  <Label className="font-semibold">Specialization</Label>
                  <Select value={formData.specialization} onValueChange={val => updateForm({ specialization: val })}>
                    <SelectTrigger className="h-11 rounded-xl border-border focus-visible:ring-[#0aa9ad]"><SelectValue placeholder="Select specialization" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Technician">Technician</SelectItem>
                      <SelectItem value="Consultant">Consultant</SelectItem>
                      <SelectItem value="Farmer">Farmer</SelectItem>
                      <SelectItem value="Contractor">Contractor</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3 md:col-span-2">
                  <Label className="font-semibold">Experience Level</Label>
                  <Select value={formData.experienceLevel} onValueChange={val => updateForm({ experienceLevel: val })}>
                    <SelectTrigger className="h-11 rounded-xl border-border focus-visible:ring-[#0aa9ad]"><SelectValue placeholder="Select experience" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Junior">Junior (0-3 years)</SelectItem>
                      <SelectItem value="Mid">Mid-Level (3-8 years)</SelectItem>
                      <SelectItem value="Senior">Senior (8+ years)</SelectItem>
                      <SelectItem value="Expert">Expert / Master</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* STEP 4 */}
            {currentStep === 4 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="font-semibold">Payment Terms</Label>
                  <Select value={formData.paymentTerms} onValueChange={val => updateForm({ paymentTerms: val })}>
                    <SelectTrigger className="h-11 rounded-xl border-border focus-visible:ring-[#0aa9ad]"><SelectValue placeholder="Select terms" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash on Delivery">Cash on Delivery</SelectItem>
                      <SelectItem value="Net 7">Net 7 Days</SelectItem>
                      <SelectItem value="Net 14">Net 14 Days</SelectItem>
                      <SelectItem value="Net 30">Net 30 Days</SelectItem>
                      <SelectItem value="Monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label className="font-semibold">Preferred Payment Method</Label>
                  <Select value={formData.preferredPaymentMethod} onValueChange={val => updateForm({ preferredPaymentMethod: val })}>
                    <SelectTrigger className="h-11 rounded-xl border-border focus-visible:ring-[#0aa9ad]"><SelectValue placeholder="Select method" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label className="font-semibold">Currency</Label>
                  <Select value={formData.currency} onValueChange={val => updateForm({ currency: val })}>
                    <SelectTrigger className="h-11 rounded-xl border-border focus-visible:ring-[#0aa9ad]"><SelectValue placeholder="Select currency" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RWF">RWF</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label className="font-semibold">Credit Limit (Optional)</Label>
                  <Input type="number" value={formData.creditLimit} onChange={e => updateForm({ creditLimit: e.target.value })} placeholder="Max allowed credit" className="h-11 rounded-xl border-border focus-visible:ring-[#0aa9ad]" />
                </div>
                
                <div className="col-span-1 md:col-span-2 mt-4"><hr className="border-border" /></div>

                <div className="space-y-3">
                  <Label className="font-semibold">Approval Status</Label>
                  <Select value={formData.approval_status} onValueChange={val => updateForm({ approval_status: val })}>
                    <SelectTrigger className="h-11 rounded-xl border-border focus-visible:ring-[#0aa9ad]"><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="PENDING">Pending Review</SelectItem>
                      <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label className="font-semibold">Risk Level</Label>
                  <Select value={formData.risk_level} onValueChange={val => updateForm({ risk_level: val })}>
                    <SelectTrigger className="h-11 rounded-xl border-border focus-visible:ring-[#0aa9ad]"><SelectValue placeholder="Select risk" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low Risk</SelectItem>
                      <SelectItem value="MEDIUM">Medium Risk</SelectItem>
                      <SelectItem value="HIGH">High Risk</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label className="font-semibold">Lead Time (Days)</Label>
                  <Input type="number" value={formData.leadTimeDays} onChange={e => updateForm({ leadTimeDays: e.target.value })} placeholder="Avg days to deliver" className="h-11 rounded-xl border-border focus-visible:ring-[#0aa9ad]" />
                </div>
                <div className="space-y-3">
                  <Label className="font-semibold">Delivery Scope</Label>
                  <Select value={formData.deliveryAvailability} onValueChange={val => updateForm({ deliveryAvailability: val })}>
                    <SelectTrigger className="h-11 rounded-xl border-border focus-visible:ring-[#0aa9ad]"><SelectValue placeholder="Select scope" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Local">Local</SelectItem>
                      <SelectItem value="Regional">Regional</SelectItem>
                      <SelectItem value="International">International</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="p-6 border-t border-border bg-card/50 flex justify-between items-center">
            {currentStep > 1 ? (
              <Button variant="outline" onClick={prevStep} className="h-11 px-6 rounded-xl font-semibold border-border">
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            ) : (
              <div></div>
            )}

            {currentStep < totalSteps ? (
              <Button onClick={nextStep} className="h-11 px-6 rounded-xl bg-[#0aa9ad] hover:bg-[#07969a] text-white font-bold shadow-md shadow-teal-900/10">
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={updateMutation.isPending} className="h-11 px-8 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-900/20">
                {updateMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><CheckCircle2 className="mr-2 h-5 w-5" /> Save Changes</>}
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
