import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  Building2, Stethoscope, UserRound, Loader2, Plus, LogIn,
  ShieldCheck, Briefcase, Pill, FlaskConical, HeartPulse,
} from "lucide-react";

type OnboardingStep = "choice" | "create_org" | "join_org" | "select_role" | "patient_setup";

const STAFF_ROLES = [
  { value: "admin", label: "Administrator", icon: ShieldCheck, desc: "Full system management" },
  { value: "doctor", label: "Doctor / Specialist", icon: Stethoscope, desc: "Clinical consultations & EMR" },
  { value: "nurse", label: "Nurse", icon: HeartPulse, desc: "Patient care & vitals" },
  { value: "receptionist", label: "Receptionist", icon: Briefcase, desc: "Front desk & scheduling" },
  { value: "pharmacist", label: "Pharmacist", icon: Pill, desc: "Pharmacy & dispensing" },
  { value: "lab_technician", label: "Lab Technician", icon: FlaskConical, desc: "Laboratory operations" },
  { value: "cashier", label: "Cashier", icon: Briefcase, desc: "Billing & payments" },
  { value: "hr_manager", label: "HR Manager", icon: Briefcase, desc: "Staff & payroll" },
] as const;

const FACILITY_TYPES = [
  { value: "hospital", label: "Hospital" },
  { value: "clinic", label: "Clinic" },
  { value: "pharmacy", label: "Pharmacy" },
  { value: "medical_center", label: "Medical Center" },
  { value: "diagnostic_center", label: "Diagnostic Center" },
  { value: "specialist_center", label: "Specialist Center" },
];

const ROLE_ROUTES: Record<string, string> = {
  patient: "/patient",
  doctor: "/doctor",
  nurse: "/doctor",
  default: "/dashboard",
};

