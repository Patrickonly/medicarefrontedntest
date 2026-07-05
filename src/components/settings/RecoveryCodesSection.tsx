import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  KeyRound,
  Loader2,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  Lock,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateRecoveryCodes, hashCodes } from "@/lib/recoveryCodes";
import RecoveryCodesDisplay from "@/components/auth/RecoveryCodesDisplay";

interface Props {
  onBack: () => void;
}

interface CodeStats {
  total: number;
  unused: number;
  lastGeneratedAt: string | null;
  lastUsedAt: string | null;
}

/**
 * Recovery codes management section.
 *
 * Recovery codes are stored as SHA-256 hashes — we cannot show old codes.
 * The user can however see:
 *   • how many remain unused
 *   • when the current set was generated
 *   • when a code was last used
 *
 * Regenerating a set requires the user to re-enter their password (re-auth)
 * since this is a security-sensitive action. New codes are displayed exactly
 * once and the user must acknowledge having saved them.
 */
export default function RecoveryCodesSection({ onBack }: Props) {
  const { success, error: toastError } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<CodeStats>({ total: 0, unused: 0, lastGeneratedAt: null, lastUsedAt: null });
  const [is2faEnabled, setIs2faEnabled] = useState(false);

  // Re-auth flow
  const [reauthOpen, setReauthOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [reauthError, setReauthError] = useState<string | null>(null);
  const [reauthing, setReauthing] = useState(false);

  // Generated codes one-time view
  const [generatedCodes, setGeneratedCodes] = useState<string[] | null>(null);

  useEffect(() => { void loadStats(); }, [user]);

  const loadStats = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const statusRes = await api.get<{ success: boolean; data: { enabled: boolean } }>("/api/2fa/status");
      setIs2faEnabled(!!statusRes.data?.enabled);

      const statsRes = await api.get<{ success: boolean; data: CodeStats }>("/api/2fa/recovery-codes/stats");
      setStats(statsRes.data || { total: 0, unused: 0, lastGeneratedAt: null, lastUsedAt: null });
    } catch {
      // Leave defaults if stats can't be fetched
    } finally {
      setLoading(false);
    }
  };

  const logAudit = (action: string, details: string, risk: "low" | "medium" = "low") => {
    api.post("/api/audit-logs", {
      action,
      resource_type: "user_account",
      resource_id: user?.id,
      risk_level: risk,
      details,
    }).catch(() => undefined);
  };

  const openReauth = () => {
    setPassword("");
    setReauthError(null);
    setReauthOpen(true);
  };

  const submitReauth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email) return;
    setReauthing(true);
    setReauthError(null);

    try {
      await api.post("/api/auth/verify-password", { password });
    } catch {
      setReauthError("Incorrect password. Please try again.");
      setReauthing(false);
      logAudit("recovery_codes_reauth_failed", "Failed re-auth attempt while regenerating recovery codes", "medium");
      return;
    }

    // Re-auth OK — proceed to regenerate
    await regenerate();
    setReauthing(false);
    setReauthOpen(false);
  };

  const regenerate = async () => {
    if (!user) return;
    try {
      const codes = generateRecoveryCodes(10);
      const hashes = await hashCodes(codes);
      await api.post("/api/2fa/recovery-codes", { codeHashes: hashes });

      logAudit("recovery_codes_regenerated", "Regenerated 10 recovery codes (with password re-auth)");
      setGeneratedCodes(codes);
    } catch (e: any) {
      toastError("Error", e?.message || "Failed to regenerate codes");
    }
  };

  const acknowledgeCodes = async () => {
    setGeneratedCodes(null);
    await loadStats();
    success("Success", "Recovery codes saved");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Back to Settings
        </button>
        <div className="medicare-card flex items-center justify-center py-12">
          <Loader2 size={20} className="animate-spin text-primary" />
        </div>
      </div>
    );
  }

  // Codes display takes over while shown
  if (generatedCodes) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="font-display font-bold text-xl text-foreground">New Recovery Codes</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Save these now — we won't show them again.</p>
        </div>
        <RecoveryCodesDisplay
          codes={generatedCodes}
          onAcknowledge={acknowledgeCodes}
          title="Your new recovery codes"
          subtitle="All previous codes are now invalid. Each new code can be used once."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> Back to Settings
      </button>

      <div>
        <h2 className="font-display font-bold text-xl text-foreground">Recovery Codes</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          One-time codes that let you sign in if you lose access to your authenticator.
        </p>
      </div>

      {!is2faEnabled && (
        <div className="medicare-card flex items-start gap-3 border-medicare-amber/30 bg-medicare-amber-light/40">
          <AlertTriangle size={18} className="text-medicare-amber flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground text-sm">Two-factor authentication is not enabled</p>
            <p className="text-xs text-muted-foreground mt-1">
              Recovery codes only work alongside 2FA. Enable 2FA in your Profile first.
            </p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="medicare-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <KeyRound size={14} /> Codes remaining
          </div>
          <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">{stats.unused}<span className="text-sm font-normal text-muted-foreground"> / {stats.total || 10}</span></p>
          {stats.unused > 0 && stats.unused <= 3 && (
            <p className="text-xs text-medicare-amber font-medium mt-1">Running low — regenerate soon</p>
          )}
          {stats.unused === 0 && stats.total > 0 && (
            <p className="text-xs text-destructive font-medium mt-1">All codes used</p>
          )}
        </div>
        <div className="medicare-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock size={14} /> Generated
          </div>
          <p className="text-sm font-semibold text-foreground mt-1">
            {stats.lastGeneratedAt ? new Date(stats.lastGeneratedAt).toLocaleString() : "Never"}
          </p>
        </div>
        <div className="medicare-card">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CheckCircle2 size={14} /> Last used
          </div>
          <p className="text-sm font-semibold text-foreground mt-1">
            {stats.lastUsedAt ? new Date(stats.lastUsedAt).toLocaleString() : "Never used"}
          </p>
        </div>
      </div>

      {/* Why can't I view old codes? */}
      <div className="medicare-card space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck size={20} className="text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground text-sm">Missed the one-time display?</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              For security, recovery codes are stored as cryptographic hashes — even we can't recover the original codes.
              If you missed saving them, regenerate a fresh set below. This invalidates the old set and shows the new
              codes once. You'll need your account password to confirm.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-border">
          <Button
            onClick={openReauth}
            disabled={!is2faEnabled}
            className="gap-2"
          >
            <RefreshCw size={14} />
            {stats.total > 0 ? "Regenerate codes" : "Generate codes"}
          </Button>
          <p className="text-xs text-muted-foreground self-center">Requires password re-authentication.</p>
        </div>
      </div>

      {/* Re-auth modal — kept inline rather than a Dialog for the form focus flow */}
      {reauthOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={(e) => { if (e.target === e.currentTarget && !reauthing) setReauthOpen(false); }}
        >
          <form
            onSubmit={submitReauth}
            className="w-full max-w-md bg-card rounded-xl border border-border shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Lock size={20} className="text-primary" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-foreground">Confirm your password</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Re-enter your password to regenerate recovery codes.</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Account email</label>
              <input className="medicare-input bg-muted" value={user?.email || ""} disabled readOnly />
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Password</label>
              <input
                type="password"
                className="medicare-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoFocus
                required
              />
              {reauthError && (
                <p className="text-xs text-destructive mt-1.5 flex items-center gap-1">
                  <AlertTriangle size={12} /> {reauthError}
                </p>
              )}
            </div>

            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-medicare-amber/10 border border-medicare-amber/30">
              <AlertTriangle size={14} className="text-medicare-amber flex-shrink-0 mt-0.5" />
              <p className="text-xs text-foreground">
                Regenerating invalidates all {stats.unused > 0 ? `${stats.unused} unused ` : ""}existing codes. You'll see the new codes once.
              </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setReauthOpen(false)} disabled={reauthing}>
                Cancel
              </Button>
              <Button type="submit" disabled={reauthing || password.length < 1} className="gap-2">
                {reauthing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Confirm & Regenerate
              </Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
