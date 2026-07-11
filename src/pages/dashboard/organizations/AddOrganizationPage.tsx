import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Building2, Eye, EyeOff, Loader2, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AddOrganizationPage() {
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2;

  const { data: facilityTypes = [], isLoading: isLoadingFacilityTypes } = useQuery({
    queryKey: ["organization-types"],
    queryFn: async () => {
      try {
        const res = await api.get<{ success: boolean; data: Array<{ id: string | number; name: string; status?: string }> }>("/api/organization-types");
        return (res.data || [])
          .filter((t) => typeof t?.status === "string" && t.status.toUpperCase() === "ACTIVE")
          .map((t) => ({ id: String(t.id), label: t.name }));
      } catch (error) {
        console.error("Failed to fetch organization types:", error);
        return [];
      }
    },
  });

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

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleNext = () => {
    if (!organizationName || !organizationTypeId) {
      toastError("Error", "Please fill all required organization fields");
      return;
    }
    setCurrentStep(2);
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/api/auth/register", {
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
        address: { city: addressCity, country: addressCountry }
      });
      return res.data;
    },
    onSuccess: () => {
      success("Organization created", `${organizationName} was added and their admin account was created.`);
      queryClient.invalidateQueries({ queryKey: ["admin_organizations"] });
      navigate("/dashboard/organizations");
    },
    onError: (err: any) => {
      toastError("Error", err.message || "Failed to create organization.");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password) {
      toastError("Error", "Please fill all required admin fields");
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="mx-auto max-w-[1600px] p-6">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard/organizations")}
          className="mb-4 -ml-4 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Organizations
        </Button>
        <h1 className="text-2xl font-bold text-foreground">New Organization</h1>
        <p className="text-sm text-muted-foreground">Add a new tenant organization to the platform using the full registration flow.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="mb-8 flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            {currentStep === 1 ? <Building2 className="h-7 w-7" /> : <User className="h-7 w-7" />}
          </div>
          <div>
            <p className="text-xl font-bold text-foreground">
              {currentStep === 1 ? "Organization Setup" : "Administrator Profile"}
            </p>
            <p className="text-sm font-medium text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-in-out"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Organization Details */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-500">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold text-foreground">Organization Name *</label>
                  <input
                    type="text"
                    className="w-full h-12 rounded-xl border border-border px-4 text-sm bg-background text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="e.g. Hope Clinic"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                  />
                </div>
                
                <div>
                  <label htmlFor="organizationTypeId" className="mb-1.5 block text-sm font-semibold text-foreground">Organization Type *</label>
                  <select
                    id="organizationTypeId"
                    aria-label="Organization Type"
                    className="w-full h-12 rounded-xl border border-border px-4 text-sm bg-background text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
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
                  <label className="mb-1.5 block text-sm font-semibold text-foreground">Business Unit</label>
                  <input
                    type="text"
                    className="w-full h-12 rounded-xl border border-border px-4 text-sm bg-background text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="e.g. Healthcare"
                    value={businessUnit}
                    onChange={(e) => setBusinessUnit(e.target.value)}
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-foreground">Tax ID</label>
                  <input
                    type="text"
                    className="w-full h-12 rounded-xl border border-border px-4 text-sm bg-background text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="Optional"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-foreground">Registration No.</label>
                  <input
                    type="text"
                    className="w-full h-12 rounded-xl border border-border px-4 text-sm bg-background text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="Optional"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-foreground">Country *</label>
                  <input
                    type="text"
                    className="w-full h-12 rounded-xl border border-border px-4 text-sm bg-background text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                    value={addressCountry}
                    onChange={(e) => setAddressCountry(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-foreground">City *</label>
                  <input
                    type="text"
                    className="w-full h-12 rounded-xl border border-border px-4 text-sm bg-background text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="Kigali"
                    value={addressCity}
                    onChange={(e) => setAddressCity(e.target.value)}
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
                  <label className="mb-1.5 block text-sm font-semibold text-foreground">First Name *</label>
                  <input
                    type="text"
                    className="w-full h-12 rounded-xl border border-border px-4 text-sm bg-background text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-foreground">Last Name *</label>
                  <input
                    type="text"
                    className="w-full h-12 rounded-xl border border-border px-4 text-sm bg-background text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </div>
                
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-foreground">Email Address *</label>
                  <input
                    type="email"
                    className="w-full h-12 rounded-xl border border-border px-4 text-sm bg-background text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="john@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-semibold text-foreground">Phone Number</label>
                  <input
                    type="tel"
                    className="w-full h-12 rounded-xl border border-border px-4 text-sm bg-background text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                    placeholder="+250780000000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-semibold text-foreground">Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="w-full h-12 rounded-xl border border-border px-4 pr-12 text-sm bg-background text-foreground outline-none transition focus:border-primary focus:ring-1 focus:ring-primary"
                      placeholder="Create a secure password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
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
          <div className="mt-8 flex gap-4 pt-4 border-t border-border">
            {currentStep > 1 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(1)}
                className="flex-1 h-12 rounded-xl border-border text-foreground text-sm font-semibold"
              >
                Back
              </Button>
            )}
            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={handleNext}
                className="flex-[2] h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={createMutation.isPending}
                className="flex-[2] h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                  </>
                ) : (
                  "Create Organization"
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