export default function OnboardingPage() {
  const { success, error } = useToast();
  const navigate = useNavigate();
  const { user, refreshRole } = useAuth();
  const [step, setStep] = useState<OnboardingStep>("choice");
  const [loading, setLoading] = useState(false);

  // Create org state
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("hospital");
  const [orgCity, setOrgCity] = useState("");
  const [orgPhone, setOrgPhone] = useState("");

  // Join org state
  const [orgCode, setOrgCode] = useState("");
  const [selectedRole, setSelectedRole] = useState("");
  const [foundOrg, setFoundOrg] = useState<{ id: string; name: string } | null>(null);

  const generateCode = (name: string) =>
    name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 4) + Math.floor(1000 + Math.random() * 9000);

  const handleCreateOrg = async () => {
    if (!orgName.trim()) { error("Error", "Organization name is required"); return; }
    if (!user) return;
    setLoading(true);
    try {
      const code = generateCode(orgName);
      
      const orgRes = await api.post<{ data: { id: string } }>("/api/organizations", {
        name: orgName,
        code,
        type: orgType,
        address_city: orgCity || null,
        phone: orgPhone || null
      });
      const orgId = orgRes.data?.id || (orgRes as any).id;
      
      await api.post("/api/user_roles", {
        user_id: user.id,
        role: "org_owner",
        organization_id: orgId,
        is_active: true
      });

      await refreshRole();
      success("Success", `Organization "${orgName}" created! You are the owner.`);
      navigate("/dashboard");
    } catch (err: any) {
      error("Error", err.message || "Failed to create organization");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchOrg = async () => {
    if (!orgCode.trim()) { error("Error", "Enter an organization code"); return; }
    setLoading(true);
    try {
      const res = await api.get<{ data: { id: string; name: string } }>(
        `/api/organizations?code=${orgCode.trim().toUpperCase()}&is_active=true`
      );
      setLoading(false);
      const data = res.data;
      if (!data) throw new Error("Not found");
      setFoundOrg(data as any);
      setStep("select_role");
    } catch (err) {
      setLoading(false);
      error("Error", "Organization not found. Check the code and try again.");
      setFoundOrg(null);
    }
  };

  const handleJoinOrg = async () => {
    if (!selectedRole || !foundOrg || !user) return;
    setLoading(true);
    try {
      await api.post("/api/user_roles", {
        user_id: user.id,
        role: selectedRole,
        organization_id: foundOrg.id,
        is_active: true
      });
      await refreshRole();
      success(`Joined "${foundOrg.name}" as ${selectedRole.replace("_", " ")}`);
      navigate(ROLE_ROUTES[selectedRole] || ROLE_ROUTES.default);
    } catch (err: any) {
      error("Error", err.message || "Failed to join organization");
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSetup = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Assign patient role with no org - patients are cross-org
      await api.post("/api/user_roles", {
        user_id: user.id,
        role: "patient",
        is_active: true
      });
      await refreshRole();
      success("Success", "Patient account set up!");
      navigate("/patient");
    } catch (err: any) {
      error("Error", err.message || "Failed to set up patient account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--gradient-hero)" }}>
      <div className="w-full max-w-xl">
        <div className="bg-card rounded-2xl border border-border p-8 shadow-lg">
          {/* Header */}
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-display font-bold text-lg">M</span>
            </div>
            <div>
              <span className="font-display font-bold text-lg text-foreground">MEDICARE</span>
              <span className="font-display font-bold text-lg medicare-gradient-text ml-1">ONE</span>
            </div>
          </div>

          {/* ─── Step: Choice ─── */}
          {step === "choice" && (
            <>
              <h1 className="font-display font-bold text-2xl text-foreground">Welcome! Let's get you started</h1>
              <p className="text-sm text-muted-foreground mt-1 mb-8">How would you like to use Medicare One?</p>
              <div className="grid gap-4">
                <button
                  onClick={() => setStep("create_org")}
                  className="flex items-center gap-4 p-5 rounded-xl border border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Plus size={24} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Create an Organization</p>
                    <p className="text-sm text-muted-foreground">Register a hospital, clinic, or pharmacy</p>
                  </div>
                </button>
                <button
                  onClick={() => setStep("join_org")}
                  className="flex items-center gap-4 p-5 rounded-xl border border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <LogIn size={24} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Join an Organization</p>
                    <p className="text-sm text-muted-foreground">Enter a code to join as staff member</p>
                  </div>
                </button>
                <button
                  onClick={() => setStep("patient_setup")}
                  className="flex items-center gap-4 p-5 rounded-xl border border-border bg-background hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <UserRound size={24} />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">I'm a Patient</p>
                    <p className="text-sm text-muted-foreground">Access patient portal, book appointments</p>
                  </div>
                </button>
              </div>
            </>
          )}

          {/* ─── Step: Create Organization ─── */}
          {step === "create_org" && (
            <>
              <button onClick={() => setStep("choice")} className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block">← Back</button>
              <h1 className="font-display font-bold text-2xl text-foreground">Create your organization</h1>
              <p className="text-sm text-muted-foreground mt-1 mb-6">Set up your hospital, clinic, or pharmacy workspace</p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Organization Name *</label>
                  <input className="medicare-input" placeholder="City General Hospital" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Facility Type</label>
                  <select className="medicare-input" value={orgType} onChange={(e) => setOrgType(e.target.value)}>
                    {FACILITY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">City</label>
                    <input className="medicare-input" placeholder="Dar es Salaam" value={orgCity} onChange={(e) => setOrgCity(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Phone</label>
                    <input className="medicare-input" placeholder="+255 ..." value={orgPhone} onChange={(e) => setOrgPhone(e.target.value)} />
                  </div>
                </div>
                <Button onClick={handleCreateOrg} disabled={loading} className="w-full h-11 font-semibold mt-2">
                  {loading ? <Loader2 size={18} className="animate-spin mr-2" /> : <Building2 size={18} className="mr-2" />}
                  Create Organization
                </Button>
              </div>
            </>
          )}

          {/* ─── Step: Join Organization ─── */}
          {step === "join_org" && (
            <>
              <button onClick={() => setStep("choice")} className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block">← Back</button>
              <h1 className="font-display font-bold text-2xl text-foreground">Join an organization</h1>
              <p className="text-sm text-muted-foreground mt-1 mb-6">Enter the organization code provided by your administrator</p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Organization Code *</label>
                  <input
                    className="medicare-input font-mono text-lg tracking-wider uppercase"
                    placeholder="HOSP1234"
                    value={orgCode}
                    onChange={(e) => setOrgCode(e.target.value.toUpperCase())}
                  />
                </div>
                <Button onClick={handleSearchOrg} disabled={loading} className="w-full h-11 font-semibold">
                  {loading ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
                  Find Organization
                </Button>
              </div>
            </>
          )}

          {/* ─── Step: Select Role ─── */}
          {step === "select_role" && foundOrg && (
            <>
              <button onClick={() => setStep("join_org")} className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block">← Back</button>
              <h1 className="font-display font-bold text-2xl text-foreground">Join {foundOrg.name}</h1>
              <p className="text-sm text-muted-foreground mt-1 mb-6">Select your role at this organization</p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {STAFF_ROLES.map(({ value, label, icon: Icon, desc }) => (
                  <button
                    key={value}
                    onClick={() => setSelectedRole(value)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      selectedRole === value
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border bg-background hover:border-primary/30"
                    }`}
                  >
                    <Icon size={20} className={selectedRole === value ? "text-primary" : "text-muted-foreground"} />
                    <p className="font-medium text-foreground text-sm mt-2">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </button>
                ))}
              </div>
              <Button onClick={handleJoinOrg} disabled={loading || !selectedRole} className="w-full h-11 font-semibold">
                {loading ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
                Join as {selectedRole ? STAFF_ROLES.find((r) => r.value === selectedRole)?.label : "..."}
              </Button>
            </>
          )}

          {/* ─── Step: Patient Setup ─── */}
          {step === "patient_setup" && (
            <>
              <button onClick={() => setStep("choice")} className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block">← Back</button>
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <UserRound size={32} className="text-primary" />
                </div>
                <h1 className="font-display font-bold text-2xl text-foreground">Set up your patient account</h1>
                <p className="text-sm text-muted-foreground mt-2 mb-8 max-w-sm mx-auto">
                  Access your health records, book appointments, track services, and communicate with your care team.
                </p>
                <Button onClick={handlePatientSetup} disabled={loading} className="h-11 px-8 font-semibold">
                  {loading ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
                  Activate Patient Portal
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


