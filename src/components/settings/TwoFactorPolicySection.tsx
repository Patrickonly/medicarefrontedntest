import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, ShieldCheck, Loader2, Save, KeyRound, Globe, Smartphone, Lock, AlertTriangle,
} from "lucide-react";

type Enforcement = "off" | "totp" | "sso" | "either";
type TrustDuration = 0 | 1 | 7 | 30;

interface PolicyShape {
  enforcement: Enforcement;
  trust_duration_days: TrustDuration;
  require_recovery_codes: boolean;
  applies_to_admins_only: boolean;
}

const DEFAULTS: PolicyShape = {
  enforcement: "totp",
  trust_duration_days: 30,
  require_recovery_codes: true,
  applies_to_admins_only: true,
};

const ENFORCEMENT_OPTIONS: { value: Enforcement; title: string; desc: string; icon: typeof ShieldCheck }[] = [
  { value: "off", title: "Off", desc: "No 2FA required. Not recommended for clinical systems.", icon: AlertTriangle },
  { value: "totp", title: "Require TOTP", desc: "Authenticator apps (Google Authenticator, Authy, 1Password).", icon: Smartphone },
  { value: "sso", title: "Require SSO", desc: "Users must sign in via your SAML/OIDC identity provider.", icon: Globe },
  { value: "either", title: "TOTP or SSO", desc: "Allow either TOTP enrollment or SSO sign-in to satisfy 2FA.", icon: ShieldCheck },
];

const TRUST_OPTIONS: { value: TrustDuration; label: string }[] = [
  { value: 0, label: "Never (always prompt)" },
  { value: 1, label: "1 day" },
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
];

interface Props { onBack: () => void }

export default function TwoFactorPolicySection({ onBack }: Props) {
  const { success, error: toastError } = useToast();
  const { organizationId, userRole } = useAuth();
  const isAdmin = userRole === "org_owner" || userRole === "admin" || userRole === "super_admin" || userRole === "director";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [policy, setPolicy] = useState<PolicyShape>(DEFAULTS);

  useEffect(() => {
    if (!organizationId) return;
    void load();
  }, [organizationId]);

  const load = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: { settings?: { two_factor_policy?: Partial<PolicyShape> } } }>(`/api/organizations?id=${organizationId}`, { organizationId });
      const existing = res.data?.settings?.two_factor_policy;
      setPolicy({ ...DEFAULTS, ...(existing || {}) });
    } catch (loadError: any) {
      toastError("Error", loadError.message || "Failed to load 2FA policy");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!organizationId || !isAdmin) return;
    setSaving(true);
    try {
      const res = await api.get<{ success: boolean; data: { settings?: Record<string, unknown> } }>(`/api/organizations?id=${organizationId}`, { organizationId });
      const existing = (res.data?.settings && typeof res.data.settings === "object" ? res.data.settings : {}) as Record<string, unknown>;
      await api.put(`/api/organizations?id=${organizationId}`, {
        settings: { ...existing, two_factor_policy: policy },
      }, { organizationId });

      success("Success", "2FA policy updated");
      await api.post("/api/audit-logs", {
        action: "org_2fa_policy_updated",
        resource_type: "organization",
        resource_id: organizationId,
        risk_level: "medium",
        details: `enforcement=${policy.enforcement}, trust=${policy.trust_duration_days}d, recovery_required=${policy.require_recovery_codes}, admins_only=${policy.applies_to_admins_only}`,
      }).catch(() => undefined);
    } catch (saveError: any) {
      toastError("Error", saveError.message || "Failed to save 2FA policy");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={20} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> Back to Settings
      </button>

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Lock size={20} className="text-primary" />
        </div>
        <div>
          <h2 className="font-display font-bold text-xl text-foreground">Two-Factor Policy</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Set how members of your organization satisfy 2FA, how long devices stay trusted, and whether recovery codes are mandatory.</p>
        </div>
      </div>

      {!isAdmin && (
        <div className="medicare-card bg-medicare-amber/10 border-medicare-amber/30 flex items-start gap-2.5">
          <AlertTriangle size={16} className="text-medicare-amber mt-0.5" />
          <p className="text-xs text-foreground">You're viewing this in read-only mode. Only org owners, admins, and directors can change the 2FA policy.</p>
        </div>
      )}

      {/* Enforcement */}
      <div className="medicare-card space-y-3">
        <div>
          <h3 className="font-semibold text-foreground text-sm">Enforcement method</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Choose how members prove their second factor.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ENFORCEMENT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = policy.enforcement === opt.value;
            return (
              <button
                key={opt.value}
                disabled={!isAdmin}
                onClick={() => setPolicy((p) => ({ ...p, enforcement: opt.value }))}
                className={`text-left p-3 rounded-lg border-2 transition-colors ${active ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"} disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={14} className={active ? "text-primary" : "text-muted-foreground"} />
                  <span className="text-sm font-medium text-foreground">{opt.title}</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Trust duration */}
      <div className="medicare-card space-y-3">
        <div>
          <h3 className="font-semibold text-foreground text-sm">Trusted device duration</h3>
          <p className="text-xs text-muted-foreground mt-0.5">After a successful 2FA verification, how long can a device skip the next prompt?</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {TRUST_OPTIONS.map((opt) => {
            const active = policy.trust_duration_days === opt.value;
            return (
              <button
                key={opt.value}
                disabled={!isAdmin}
                onClick={() => setPolicy((p) => ({ ...p, trust_duration_days: opt.value }))}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${active ? "bg-primary text-primary-foreground border-primary" : "bg-muted/40 text-muted-foreground border-border hover:text-foreground"} disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recovery codes */}
      <div className="medicare-card space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-1.5"><KeyRound size={14} className="text-primary" /> Require recovery codes</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Block dashboard access until each user has generated and acknowledged their one-time backup codes.</p>
          </div>
          <label className="inline-flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              checked={policy.require_recovery_codes}
              disabled={!isAdmin}
              onChange={(e) => setPolicy((p) => ({ ...p, require_recovery_codes: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-10 h-6 bg-muted peer-checked:bg-primary rounded-full relative transition-colors peer-disabled:opacity-50">
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${policy.require_recovery_codes ? "translate-x-[18px]" : "translate-x-0.5"}`} />
            </div>
          </label>
        </div>
      </div>

      {/* Scope */}
      <div className="medicare-card space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-foreground text-sm">Apply to admins only</h3>
            <p className="text-xs text-muted-foreground mt-0.5">When on, only admin/owner/director roles must satisfy this policy. Turn off to enforce 2FA for every member.</p>
          </div>
          <label className="inline-flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              checked={policy.applies_to_admins_only}
              disabled={!isAdmin}
              onChange={(e) => setPolicy((p) => ({ ...p, applies_to_admins_only: e.target.checked }))}
              className="sr-only peer"
            />
            <div className="w-10 h-6 bg-muted peer-checked:bg-primary rounded-full relative transition-colors peer-disabled:opacity-50">
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${policy.applies_to_admins_only ? "translate-x-[18px]" : "translate-x-0.5"}`} />
            </div>
          </label>
        </div>
      </div>

      {isAdmin && (
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving} className="gap-2">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save policy
          </Button>
        </div>
      )}
    </div>
  );
}
