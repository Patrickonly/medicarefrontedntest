import digitalHealth from "@/assets/digital-health.jpg";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import {
    ArrowLeft,
    ArrowRight,
    Building2,
    Eye,
    EyeOff,
    HeartPulse,
    Loader2,
    User
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function RegisterPage() {
  const { success, error: toastError } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2;

  const { data: facilityTypes = [], isLoading: isLoadingFacilityTypes } = useQuery({
    queryKey: ["organization-types"],
    queryFn: async () => {
      try {
        const res = await api.get<{ success: boolean; data: Array<{ id: string | number; name: string; status?: string }> }>(
          "/api/organization-types"
        );
        return (res.data || [])
          .filter((t) => typeof t?.status === "string" && t.status.toUpperCase() === "ACTIVE")
          .map((t) => ({ id: String(t.id), label: t.name }));
      } catch (error: any) {
        console.error("Failed to fetch organization types:", error);
        toastError("Connection Error", error.message || "Failed to load organization types. Please try again.");
        return [];
      }
    },
  });

  // Step 1: Organization Details
  const [organizationTypeId, setOrganizationTypeId] = useState<string>("");

  useEffect(() => {
    if (!organizationTypeId && facilityTypes.length > 0) {
      setOrganizationTypeId(facilityTypes[0].id);
    }
  }, [facilityTypes, organizationTypeId]);
  const [organizationName, setOrganizationName] = useState("");
  const [businessUnit, setBusinessUnit] = useState("");
  const [taxId, setTaxId] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [website, setWebsite] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressCountry, setAddressCountry] = useState("Rwanda");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [certFile, setCertFile] = useState<File | null>(null);

  // Step 2: User Details
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const validateStep1 = () => {
    if (!organizationName.trim()) {
      toastError("Error", "Please enter your organization name.");
      return false;
    }
    if (!organizationTypeId) {
      toastError("Error", "Please select an organization type.");
      return false;
    }
    if (!addressCity.trim() || !addressCountry.trim()) {
      toastError("Error", "Please fill in the required address fields.");
      return false;
    }
    return true;
  };
  
  const validateStep2 = () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
      toastError("Error", "Please fill in all required user information fields.");
      return false;
    }
    if (password.length < 8) {
      toastError("Error", "Password must be at least 8 characters long.");
      return false;
    }
    return true;
  };
  
  const handleNext = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    }
  };
  
  const handleSubmit = async () => {
    if (!validateStep2()) return;
    
    setLoading(true);
    
    try {
      let logoUrl = "";
      let certUrl = "";

      if (logoFile) {
        const formData = new FormData();
        formData.append("file", logoFile);
        formData.append("kind", "avatar");
        const res = await fetch("/api/uploads", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          logoUrl = data.data?.url || "";
        }
      }

      if (certFile) {
        const formData = new FormData();
        formData.append("file", certFile);
        formData.append("kind", "misc");
        const res = await fetch("/api/uploads", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          certUrl = data.data?.url || "";
        }
      }

      const { error: signUpError, userId, organizationId } = await signUp({
        organizationName,
        organizationTypeId,
        firstName,
        lastName,
        email,
        phone,
        password,
        businessUnit,
        taxId,
        registrationNumber,
        licenseNumber,
        website,
        logo_url: logoUrl || undefined,
        business_certificate_url: certUrl || undefined,
        address: {
          country: addressCountry,
          city: addressCity
        }
      } as any);
      
      if (signUpError) {
        toastError("Error", signUpError.message || "Failed to register");
        setLoading(false);
        return;
      }
      
      success("Success", "Account created successfully!");
      // No userId/organizationId in the URL - SubscriptionPage derives both
      // from the signed flow session useAuth already stored in
      // sessionStorage during signUp().
      navigate("/subscription");
    } catch (err) {
      toastError("Error", "An error occurred during registration. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-20 h-80 w-80 rounded-[5rem] bg-[#e4fafa]" />
        <div className="absolute right-[-120px] bottom-20 h-96 w-96 rounded-[5rem] bg-[#dff8f8]" />
      </div>

      <div className="relative grid min-h-screen lg:grid-cols-[0.95fr_1.05fr]">
        <section className="relative hidden overflow-hidden bg-[#0aa9ad] text-white lg:block">
          <img
            src={digitalHealth}
            alt="Digital healthcare operations workspace"
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-40 mix-blend-overlay"
          />

          <div className="absolute inset-0 bg-gradient-to-tr from-[#057d82]/90 via-[#079ba0]/80 to-[#0aa9ad]/60" />
          
          <div className="absolute left-10 top-10 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-card text-[#07969a] shadow-xl shadow-teal-950/10">
              <HeartPulse className="h-7 w-7" />
            </div>
            <div>
              <p className="font-heading text-2xl font-extrabold tracking-tight">MEDICARE ONE</p>
              <p className="text-xs font-black uppercase tracking-[0.26em] text-white/75">Healthcare Operations</p>
            </div>
          </div>

          <div className="relative z-10 flex min-h-screen flex-col justify-center px-12 py-24 xl:px-16">
            <div className="max-w-xl">
              <div className="mb-7 inline-flex rounded-full bg-card/20 px-4 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-white backdrop-blur">
                Secure Facility Onboarding
              </div>
              <h1 className="font-heading text-5xl font-extrabold leading-tight tracking-tight xl:text-6xl">
                Register your facility with confidence.
              </h1>
              <p className="mt-7 max-w-lg text-lg font-medium leading-relaxed text-teal-50">
                Join thousands of healthcare providers streamlining their operations securely with MedicareOne.
              </p>
            </div>
          </div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <div className="w-full max-w-2xl">
            <Link to="/" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#5f6d84] transition hover:text-[#07969a]">
              <ArrowLeft size={16} />
              Back to home
            </Link>

            <div className="rounded-[2.5rem] border border-border bg-card/95 p-7 shadow-2xl shadow-teal-900/10 backdrop-blur sm:p-9">
              <div className="mb-8 flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0aa9ad] text-white">
                  {currentStep === 1 ? <Building2 className="h-7 w-7" /> : <User className="h-7 w-7" />}
                </div>
                <div>
                  <p className="font-heading text-2xl font-extrabold text-[#09111f]">
                    {currentStep === 1 ? "Organization Setup" : "Administrator Profile"}
                  </p>
                  <p className="text-sm font-bold text-[#8ba0b8]">
                    Step {currentStep} of {totalSteps}
                  </p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-8 h-2 bg-[#eef4f5] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#0aa9ad] transition-all duration-500 ease-in-out"
                  style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                />
              </div>

              {/* Step 1: Organization Details */}
              {currentStep === 1 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-sm font-black text-[#09111f]">Organization Name *</label>
                      <input
                        type="text"
                        className="w-full h-14 rounded-xl border border-border px-4 text-sm font-bold text-[#09111f] outline-none transition focus:border-[#0aa9ad] focus:ring-4 focus:ring-[#0aa9ad]/10"
                        placeholder="e.g. Hope Clinic"
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="organizationTypeId" className="mb-1.5 block text-sm font-black text-[#09111f]">Organization Type *</label>
                      <select
                        id="organizationTypeId"
                        aria-label="Organization Type"
                        className="w-full h-14 rounded-xl border border-border px-4 text-sm font-bold text-[#09111f] outline-none transition focus:border-[#0aa9ad] focus:ring-4 focus:ring-[#0aa9ad]/10 bg-card"
                        value={organizationTypeId}
                        onChange={(e) => setOrganizationTypeId(e.target.value)}
                        disabled={isLoadingFacilityTypes}
                      >
                        {isLoadingFacilityTypes && <option value="">Loading...</option>}
                        {!isLoadingFacilityTypes && facilityTypes.length === 0 && <option value="">No facility types available</option>}
                        {facilityTypes.map((t) => (
                          <option key={t.id} value={t.id}>{t.label}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-black text-[#09111f]">Business Unit</label>
                      <input
                        type="text"
                        className="w-full h-14 rounded-xl border border-border px-4 text-sm font-bold text-[#09111f] outline-none transition focus:border-[#0aa9ad] focus:ring-4 focus:ring-[#0aa9ad]/10"
                        placeholder="e.g. Healthcare"
                        value={businessUnit}
                        onChange={(e) => setBusinessUnit(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-sm font-black text-[#09111f]">Tax ID</label>
                      <input
                        type="text"
                        className="w-full h-14 rounded-xl border border-border px-4 text-sm font-bold text-[#09111f] outline-none transition focus:border-[#0aa9ad] focus:ring-4 focus:ring-[#0aa9ad]/10"
                        placeholder="Optional"
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-black text-[#09111f]">Registration No.</label>
                      <input
                        type="text"
                        className="w-full h-14 rounded-xl border border-border px-4 text-sm font-bold text-[#09111f] outline-none transition focus:border-[#0aa9ad] focus:ring-4 focus:ring-[#0aa9ad]/10"
                        placeholder="Optional"
                        value={registrationNumber}
                        onChange={(e) => setRegistrationNumber(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-sm font-black text-[#09111f]">Country *</label>
                      <select
                        className="w-full h-14 rounded-xl border border-border px-4 text-sm font-bold text-[#09111f] outline-none transition focus:border-[#0aa9ad] focus:ring-4 focus:ring-[#0aa9ad]/10 bg-card"
                        value={addressCountry}
                        onChange={(e) => setAddressCountry(e.target.value)}
                      >
                        <option value="Rwanda">Rwanda</option>
                        <option value="Kenya">Kenya</option>
                        <option value="Uganda">Uganda</option>
                        <option value="Tanzania">Tanzania</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-sm font-black text-[#09111f]">City *</label>
                      <input
                        type="text"
                        className="w-full h-14 rounded-xl border border-border px-4 text-sm font-bold text-[#09111f] outline-none transition focus:border-[#0aa9ad] focus:ring-4 focus:ring-[#0aa9ad]/10"
                        placeholder="Kigali"
                        value={addressCity}
                        onChange={(e) => setAddressCity(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-black text-[#09111f]">Upload Logo (Optional)</label>
                      <input
                        type="file"
                        accept="image/*"
                        className="w-full h-14 rounded-xl border border-border px-4 py-3 text-sm font-bold text-[#09111f] outline-none transition focus:border-[#0aa9ad] focus:ring-4 focus:ring-[#0aa9ad]/10 bg-card cursor-pointer"
                        onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-black text-[#09111f]">Business Certificate (Optional)</label>
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        className="w-full h-14 rounded-xl border border-border px-4 py-3 text-sm font-bold text-[#09111f] outline-none transition focus:border-[#0aa9ad] focus:ring-4 focus:ring-[#0aa9ad]/10 bg-card cursor-pointer"
                        onChange={(e) => setCertFile(e.target.files?.[0] || null)}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: User Details */}
              {currentStep === 2 && (
                <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-black text-[#09111f]">First Name *</label>
                      <input
                        type="text"
                        className="w-full h-14 rounded-xl border border-border px-4 text-sm font-bold text-[#09111f] outline-none transition focus:border-[#0aa9ad] focus:ring-4 focus:ring-[#0aa9ad]/10"
                        placeholder="John"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-black text-[#09111f]">Last Name *</label>
                      <input
                        type="text"
                        className="w-full h-14 rounded-xl border border-border px-4 text-sm font-bold text-[#09111f] outline-none transition focus:border-[#0aa9ad] focus:ring-4 focus:ring-[#0aa9ad]/10"
                        placeholder="Doe"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label className="mb-1.5 block text-sm font-black text-[#09111f]">Email Address *</label>
                      <input
                        type="email"
                        className="w-full h-14 rounded-xl border border-border px-4 text-sm font-bold text-[#09111f] outline-none transition focus:border-[#0aa9ad] focus:ring-4 focus:ring-[#0aa9ad]/10"
                        placeholder="john@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-black text-[#09111f]">Phone Number</label>
                      <input
                        type="tel"
                        className="w-full h-14 rounded-xl border border-border px-4 text-sm font-bold text-[#09111f] outline-none transition focus:border-[#0aa9ad] focus:ring-4 focus:ring-[#0aa9ad]/10"
                        placeholder="+250780000000"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-sm font-black text-[#09111f]">Password *</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          className="w-full h-14 rounded-xl border border-border px-4 pr-12 text-sm font-bold text-[#09111f] outline-none transition focus:border-[#0aa9ad] focus:ring-4 focus:ring-[#0aa9ad]/10"
                          placeholder="Create a secure password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                        <button
                          type="button"
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5f6d84] transition hover:text-[#07969a]"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="mt-8 flex gap-4">
                {currentStep > 1 && (
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(1)}
                    className="flex-1 h-14 rounded-full border-2 border-border bg-transparent text-[#09111f] hover:bg-[#eef4f5] text-base font-black"
                  >
                    Back
                  </Button>
                )}
                {currentStep < totalSteps ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="flex-[2] h-14 rounded-full bg-[#0aa9ad] text-white hover:bg-[#07969a] shadow-xl shadow-teal-500/20 text-base font-black"
                  >
                    Continue
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-[2] h-14 rounded-full bg-[#0aa9ad] text-white hover:bg-[#07969a] shadow-xl shadow-teal-500/20 text-base font-black"
                  >
                    {loading ? (
                      <><Loader2 size={18} className="mr-2 animate-spin" /> Registering...</>
                    ) : (
                      "Complete Registration"
                    )}
                  </Button>
                )}
              </div>

              <p className="mt-7 text-center text-sm font-semibold text-[#5f6d84]">
                Already have an account?{" "}
                <Link to="/login" className="font-black text-[#07969a] hover:text-[#056e72]">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
