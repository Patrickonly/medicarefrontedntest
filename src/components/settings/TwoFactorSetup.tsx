import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Shield, ShieldCheck, ShieldAlert, Loader2, Copy, Check, AlertTriangle, X, KeyRound, RefreshCw } from "lucide-react";
import { generateRecoveryCodes, hashCodes } from "@/lib/recoveryCodes";
import RecoveryCodesDisplay from "@/components/auth/RecoveryCodesDisplay";

interface EnrollState {
  factorId: string;
  qr: string;
  secret: string;
  uri: string;
}

export default function TwoFactorSetup() {
  const { success, error: toastError } = useToast();
  const { user, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isEnabled, setIsEnabled] = useState(false);
  const [enrollState, setEnrollState] = useState<EnrollState | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [working, setWorking] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[] | null>(null);
  const [unusedCodeCount, setUnusedCodeCount] = useState(0);

  const isAdminRole = ["org_owner", "admin", "super_admin", "director"].includes(userRole || "");

  useEffect(() => {
    checkStatus();
  }, [user]);

  const logAudit = (action: string, details: string, risk: "low" | "medium" | "high" = "low") => {
    api.post("/api/audit-logs", {
      action,
      resource_type: "user_account",
      resource_id: user?.id,
      risk_level: risk,
      details,
    }).catch(() => undefined);
  };

  const checkStatus = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const statusRes = await api.get<{ success: boolean; data: { enabled: boolean } }>("/api/2fa/status");
      setIsEnabled(!!statusRes.data?.enabled);

      const codesRes = await api.get<{ success: boolean; data: { unused: number } }>("/api/2fa/recovery-codes/stats");
      setUnusedCodeCount(codesRes.data?.unused || 0);
    } catch {
      // Leave defaults (disabled, 0 codes) if status can't be fetched
    } finally {
      setLoading(false);
    }
  };

  const startEnrollment = async () => {
    setWorking(true);
    try {
      const res = await api.post<{ success: boolean; data: { factorId: string; qrCode: string; secret: string; otpauthUrl: string } }>("/api/2fa/enroll", {});
      setEnrollState({
        factorId: res.data.factorId,
        qr: res.data.qrCode,
        secret: res.data.secret,
        uri: res.data.otpauthUrl,
      });
    } catch (enrollError: any) {
      toastError("Error", enrollError.message || "Failed to start 2FA enrollment");
    } finally {
      setWorking(false);
    }
  };

  const verifyEnrollment = async () => {
    if (!enrollState || verifyCode.length !== 6) { toastError("Error", "Enter the 6-digit code"); return; }
    setWorking(true);
    try {
      await api.post("/api/2fa/verify", { factorId: enrollState.factorId, code: verifyCode });

      logAudit("2fa_enabled", "User enabled two-factor authentication (TOTP)");
      await generateAndStoreCodes();

      success("Success", "Two-factor authentication enabled");
      setEnrollState(null);
      setVerifyCode("");
      setIsEnabled(true);
    } catch (verifyError: any) {
      toastError("Error", verifyError.message || "Invalid code. Try again.");
    } finally {
      setWorking(false);
    }
  };

  const generateAndStoreCodes = async () => {
    if (!user) return;
    const codes = generateRecoveryCodes(10);
    const hashes = await hashCodes(codes);
    try {
      await api.post("/api/2fa/recovery-codes", { codeHashes: hashes });
      setGeneratedCodes(codes);
      setUnusedCodeCount(codes.length);
      logAudit("2fa_recovery_codes_generated", `Generated ${codes.length} new recovery codes`);
    } catch (codesError: any) {
      toastError("Error", "Failed to save recovery codes: " + (codesError.message || "unknown error"));
    }
  };

  const regenerateCodes = async () => {
    if (!confirm("Regenerate recovery codes? This invalidates all existing codes.")) return;
    setWorking(true);
    await generateAndStoreCodes();
    setWorking(false);
    success("Success", "Recovery codes regenerated");
  };

  const cancelEnrollment = async () => {
    if (enrollState) {
      await api.post("/api/2fa/unenroll", { factorId: enrollState.factorId }).catch(() => undefined);
    }
    setEnrollState(null);
    setVerifyCode("");
  };

  const disable2FA = async () => {
    if (!confirm("Disable two-factor authentication? This will make your account less secure.")) return;
    setWorking(true);
    try {
      await api.post("/api/2fa/disable", {});
      logAudit("2fa_disabled", "User disabled two-factor authentication", "high");
      setIsEnabled(false);
      setUnusedCodeCount(0);
      success("Success", "Two-factor authentication disabled");
    } catch (disableError: any) {
      toastError("Error", disableError.message || "Failed to disable 2FA");
    } finally {
      setWorking(false);
    }
  };

  const copySecret = () => {
    if (enrollState) {
      navigator.clipboard.writeText(enrollState.secret);
      setSecretCopied(true);
      success("Success", "Secret copied");
      setTimeout(() => setSecretCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="medicare-card flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-primary" />
      </div>
    );
  }

  // Show recovery codes one-time view
  if (generatedCodes) {
    return (
      <div className="medicare-card">
        <RecoveryCodesDisplay
          codes={generatedCodes}
          onAcknowledge={() => setGeneratedCodes(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="medicare-card space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isEnabled ? "bg-medicare-green-light" : "bg-muted"}`}>
              {isEnabled ? <ShieldCheck size={20} className="text-medicare-green" /> : <Shield size={20} className="text-muted-foreground" />}
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">Two-Factor Authentication</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Required at every sign-in. Add a one-time code from an authenticator app.
              </p>
            </div>
          </div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${isEnabled ? "bg-medicare-green-light text-medicare-green" : "bg-muted text-muted-foreground"}`}>
            {isEnabled ? "Enabled" : "Disabled"}
          </span>
        </div>

        {isAdminRole && !isEnabled && !enrollState && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-medicare-amber-light border border-medicare-amber/30">
            <AlertTriangle size={16} className="text-medicare-amber flex-shrink-0 mt-0.5" />
            <p className="text-xs text-foreground">
              <span className="font-semibold">Required for your role.</span> As an administrator, you must enable two-factor authentication.
            </p>
          </div>
        )}

        {!enrollState && !isEnabled && (
          <Button onClick={startEnrollment} disabled={working} className="gap-2">
            {working ? <Loader2 size={16} className="animate-spin" /> : <Shield size={16} />}
            Enable 2FA
          </Button>
        )}

        {!enrollState && isEnabled && (
          <Button onClick={disable2FA} disabled={working} variant="outline" className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive">
            {working ? <Loader2 size={16} className="animate-spin" /> : <ShieldAlert size={16} />}
            Disable 2FA
          </Button>
        )}

        {enrollState && (
          <div className="space-y-4 pt-2 border-t border-border">
            <div>
              <p className="text-sm font-medium text-foreground mb-1">Step 1: Scan QR code</p>
              <p className="text-xs text-muted-foreground mb-3">
                Open Google Authenticator, Authy, 1Password, or any TOTP app and scan this QR code.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="bg-white p-3 rounded-lg border border-border flex-shrink-0 self-start">
                  <img src={enrollState.qr} alt="2FA QR code" className="w-44 h-44" />
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-xs text-muted-foreground">Can't scan? Enter this secret manually:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono bg-muted rounded px-2 py-1.5 break-all">{enrollState.secret}</code>
                    <Button variant="outline" size="sm" onClick={copySecret} className="h-8 px-2 flex-shrink-0">
                      {secretCopied ? <Check size={12} /> : <Copy size={12} />}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-foreground mb-1">Step 2: Enter the 6-digit code</p>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text" inputMode="numeric" maxLength={6}
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456"
                  className="medicare-input font-mono tracking-widest text-center text-lg max-w-[180px]"
                />
                <Button onClick={verifyEnrollment} disabled={working || verifyCode.length !== 6} className="gap-2">
                  {working ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  Verify & Enable
                </Button>
                <Button onClick={cancelEnrollment} variant="ghost" size="icon" className="text-muted-foreground">
                  <X size={16} />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recovery codes management — only when 2FA is on */}
      {isEnabled && !enrollState && (
        <div className="medicare-card space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <KeyRound size={20} className="text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Recovery Codes</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {unusedCodeCount > 0
                    ? `${unusedCodeCount} unused code${unusedCodeCount !== 1 ? "s" : ""} remaining`
                    : "No codes available — generate a set to recover access if you lose your device"}
                </p>
              </div>
            </div>
            <Button onClick={regenerateCodes} disabled={working} variant="outline" size="sm" className="gap-2">
              {working ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              {unusedCodeCount > 0 ? "Regenerate" : "Generate"}
            </Button>
          </div>
          {unusedCodeCount > 0 && unusedCodeCount <= 3 && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-medicare-amber-light border border-medicare-amber/30">
              <AlertTriangle size={14} className="text-medicare-amber flex-shrink-0 mt-0.5" />
              <p className="text-xs text-foreground">Running low on recovery codes. Regenerate before you run out.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
