import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { localDB } from "@/data/localStorageDB";
import { useToast } from "@/hooks/use-toast";
import type { BillingCycle, OrganizationType, PaymentMethod } from "@/types/models";
import { ArrowLeft, ArrowRight, CheckCircle, CreditCard, HeartPulse, Shield, Smartphone, Star, Zap, Building, MapPin, CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

interface PlanFeature {
  starter: boolean;
  professional: boolean;
  enterprise: boolean;
  text: string;
}

const FEATURES: PlanFeature[] = [
  { starter: true, professional: true, enterprise: true, text: "Enterprise Point of Sale (POS)" },
  { starter: true, professional: true, enterprise: true, text: "Basic Inventory Management" },
  { starter: true, professional: true, enterprise: true, text: "Customer Management" },
  { starter: false, professional: true, enterprise: true, text: "Supplier & Procurement Management" },
  { starter: false, professional: true, enterprise: true, text: "Batch/Lot & Expiry Date Tracking" },
  { starter: false, professional: true, enterprise: true, text: "FEFO & FIFO Inventory Logic" },
  { starter: false, professional: true, enterprise: true, text: "Basic Financial Reports" },
  { starter: false, professional: true, enterprise: true, text: "Employee & User Management" },
  { starter: false, professional: true, enterprise: true, text: "Executive Dashboard" },
  { starter: false, professional: true, enterprise: true, text: "Offline Operation" },
  { starter: false, professional: true, enterprise: true, text: "Rwanda EBM Integration Ready" },
  { starter: false, professional: false, enterprise: true, text: "Advanced Financial Analytics" },
  { starter: false, professional: false, enterprise: true, text: "Multi-Location Support" },
  { starter: false, professional: false, enterprise: true, text: "Dedicated Account Manager" },
  { starter: false, professional: false, enterprise: true, text: "Priority 24/7 Support" },
  { starter: false, professional: false, enterprise: true, text: "Custom API Access" },
];

const PRICES = {
  monthly: {
    starter: 18999,
    professional: 35999,
    enterprise: 85999,
  },
  yearly: {
    starter: 18999 * 11, // 1 month free
    professional: 35999 * 11, // 1 month free
    enterprise: 85999 * 11, // 1 month free
  }
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

export default function SubscriptionPage() {
  const [searchParams] = useSearchParams();
  const tempUserId = searchParams.get("tempUserId");
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [selectedPlan, setSelectedPlan] = useState<"starter" | "professional" | "enterprise">("professional");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [loading, setLoading] = useState(false);
  const [organizationType, setOrganizationType] = useState<OrganizationType>("agrovet");

  // Step 2 details
  const [orgName, setOrgName] = useState("");
  const [orgLocation, setOrgLocation] = useState("");
  
  // Custom Duration state for Agrovet
  const [durationMonths, setDurationMonths] = useState<number>(1);

  useEffect(() => {
    if (tempUserId) {
      const tempUser = localDB.tempUsers.getById(tempUserId);
      if (tempUser) {
        setOrganizationType(tempUser.organization_type);
        setOrgName(tempUser.organization_name || "");
      }
    }
  }, [tempUserId]);

  const getPlanName = (plan: string) => {
    if (organizationType === "agrovet") return "MedicareOne System";
    switch (plan) {
      case "starter": return "Starter";
      case "professional": return "Professional";
      case "enterprise": return "Enterprise";
      default: return "Professional";
    }
  };

  const getPrice = () => {
    if (organizationType === "agrovet") {
      // 35,999 per month
      return 35999 * durationMonths;
    }
    return PRICES[billingCycle][selectedPlan];
  };
  
  const getCoverageText = () => {
    const today = new Date();
    const currentMonthIdx = today.getMonth();
    const currentYear = today.getFullYear();
    
    const endMonthIdx = (currentMonthIdx + durationMonths) % 12;
    const endYear = currentYear + Math.floor((currentMonthIdx + durationMonths) / 12);
    
    return `${MONTHS[currentMonthIdx]} ${currentYear} - ${MONTHS[endMonthIdx === 0 ? 11 : endMonthIdx - 1]} ${endMonthIdx === 0 ? endYear - 1 : endYear}`;
  };

  const handleNextStep = () => setStep((s) => Math.min(s + 1, 3));
  const handlePrevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleSubscribe = async () => {
    if (!tempUserId) {
      toast({ title: "Error", description: "Invalid session", variant: "destructive" });
      return;
    }

    const tempUser = localDB.tempUsers.getById(tempUserId);
    if (!tempUser) {
      toast({ title: "Error", description: "Session expired", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      // Create new OTP for the login step later
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();

      localDB.tempUsers.update(tempUserId, {
        subscription_purchased: true,
        subscription_plan: getPlanName(selectedPlan),
        subscription_billing_cycle: organizationType === "agrovet" ? (durationMonths === 12 ? "yearly" : "monthly") : billingCycle,
        subscription_payment_method: paymentMethod,
        subscription_amount: getPrice(),
        organization_name: orgName,
        // @ts-ignore - Adding custom field to tempUsers for the DB
        subscription_duration_months: durationMonths,
        otp: newOtp, // Reset OTP
        otp_expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
      });

      toast({
        title: "Subscription Setup Complete!",
        description: "Please sign in to your account and complete OTP verification."
      });

      // Instead of navigating to OTP, navigate to login
      navigate("/login");
    } catch (error) {
      toast({
        title: "Subscription failed",
        description: "An error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5fbfb]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-20 h-80 w-80 rounded-[5rem] bg-[#e4fafa]" />
        <div className="absolute right-[-120px] bottom-20 h-96 w-96 rounded-[5rem] bg-[#dff8f8]" />
      </div>

      <div className="relative grid min-h-screen lg:grid-cols-[0.8fr_1.2fr]">
        {/* Left Column - Branded Side */}
        <section className="relative hidden overflow-hidden bg-[#0aa9ad] text-white lg:block">
          <div className="absolute inset-0 bg-gradient-to-r from-[#057d82] via-[#079ba0]/90 to-[#0aa9ad]/55" />
          <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-[5rem] bg-white/10" />
          <div className="absolute right-10 top-28 h-52 w-52 rounded-[4rem] bg-white/10" />

          <div className="absolute left-10 top-10 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#07969a] shadow-xl shadow-teal-950/10">
              <HeartPulse className="h-7 w-7" />
            </div>
            <div>
              <p className="font-heading text-2xl font-extrabold tracking-tight">MEDICARE ONE</p>
              <p className="text-xs font-black uppercase tracking-[0.26em] text-white/75">
                {organizationType === "agrovet" ? "Agrovet Operations" : "Healthcare Operations"}
              </p>
            </div>
          </div>

          <div className="relative z-10 flex min-h-screen flex-col justify-center px-12 py-24 xl:px-16">
            <div className="max-w-xl">
              <div className="mb-7 inline-flex rounded-full bg-white/15 px-4 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-white/90 backdrop-blur">
                Step {step} of 3
              </div>

              <h1 className="font-heading text-4xl font-extrabold leading-[1.03] tracking-tight xl:text-5xl">
                {step === 1 && "Choose the perfect plan for your business"}
                {step === 2 && "Let's personalize your experience"}
                {step === 3 && "Secure your subscription"}
              </h1>

              <p className="mt-7 max-w-lg text-lg font-semibold leading-relaxed text-white/88">
                {step === 1 && `Get full access to MedicareOne features tailored for your ${organizationType === "agrovet" ? "Agrovet Pharmacy" : "Healthcare Facility"}`}
                {step === 2 && "Review the plan features and provide a few more details to set up your organization."}
                {step === 3 && "Complete your payment safely using our secure payment gateway."}
              </p>

              <div className="mt-12">
                <div className="flex items-center gap-4">
                  {[1, 2, 3].map((s) => (
                    <div key={s} className="flex items-center gap-2">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold transition-colors ${step >= s ? "bg-white text-[#0aa9ad]" : "bg-white/20 text-white"}`}>
                        {s < step ? <CheckCircle className="h-5 w-5" /> : s}
                      </div>
                      {s < 3 && <div className={`h-1 w-12 rounded-full ${step > s ? "bg-white" : "bg-white/20"}`} />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column - Wizard */}
        <section className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <div className="w-full max-w-4xl">
            <Button
              variant="ghost"
              className="mb-6 text-[#5f6d84]"
              onClick={() => step === 1 ? navigate("/register") : handlePrevStep()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {step === 1 ? "Back to Registration" : "Back"}
            </Button>

            <div className="rounded-[2.5rem] border border-[#dcebf0] bg-white/95 p-7 shadow-2xl shadow-teal-900/10 backdrop-blur sm:p-9 min-h-[600px] flex flex-col">
              
              {/* --- STEP 1: Plan Selection --- */}
              {step === 1 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex-1">
                  <div className="mb-7 flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h2 className="font-heading text-2xl font-extrabold text-[#09111f]">Select a Plan</h2>
                      <p className="text-sm text-[#5f6d84]">Choose the duration for your subscription.</p>
                    </div>
                    {organizationType !== "agrovet" && (
                      <Tabs
                        defaultValue="monthly"
                        onValueChange={(v) => setBillingCycle(v as BillingCycle)}
                        className="w-[280px]"
                      >
                        <TabsList className="w-full grid grid-cols-2 bg-[#f6fbfb]">
                          <TabsTrigger value="monthly" className="data-[state=active]:bg-white rounded-full">Monthly</TabsTrigger>
                          <TabsTrigger value="yearly" className="data-[state=active]:bg-white rounded-full">Yearly</TabsTrigger>
                        </TabsList>
                      </Tabs>
                    )}
                  </div>

                  {organizationType === "agrovet" ? (
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6 mb-8">
                      {/* Unified Agrovet Plan */}
                      <div className="relative rounded-[1.6rem] border border-[#0aa9ad] bg-[#e8fbfb] shadow-lg ring-2 ring-[#0aa9ad] p-6 h-fit">
                        <div className="flex items-center gap-2 mb-4">
                          <Star className="h-5 w-5 text-[#07969a]" />
                          <h3 className="text-xl font-bold text-[#09111f]">MedicareOne System</h3>
                        </div>
                        <div className="mb-6">
                          <span className="text-3xl font-extrabold text-[#09111f]">
                            35,999
                          </span>
                          <span className="text-sm text-[#5f6d84]"> RWF/month (VAT Exclusive)</span>
                        </div>
                        
                        <div className="space-y-4">
                          <div className="p-4 bg-white rounded-xl border border-teal-100">
                            <Label className="text-sm font-bold text-slate-700 mb-2 block">Select Duration</Label>
                            <Select value={durationMonths.toString()} onValueChange={(v) => setDurationMonths(parseInt(v))}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select months" />
                              </SelectTrigger>
                              <SelectContent>
                                {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                                  <SelectItem key={m} value={m.toString()}>
                                    {m === 12 ? "1 Year (12 Months)" : `${m} Month${m > 1 ? 's' : ''}`}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div className="p-4 bg-white rounded-xl border border-teal-100 flex items-center gap-3">
                            <CalendarDays className="h-5 w-5 text-teal-600" />
                            <div>
                              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Coverage Period</p>
                              <p className="text-sm font-medium text-slate-900">{getCoverageText()}</p>
                            </div>
                          </div>

                          {durationMonths > 1 && (
                            <div className="p-4 bg-teal-50 rounded-xl border border-teal-200 flex items-center justify-between">
                              <span className="text-sm font-bold text-teal-800">Total Amount ({durationMonths} months)</span>
                              <span className="text-xl font-black text-teal-900">
                                {getPrice().toLocaleString()} <span className="text-sm font-bold">RWF</span>
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                        <h4 className="font-bold text-slate-900 mb-4">Everything you need:</h4>
                        <ul className="space-y-3 text-sm text-[#5f6d84]">
                          <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-[#07969a] flex-shrink-0" /> Enterprise-grade POS</li>
                          <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-[#07969a] flex-shrink-0" /> Offline-first technology</li>
                          <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-[#07969a] flex-shrink-0" /> Rwanda EBM Ready</li>
                          <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-[#07969a] flex-shrink-0" /> Secure cloud backup</li>
                          <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-[#07969a] flex-shrink-0" /> Inventory intelligence</li>
                          <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-[#07969a] flex-shrink-0" /> Multi-user access</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      {/* Starter Plan */}
                      <div
                        className={`relative rounded-[1.6rem] border p-6 cursor-pointer transition-all ${
                          selectedPlan === "starter"
                            ? "border-[#0aa9ad] bg-[#e8fbfb] shadow-lg ring-1 ring-[#0aa9ad]"
                            : "border-[#dcebf0] bg-white hover:border-[#8ee4e7]"
                        }`}
                        onClick={() => setSelectedPlan("starter")}
                      >
                        <div className="flex items-center gap-2 mb-4">
                          <Zap className="h-5 w-5 text-[#07969a]" />
                          <h3 className="text-xl font-bold text-[#09111f]">Starter</h3>
                        </div>
                        <div className="mb-4">
                          <span className="text-3xl font-extrabold text-[#09111f]">
                            {PRICES[billingCycle].starter.toLocaleString()}
                          </span>
                          <span className="text-sm text-[#5f6d84]"> RWF/{billingCycle === "monthly" ? "mo" : "yr"}</span>
                        </div>
                        <ul className="space-y-3 mb-6 text-sm text-[#5f6d84]">
                          <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-[#07969a]" /> Basic POS</li>
                          <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-[#07969a]" /> Basic Inventory</li>
                        </ul>
                      </div>

                      {/* Professional Plan */}
                      <div
                        className={`relative rounded-[1.6rem] border p-6 cursor-pointer transition-all ${
                          selectedPlan === "professional"
                            ? "border-[#0aa9ad] bg-[#e8fbfb] shadow-lg ring-2 ring-[#0aa9ad]"
                            : "border-[#dcebf0] bg-white hover:border-[#8ee4e7]"
                        }`}
                        onClick={() => setSelectedPlan("professional")}
                      >
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <span className="bg-[#0aa9ad] text-white px-4 py-1 rounded-full text-[10px] font-bold">POPULAR</span>
                        </div>
                        <div className="flex items-center gap-2 mb-4">
                          <Star className="h-5 w-5 text-[#07969a]" />
                          <h3 className="text-xl font-bold text-[#09111f]">Professional</h3>
                        </div>
                        <div className="mb-4">
                          <span className="text-3xl font-extrabold text-[#09111f]">
                            {PRICES[billingCycle].professional.toLocaleString()}
                          </span>
                          <span className="text-sm text-[#5f6d84]"> RWF/{billingCycle === "monthly" ? "mo" : "yr"}</span>
                        </div>
                        <ul className="space-y-3 mb-6 text-sm text-[#5f6d84]">
                          <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-[#07969a]" /> Batch/Expiry Tracking</li>
                          <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-[#07969a]" /> Financial Reports</li>
                          <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-[#07969a]" /> Rwanda EBM Ready</li>
                        </ul>
                      </div>

                      {/* Enterprise Plan */}
                      <div
                        className={`relative rounded-[1.6rem] border p-6 cursor-pointer transition-all ${
                          selectedPlan === "enterprise"
                            ? "border-[#0aa9ad] bg-[#e8fbfb] shadow-lg ring-1 ring-[#0aa9ad]"
                            : "border-[#dcebf0] bg-white hover:border-[#8ee4e7]"
                        }`}
                        onClick={() => setSelectedPlan("enterprise")}
                      >
                        <div className="flex items-center gap-2 mb-4">
                          <Shield className="h-5 w-5 text-[#07969a]" />
                          <h3 className="text-xl font-bold text-[#09111f]">Enterprise</h3>
                        </div>
                        <div className="mb-4">
                          <span className="text-3xl font-extrabold text-[#09111f]">
                            {PRICES[billingCycle].enterprise.toLocaleString()}
                          </span>
                          <span className="text-sm text-[#5f6d84]"> RWF/{billingCycle === "monthly" ? "mo" : "yr"}</span>
                        </div>
                        <ul className="space-y-3 mb-6 text-sm text-[#5f6d84]">
                          <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-[#07969a]" /> Multi-Location</li>
                          <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-[#07969a]" /> Custom API</li>
                          <li className="flex gap-2"><CheckCircle className="h-4 w-4 text-[#07969a]" /> 24/7 Priority Support</li>
                        </ul>
                      </div>
                    </div>
                  )}
                  
                  <div className="mt-auto pt-6 flex justify-end border-t border-[#dcebf0]">
                    <Button 
                      className="h-12 px-8 rounded-full bg-[#09111f] hover:bg-slate-800 text-white shadow-xl shadow-slate-900/10"
                      onClick={handleNextStep}
                    >
                      Continue <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* --- STEP 2: Details & Features --- */}
              {step === 2 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex-1 flex flex-col">
                  <div className="mb-7">
                    <h2 className="font-heading text-2xl font-extrabold text-[#09111f]">Review & Setup</h2>
                    <p className="text-sm text-[#5f6d84]">Let's ensure we have your organization details correctly.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                    <div className="space-y-6">
                      <div className="space-y-4">
                        <Label className="text-[#09111f] font-bold">Organization Name</Label>
                        <div className="relative">
                          <Building className="absolute left-3 top-3 h-5 w-5 text-[#8ba0b8]" />
                          <Input 
                            value={orgName} 
                            onChange={(e) => setOrgName(e.target.value)}
                            className="pl-10 h-12 rounded-xl bg-[#f6fbfb] border-[#dcebf0] focus-visible:ring-[#0aa9ad]" 
                            placeholder="e.g. FONI AGROVET"
                          />
                        </div>
                      </div>
                      <div className="space-y-4">
                        <Label className="text-[#09111f] font-bold">Location Details</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-5 w-5 text-[#8ba0b8]" />
                          <Input 
                            value={orgLocation}
                            onChange={(e) => setOrgLocation(e.target.value)}
                            className="pl-10 h-12 rounded-xl bg-[#f6fbfb] border-[#dcebf0] focus-visible:ring-[#0aa9ad]" 
                            placeholder="e.g. Kigali, Rwanda"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.6rem] border border-[#dcebf0] bg-[#f6fbfb] p-6">
                      <h3 className="font-bold text-[#09111f] mb-4 text-sm uppercase tracking-wider">Plan Inclusions</h3>
                      <div className="space-y-3 h-[240px] overflow-y-auto pr-2 custom-scrollbar">
                        {FEATURES.map((feat, idx) => {
                          const isIncluded = organizationType === "agrovet" ? feat.professional : feat[selectedPlan];
                          if (!isIncluded) return null;
                          return (
                            <div key={idx} className="flex items-start gap-3 text-sm text-[#09111f]">
                              <CheckCircle className="h-4 w-4 text-[#07969a] flex-shrink-0 mt-0.5" />
                              <span>{feat.text}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto pt-6 flex flex-col sm:flex-row justify-between gap-4 border-t border-[#dcebf0]">
                    <p className="text-[#5f6d84] self-center">
                      Total: <span className="font-bold text-[#09111f]">{getPrice().toLocaleString()} RWF</span> / {organizationType === "agrovet" ? `${durationMonths} month${durationMonths > 1 ? 's' : ''}` : billingCycle}
                    </p>
                    <Button 
                      className="h-12 px-8 rounded-full bg-[#09111f] hover:bg-slate-800 text-white shadow-xl shadow-slate-900/10"
                      onClick={() => {
                        if (!orgName) {
                          toast({ title: "Required", description: "Please enter your organization name.", variant: "destructive" });
                          return;
                        }
                        handleNextStep();
                      }}
                    >
                      Continue to Payment <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* --- STEP 3: Payment --- */}
              {step === 3 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex-1 flex flex-col">
                  <div className="mb-7">
                    <h2 className="font-heading text-2xl font-extrabold text-[#09111f]">Payment Method</h2>
                    <p className="text-sm text-[#5f6d84]">Choose how you'd like to securely pay for your subscription.</p>
                  </div>

                  <div className="mb-8 max-w-2xl mx-auto w-full">
                    <RadioGroup
                      defaultValue="card"
                      onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    >
                      <div>
                        <RadioGroupItem value="card" id="card" className="peer sr-only" />
                        <Label
                          htmlFor="card"
                          className="flex flex-col items-center justify-between rounded-[1.6rem] border-2 border-muted bg-white p-6 hover:bg-[#e8fbfb] hover:text-[#07969a] peer-data-[state=checked]:border-[#0aa9ad] [&:has([data-state=checked])]:border-[#0aa9ad] [&:has([data-state=checked])]:bg-[#f0fcfc] cursor-pointer"
                        >
                          <CreditCard className="mb-3 h-10 w-10 text-[#5f6d84] peer-data-[state=checked]:text-[#0aa9ad]" />
                          <div className="text-center">
                            <p className="font-bold text-[#09111f]">Credit/Debit Card</p>
                            <p className="text-sm text-[#5f6d84]">Visa, Mastercard</p>
                          </div>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="momo" id="momo" className="peer sr-only" />
                        <Label
                          htmlFor="momo"
                          className="flex flex-col items-center justify-between rounded-[1.6rem] border-2 border-muted bg-white p-6 hover:bg-[#e8fbfb] hover:text-[#07969a] peer-data-[state=checked]:border-[#0aa9ad] [&:has([data-state=checked])]:border-[#0aa9ad] [&:has([data-state=checked])]:bg-[#f0fcfc] cursor-pointer"
                        >
                          <Smartphone className="mb-3 h-10 w-10 text-[#5f6d84] peer-data-[state=checked]:text-[#0aa9ad]" />
                          <div className="text-center">
                            <p className="font-bold text-[#09111f]">Mobile Money</p>
                            <p className="text-sm text-[#5f6d84]">Momo Pay</p>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="bg-[#f6fbfb] rounded-2xl p-6 mb-8 border border-[#dcebf0]">
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-[#dcebf0]">
                      <span className="text-[#5f6d84] font-medium">Selected Plan</span>
                      <span className="font-bold text-[#09111f]">{getPlanName(selectedPlan)} ({organizationType === "agrovet" ? `${durationMonths} month(s)` : billingCycle})</span>
                    </div>
                    <div className="flex justify-between items-center text-lg">
                      <span className="text-[#09111f] font-bold">Total Due</span>
                      <span className="font-extrabold text-[#07969a]">{getPrice().toLocaleString()} RWF</span>
                    </div>
                  </div>

                  <div className="mt-auto pt-6 flex flex-col sm:flex-row justify-between gap-4 border-t border-[#dcebf0]">
                    <p className="text-xs text-[#5f6d84] self-center flex items-center gap-1">
                      <Shield className="h-4 w-4" /> Secure, encrypted payment
                    </p>
                    <Button
                      className="h-14 px-10 rounded-full bg-[#0aa9ad] text-base font-black text-white hover:bg-[#07969a] shadow-xl shadow-teal-500/20"
                      onClick={handleSubscribe}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          Processing...
                        </>
                      ) : (
                        `Pay ${getPrice().toLocaleString()} RWF`
                      )}
                    </Button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
