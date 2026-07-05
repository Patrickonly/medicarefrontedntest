import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Link, useNavigate } from "react-router-dom";
import {
  LifeBuoy,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Mail,
  ShieldCheck,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SupportRequest {
  id: string;
  created_at: string;
  action: string;
  details: string | null;
  risk_level: string | null;
}

/**
 * Status page for users who submitted an admin-assisted 2FA unlock request
 * from the TwoFactorGate. Reads the audit_logs table (RLS allows users to
 * view their org's logs) and surfaces the most recent request + outcome.
 *
 * Lifecycle (action values written to audit_logs):
 *   2fa_support_requested    → submitted by user
 *   2fa_support_acknowledged → admin saw it
 *   2fa_force_reenroll       → admin reset 2FA (resolution)
 *   2fa_support_denied       → admin denied request
 */
export default function TwoFactorUnlockPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<SupportRequest[]>([]);
  const [resolutions, setResolutions] = useState<SupportRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { void load(); }, [user]);

  const load = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // The user's own support requests
      const reqsRes = await api.get<{ data: SupportRequest[] }>(
        `/api/audit_logs?user_id=${user.id}&action=2fa_support_requested&limit=5`
      );

      // Admin actions that resolve the user's account (force reenroll, ack, deny)
      const resRes = await api.get<{ data: SupportRequest[] }>(
        `/api/audit_logs?resource_id=${user.id}&action=2fa_support_acknowledged,2fa_force_reenroll,2fa_support_denied&limit=5`
      );

      setRequests((reqsRes.data || []) as SupportRequest[]);
      setResolutions((resRes.data || []) as SupportRequest[]);
    } catch (error) {
      console.error("Failed to load audit logs", error);
    }
    
    setLoading(false);
  };

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  // Determine top-level state for the user
  const latestRequest = requests[0];
  const latestResolution = resolutions[0];
  const requestIsLatest = latestRequest && (!latestResolution || new Date(latestRequest.created_at) > new Date(latestResolution.created_at));

  const state: "no_request" | "pending" | "acknowledged" | "resolved" | "denied" = (() => {
    if (!latestRequest) return "no_request";
    if (requestIsLatest) return "pending";
    if (latestResolution?.action === "2fa_force_reenroll") return "resolved";
    if (latestResolution?.action === "2fa_support_denied") return "denied";
    return "acknowledged";
  })();

  const hoursWaiting = latestRequest ? Math.floor((Date.now() - new Date(latestRequest.created_at).getTime()) / 3_600_000) : 0;

  const stateMeta = (() => {
    switch (state) {
      case "pending":
        return {
          icon: Clock,
          color: "text-medicare-amber",
          bg: "bg-medicare-amber/10 border-medicare-amber/30",
          label: "Awaiting administrator review",
          desc: hoursWaiting < 1
            ? "Your request was just submitted. Administrators are usually notified by email and respond within 1 business day."
            : `Submitted ${hoursWaiting} hour${hoursWaiting !== 1 ? "s" : ""} ago. If urgent, contact your administrator directly.`,
        };
      case "acknowledged":
        return {
          icon: CheckCircle2,
          color: "text-primary",
          bg: "bg-primary/10 border-primary/30",
          label: "Administrator is reviewing",
          desc: "An administrator has acknowledged your request and is verifying your identity. You'll see another update here shortly.",
        };
      case "resolved":
        return {
          icon: ShieldCheck,
          color: "text-medicare-green",
          bg: "bg-medicare-green/10 border-medicare-green/30",
          label: "Account unlocked — sign in again",
          desc: "An administrator has reset your 2FA. Please sign out and sign back in to enroll a new authenticator.",
        };
      case "denied":
        return {
          icon: XCircle,
          color: "text-destructive",
          bg: "bg-destructive/10 border-destructive/30",
          label: "Request denied",
          desc: "Your administrator could not verify the request. You may submit a new request from the 2FA gate with additional details, or contact your administrator directly.",
        };
      default:
        return {
          icon: LifeBuoy,
          color: "text-muted-foreground",
          bg: "bg-muted/40 border-border",
          label: "No active request",
          desc: "You haven't submitted a recovery request. Use the help link on the 2FA gate if you need admin assistance.",
        };
    }
  })();
  const StateIcon = stateMeta.icon;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Build a unified, sorted timeline of request + resolution events
  const timeline = [...requests, ...resolutions]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 10);

  const eventMeta = (action: string) => {
    switch (action) {
      case "2fa_support_requested":
        return { label: "You submitted a recovery request", color: "bg-medicare-amber/15 text-medicare-amber" };
      case "2fa_support_acknowledged":
        return { label: "Administrator acknowledged your request", color: "bg-primary/15 text-primary" };
      case "2fa_force_reenroll":
        return { label: "Administrator reset your 2FA", color: "bg-medicare-green/15 text-medicare-green" };
      case "2fa_support_denied":
        return { label: "Administrator denied your request", color: "bg-destructive/15 text-destructive" };
      default:
        return { label: action, color: "bg-muted text-muted-foreground" };
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-8" style={{ background: "var(--gradient-hero)" }}>
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft size={16} /> Back
          </button>
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing} className="gap-1.5">
            {refreshing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Refresh
          </Button>
        </div>

        <div className="bg-card rounded-2xl border border-border shadow-xl overflow-hidden">
          <div className="p-6 sm:p-8 border-b border-border bg-gradient-to-br from-primary/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <LifeBuoy size={24} className="text-primary" />
              </div>
              <div>
                <h1 className="font-display font-bold text-xl text-foreground">Admin-Assisted 2FA Recovery</h1>
                <p className="text-xs text-muted-foreground mt-0.5">Track the status of your unlock request</p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Current status */}
            <div className={`rounded-xl border p-4 ${stateMeta.bg}`}>
              <div className="flex items-start gap-3">
                <StateIcon size={20} className={`${stateMeta.color} flex-shrink-0 mt-0.5`} />
                <div className="flex-1">
                  <p className="font-semibold text-foreground text-sm">{stateMeta.label}</p>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{stateMeta.desc}</p>
                </div>
              </div>
            </div>

            {/* Next steps */}
            <div>
              <h3 className="font-semibold text-foreground text-sm mb-2">What happens next</h3>
              <ol className="space-y-2 text-sm">
                {[
                  { done: state !== "no_request", label: "You submit a recovery request" },
                  { done: ["acknowledged", "resolved", "denied"].includes(state), label: "An administrator reviews and verifies your identity" },
                  { done: state === "resolved", label: "Administrator resets your 2FA factor" },
                  { done: false, label: "Sign in again and enroll a new authenticator app" },
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <div
                      className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold ${
                        step.done
                          ? "bg-medicare-green text-white"
                          : "bg-muted text-muted-foreground border border-border"
                      }`}
                    >
                      {step.done ? "✓" : i + 1}
                    </div>
                    <span className={step.done ? "text-foreground" : "text-muted-foreground"}>{step.label}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Account snapshot */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground p-2.5 rounded-lg bg-muted/40 border border-border">
              <Mail size={14} className="text-muted-foreground flex-shrink-0" />
              <span>Account: <span className="font-medium text-foreground">{user?.email}</span></span>
            </div>

            {/* Timeline */}
            <div>
              <h3 className="font-semibold text-foreground text-sm mb-3">Activity timeline</h3>
              {timeline.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">No activity yet.</p>
              ) : (
                <ol className="relative border-s border-border ml-2 space-y-4">
                  {timeline.map((e) => {
                    const meta = eventMeta(e.action);
                    return (
                      <li key={e.id} className="ms-4">
                        <div className="absolute -start-1.5 mt-1.5 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <span className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${meta.color}`}>
                              {e.action.replace(/_/g, " ")}
                            </span>
                            <p className="text-sm font-medium text-foreground mt-1">{meta.label}</p>
                            {e.details && (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{e.details}</p>
                            )}
                          </div>
                          <time className="text-[11px] text-muted-foreground tabular-nums whitespace-nowrap">
                            {new Date(e.created_at).toLocaleString()}
                          </time>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-border flex flex-col sm:flex-row gap-2 justify-between">
              {state === "resolved" ? (
                <Button onClick={signOut} className="gap-2">
                  <LogOut size={14} /> Sign out & enroll new authenticator
                </Button>
              ) : (
                <Link to="/dashboard" className="text-xs text-primary hover:underline self-center">
                  Return to 2FA gate
                </Link>
              )}
              <button onClick={signOut} className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 self-center">
                <LogOut size={12} /> Sign out
              </button>
            </div>
          </div>
        </div>

        {/* Help footer */}
        <div className="text-center text-xs text-muted-foreground">
          Need urgent help? Contact your organization administrator directly.
        </div>
      </div>
    </div>
  );
}
