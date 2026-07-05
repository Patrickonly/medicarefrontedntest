import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import {
  ArrowLeft, ShieldCheck, ShieldAlert, Loader2, Search, AlertTriangle,
  Users, Mail, Play, Clock, RotateCcw, Activity, FileText, X,
  ChevronLeft, ChevronRight, Check,
} from "lucide-react";
import { ROLE_LABELS } from "@/types/rbac";
import { useToast } from "@/hooks/use-toast";

interface SecurityProps {
  onBack: () => void;
}

interface MemberSecurity {
  user_id: string;
  role: string;
  first_name: string;
  last_name: string;
  is_2fa_enabled: boolean;
  last_verified_at: string | null;
  is_admin_role: boolean;
  last_reminded_at: string | null;
}

interface ReminderActivity {
  id: string;
  sent_at: string;
  reason: string;
  recipient_user_id: string;
  recipient_name: string;
  sender_name: string;
}

interface AuditEntry {
  id: string;
  action: string;
  details: string | null;
  user_name: string | null;
  resource_type: string | null;
  resource_id: string | null;
  risk_level: string | null;
  created_at: string;
}

const ADMIN_ROLES = ["org_owner", "admin", "super_admin", "director"];
const REMINDERS_PAGE_SIZE = 10;

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function SecurityOverviewSection({ onBack }: SecurityProps) {
  const { success, error } = useToast();
  const { organizationId, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MemberSecurity[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "enabled" | "disabled" | "admins_noncompliant">("all");
  const [runningJob, setRunningJob] = useState(false);
  const [nudging, setNudging] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState<MemberSecurity | null>(null);
  const [confirmName, setConfirmName] = useState("");

  // Reminders pagination
  const [activity, setActivity] = useState<ReminderActivity[]>([]);
  const [reminderPage, setReminderPage] = useState(0); // 0-indexed
  const [reminderTotal, setReminderTotal] = useState(0);
  const [showAllReminders, setShowAllReminders] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);

  // Audit detail lookup
  const [auditModal, setAuditModal] = useState<{ loading: boolean; entry: AuditEntry | null; context: string } | null>(null);

  const isOwnerOrAdmin = ADMIN_ROLES.includes(userRole || "");

  useEffect(() => {
    if (organizationId) {
      void loadMembers();
    }
  }, [organizationId]);

  useEffect(() => {
    if (organizationId) {
      void loadActivity();
    }
  }, [organizationId, reminderPage, showAllReminders]);

  const loadMembers = async () => {
    if (!organizationId) return;
    setLoading(true);

    try {
      const res = await api.get<{ data: MemberSecurity[] }>("/api/security/members");
      setMembers(res.data || []);
    } catch (err) {
      console.error(err);
      setMembers([]);
    }

    setLoading(false);
  };

  const loadActivity = async () => {
    if (!organizationId) return;
    setActivityLoading(true);

    const from = showAllReminders ? reminderPage * REMINDERS_PAGE_SIZE : 0;
    const to = showAllReminders ? from + REMINDERS_PAGE_SIZE - 1 : REMINDERS_PAGE_SIZE - 1;

    try {
      const res = await api.get<{ data: ReminderActivity[], count: number }>(
        `/api/security/reminders?from=${from}&to=${to}`
      );
      setActivity(res.data || []);
      setReminderTotal(res.count || 0);
    } catch (err) {
      console.error(err);
      setActivity([]);
      setReminderTotal(0);
    }
    setActivityLoading(false);
  };

  const filtered = members.filter((m) => {
    if (search) {
      const q = search.toLowerCase();
      const name = `${m.first_name} ${m.last_name}`.toLowerCase();
      if (!name.includes(q) && !m.role.toLowerCase().includes(q)) return false;
    }
    if (filter === "enabled") return m.is_2fa_enabled;
    if (filter === "disabled") return !m.is_2fa_enabled;
    if (filter === "admins_noncompliant") return m.is_admin_role && !m.is_2fa_enabled;
    return true;
  });

  const stats = {
    total: members.length,
    enabled: members.filter((m) => m.is_2fa_enabled).length,
    admins: members.filter((m) => m.is_admin_role).length,
    nonCompliantAdmins: members.filter((m) => m.is_admin_role && !m.is_2fa_enabled).length,
  };

  const compliancePct = stats.total > 0 ? Math.round((stats.enabled / stats.total) * 100) : 0;

  const handleNudge = async (member: MemberSecurity) => {
    setNudging(member.user_id);
    try {
      const res = await api.post<{ data: any }>("/api/security/reminders/nudge", {
        recipient_user_id: member.user_id,
      });
      if (res.data?.email_sent) {
        success("Success", `Reminder emailed to ${member.first_name} ${member.last_name}`);
      } else {
        success(`Reminder logged for ${member.first_name}`, {
          description: res.data?.email_error
            ? "Email delivery isn't configured yet - set up an email domain to send actual emails."
            : "Reminder recorded in audit log.",
        });
      }
    } catch (err: any) {
      error("Error", `Failed to send reminder: ${err.message}`);
    }
    setNudging(null);
    void loadMembers();
    void loadActivity();
  };

  const runReminderJobNow = async () => {
    setRunningJob(true);
    try {
      const res = await api.post<{ data: any }>("/api/security/reminders/auto", {});
      const data = res.data;
      success("Reminder job ran", {
        description: `Checked ${data?.checked ?? 0} admin(s), reminded ${data?.reminded ?? 0}, skipped ${data?.skipped ?? 0}.`,
      });
    } catch (err: any) {
      error("Error", `Job failed: ${err.message}`);
    }
    setRunningJob(false);
    void loadMembers();
    void loadActivity();
  };

  const expectedConfirmName = confirmReset
    ? `${confirmReset.first_name} ${confirmReset.last_name}`.trim()
    : "";
  const nameMatches =
    !!expectedConfirmName && confirmName.trim().toLowerCase() === expectedConfirmName.toLowerCase();

  // Client-side guards (UI). Server re-validates everything.
  const canReset = (m: MemberSecurity) => {
    if (!m.is_2fa_enabled) return { ok: false, reason: "User is not enrolled in 2FA — nothing to reset." };
    // Members are loaded from current org only, but double-check just in case
    return { ok: true as const };
  };

  const handleForceReset = async (member: MemberSecurity) => {
    const guard = canReset(member);
    if (!guard.ok) {
      error("Error", guard.reason);
      return;
    }

    setConfirmReset(null);
    setConfirmName("");
    setResetting(member.user_id);

    const fullName = `${member.first_name} ${member.last_name}`.trim();
    const toastId = toast.loading(`Starting 2FA reset for ${fullName}…`, {
      description: "Authenticating request",
    });

    try {
      const res = await api.post<{ data: any }>("/api/security/force-2fa-reenroll", {
        target_user_id: member.user_id, confirmed_name: fullName
      });
      const data = res.data;

      // Animate granular stages from the server response
      const stages = (data?.stages || []) as Array<{ key: string; label: string; count: number; ok: boolean }>;
      for (let i = 0; i < stages.length; i++) {
        const s = stages[i];
        toast.loading(`${s.label}?`, {
          id: toastId,
          description: s.count > 0 ? `${s.count} item${s.count !== 1 ? "s" : ""}` : "Nothing to revoke",
        });
        // Brief delay so the user can read each stage
        await new Promise((r) => setTimeout(r, 350));
      }

      success(`2FA reset for ${fullName}`, {
        id: toastId,
        description: `${data?.revoked_factors ?? 0} factor(s) · ${data?.revoked_recovery_codes ?? 0} recovery code(s) · ${data?.revoked_trusted_devices ?? 0} device(s)`,
        action: data?.audit_log_id
          ? {
              label: "View audit",
              onClick: () => void openAuditByResource(member.user_id, "2fa_force_reenroll", `Force re-enroll for ${fullName}`),
            }
          : undefined,
      });

    } catch (err: any) {
      error(`Failed: ${err.message}`, { id: toastId });
    }

    setResetting(null);
    void loadMembers();
  };

  /**
   * Look up the most recent audit log entry matching `action` for the given
   * resource (user_id) within this org. Accepts an array since manual nudges
   * and cron writes use different action names.
   */
  const openAuditByResource = async (
    resourceId: string,
    action: string | string[],
    context: string,
  ) => {
    if (!organizationId) return;
    setAuditModal({ loading: true, entry: null, context });
    const actions = Array.isArray(action) ? action.join(",") : action;
    try {
      const res = await api.get<{ data: AuditEntry[] }>(
        `/api/audit_logs?resource_id=${resourceId}&action=${actions}&limit=1`
      );
      setAuditModal({ loading: false, entry: res.data?.[0] || null, context });
    } catch (err) {
      console.error(err);
      setAuditModal({ loading: false, entry: null, context });
    }
  };

  const totalReminderPages = Math.max(1, Math.ceil(reminderTotal / REMINDERS_PAGE_SIZE));

  if (!isOwnerOrAdmin) {
    return (
      <div className="space-y-6">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={16} /> Back to Settings
        </button>
        <div className="medicare-card text-center py-12">
          <ShieldAlert size={40} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="font-medium text-foreground">Admin access required</p>
          <p className="text-sm text-muted-foreground mt-1">Only org owners and admins can view security overview.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft size={16} /> Back to Settings
      </button>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display font-bold text-xl text-foreground">Security Overview</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Track 2FA adoption and chase compliance across your organization</p>
        </div>
        <button
          onClick={runReminderJobNow}
          disabled={runningJob}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          title="Manually trigger the weekly reminder cron — useful for testing without waiting for Monday 09:00 UTC"
        >
          {runningJob ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
          {runningJob ? "Running..." : "Run reminder job now"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="medicare-card">
          <p className="text-xs text-muted-foreground font-medium">Compliance</p>
          <p className="text-2xl font-display font-bold text-foreground mt-1">{compliancePct}%</p>
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-medicare-green transition-all" style={{ width: `${compliancePct}%` }} />
          </div>
        </div>
        <div className="medicare-card">
          <p className="text-xs text-muted-foreground font-medium">2FA Enabled</p>
          <p className="text-2xl font-display font-bold text-medicare-green mt-1">{stats.enabled}<span className="text-sm text-muted-foreground font-normal"> / {stats.total}</span></p>
        </div>
        <div className="medicare-card">
          <p className="text-xs text-muted-foreground font-medium">Admin Accounts</p>
          <p className="text-2xl font-display font-bold text-foreground mt-1">{stats.admins}</p>
        </div>
        <div className={`medicare-card ${stats.nonCompliantAdmins > 0 ? "bg-medicare-amber-light border-medicare-amber/30" : ""}`}>
          <p className="text-xs text-muted-foreground font-medium">Non-Compliant Admins</p>
          <p className={`text-2xl font-display font-bold mt-1 ${stats.nonCompliantAdmins > 0 ? "text-medicare-amber" : "text-medicare-green"}`}>{stats.nonCompliantAdmins}</p>
        </div>
      </div>

      {stats.nonCompliantAdmins > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-medicare-amber-light border border-medicare-amber/30">
          <AlertTriangle size={16} className="text-medicare-amber flex-shrink-0 mt-0.5" />
          <p className="text-xs text-foreground">
            <span className="font-semibold">{stats.nonCompliantAdmins} administrator{stats.nonCompliantAdmins !== 1 ? "s" : ""} ha{stats.nonCompliantAdmins !== 1 ? "ve" : "s"} not enrolled in 2FA.</span> Admins are required to enable 2FA before accessing the dashboard.
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="medicare-input pl-9"
          />
        </div>
        <div className="flex gap-1.5 bg-muted rounded-lg p-1">
          {([
            { id: "all", label: "All" },
            { id: "enabled", label: "Enabled" },
            { id: "disabled", label: "Disabled" },
            { id: "admins_noncompliant", label: "Admin Risk" },
          ] as const).map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                filter === f.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Member List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="medicare-card text-center py-12 text-muted-foreground">
          <Users size={36} className="mx-auto mb-3 opacity-40" />
          <p className="font-medium">No members match your filter</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((m) => {
            const guard = canReset(m);
            const isResetDisabled = !guard.ok || resetting === m.user_id;
            return (
              <div key={m.user_id} className="medicare-card flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${m.is_2fa_enabled ? "bg-medicare-green-light text-medicare-green" : "bg-muted text-muted-foreground"}`}>
                  {(m.first_name?.[0] || "?").toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground text-sm truncate">{m.first_name} {m.last_name}</p>
                    {m.is_admin_role && (
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary">Admin</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{(ROLE_LABELS as Record<string, string>)[m.role] || m.role}</p>
                </div>

                <div className="text-right hidden sm:block">
                  {m.is_2fa_enabled ? (
                    <>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-medicare-green">
                        <ShieldCheck size={12} /> 2FA Enabled
                      </span>
                      {m.last_verified_at && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Verified {new Date(m.last_verified_at).toLocaleDateString()}
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium ${m.is_admin_role ? "text-medicare-amber" : "text-muted-foreground"}`}>
                        <ShieldAlert size={12} /> 2FA Disabled
                      </span>
                      {m.last_reminded_at ? (
                        <button
                          onClick={() => void openAuditByResource(m.user_id, ["2fa_reminder_sent", "2fa_reminder_auto_sent"], `Last reminder for ${m.first_name} ${m.last_name}`)}
                          className="text-[11px] text-muted-foreground mt-0.5 inline-flex items-center gap-1 justify-end hover:text-primary transition-colors"
                          title="View audit log entry for the most recent reminder"
                        >
                          <Clock size={10} /> Reminded {relativeTime(m.last_reminded_at)}
                        </button>
                      ) : (
                        <p className="text-[11px] text-muted-foreground/60 mt-0.5">Never reminded</p>
                      )}
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  {!m.is_2fa_enabled && (
                    <button
                      onClick={() => handleNudge(m)}
                      disabled={nudging === m.user_id}
                      className="text-xs font-medium text-primary hover:bg-primary/10 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      title="Send reminder email"
                    >
                      {nudging === m.user_id ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
                      {nudging === m.user_id ? "Sending..." : "Nudge"}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (!guard.ok) {
                        error("Error", guard.reason);
                        return;
                      }
                      setConfirmName("");
                      setConfirmReset(m);
                    }}
                    disabled={isResetDisabled}
                    className="text-xs font-medium text-destructive hover:bg-destructive/10 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    title={guard.ok ? "Force this user to re-enroll 2FA — revokes their authenticator, recovery codes, and trusted devices" : guard.reason}
                  >
                    {resetting === m.user_id ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                    {resetting === m.user_id ? "Resetting..." : "Force re-enroll"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent reminders activity feed */}
      <div className="medicare-card">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Activity size={16} className="text-primary" />
            <h3 className="font-display font-semibold text-foreground">Recent reminders</h3>
            <span className="text-xs text-muted-foreground">
              {showAllReminders
                ? `${reminderTotal} total · click any row for audit detail`
                : `last ${Math.min(REMINDERS_PAGE_SIZE, reminderTotal)} of ${reminderTotal}`}
            </span>
          </div>
          {reminderTotal > REMINDERS_PAGE_SIZE && (
            <button
              onClick={() => {
                setShowAllReminders((v) => !v);
                setReminderPage(0);
              }}
              className="text-xs font-medium text-primary hover:underline"
            >
              {showAllReminders ? "Show recent only" : "Show all"}
            </button>
          )}
        </div>
        {activityLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 size={20} className="animate-spin text-muted-foreground" />
          </div>
        ) : activity.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No reminders sent yet. Use the <span className="font-medium">Nudge</span> button on a member or run the reminder job to start chasing compliance.
          </p>
        ) : (
          <>
            <ul className="divide-y divide-border">
              {activity.map((a) => (
                <li key={a.id}>
                  <button
                    onClick={() =>
                      void openAuditByResource(
                        a.recipient_user_id,
                        ["2fa_reminder_sent", "2fa_reminder_auto_sent"],
                        `${a.sender_name} → ${a.recipient_name}`,
                      )
                    }
                    className="w-full py-2.5 flex items-start gap-3 text-sm text-left hover:bg-muted/40 px-2 -mx-2 rounded-md transition-colors group"
                    title="View audit log detail"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Mail size={12} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground">
                        <span className="font-medium">{a.sender_name}</span>
                        <span className="text-muted-foreground"> reminded </span>
                        <span className="font-medium">{a.recipient_name}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {a.reason.replace(/_/g, " ")} · {relativeTime(a.sent_at)}
                      </p>
                    </div>
                    <FileText size={14} className="text-muted-foreground/40 group-hover:text-primary flex-shrink-0 mt-1 transition-colors" />
                  </button>
                </li>
              ))}
            </ul>

            {showAllReminders && totalReminderPages > 1 && (
              <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  Page {reminderPage + 1} of {totalReminderPages}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setReminderPage((p) => Math.max(0, p - 1))}
                    disabled={reminderPage === 0}
                    className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => setReminderPage((p) => Math.min(totalReminderPages - 1, p + 1))}
                    disabled={reminderPage >= totalReminderPages - 1}
                    className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Confirm reset dialog (with type-to-confirm) */}
      {confirmReset && (
        <div
          className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => { setConfirmReset(null); setConfirmName(""); }}
        >
          <div className="bg-card rounded-2xl border border-border shadow-xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <RotateCcw size={20} className="text-destructive" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-bold text-lg text-foreground">Force 2FA re-enrollment?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  <span className="font-medium text-foreground">{expectedConfirmName}</span> will be required to set up their authenticator again on next sign-in. This will:
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2"><span className="text-destructive">•</span> Revoke their TOTP authenticator factor</li>
                  <li className="flex items-start gap-2"><span className="text-destructive">•</span> Delete all unused recovery codes</li>
                  <li className="flex items-start gap-2"><span className="text-destructive">•</span> Remove every trusted device</li>
                </ul>

                <div className="mt-4">
                  <label className="text-xs font-medium text-foreground block mb-1.5">
                    Type <span className="font-mono px-1.5 py-0.5 rounded bg-muted text-foreground">{expectedConfirmName}</span> to confirm
                  </label>
                  <input
                    type="text"
                    autoFocus
                    value={confirmName}
                    onChange={(e) => setConfirmName(e.target.value)}
                    placeholder={expectedConfirmName}
                    className="medicare-input"
                    aria-label="Confirm member name"
                  />
                  {confirmName && !nameMatches && (
                    <p className="text-xs text-destructive mt-1.5">Name does not match.</p>
                  )}
                  {nameMatches && (
                    <p className="text-xs text-medicare-green mt-1.5 inline-flex items-center gap-1">
                      <Check size={11} /> Confirmed
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => { setConfirmReset(null); setConfirmName(""); }}
                className="flex-1 px-4 py-2 rounded-lg border border-border text-foreground text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleForceReset(confirmReset)}
                disabled={!nameMatches}
                className="flex-1 px-4 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Force re-enroll
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit log detail modal */}
      {auditModal && (
        <div
          className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setAuditModal(null)}
        >
          <div className="bg-card rounded-2xl border border-border shadow-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText size={20} className="text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-lg text-foreground">Audit log entry</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{auditModal.context}</p>
                </div>
              </div>
              <button
                onClick={() => setAuditModal(null)}
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {auditModal.loading ? (
              <div className="flex justify-center py-10">
                <Loader2 size={24} className="animate-spin text-primary" />
              </div>
            ) : !auditModal.entry ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <ShieldAlert size={32} className="mx-auto mb-2 opacity-40" />
                No matching audit entry found. The action may have been logged
                without a matching resource id.
              </div>
            ) : (
              <dl className="space-y-3 text-sm">
                <div className="grid grid-cols-3 gap-2">
                  <dt className="text-muted-foreground font-medium col-span-1">Action</dt>
                  <dd className="col-span-2 font-mono text-xs px-2 py-0.5 rounded bg-muted text-foreground inline-flex w-fit">
                    {auditModal.entry.action}
                  </dd>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <dt className="text-muted-foreground font-medium col-span-1">When</dt>
                  <dd className="col-span-2 text-foreground">
                    {new Date(auditModal.entry.created_at).toLocaleString()}
                    <span className="text-muted-foreground"> · {relativeTime(auditModal.entry.created_at)}</span>
                  </dd>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <dt className="text-muted-foreground font-medium col-span-1">Triggered by</dt>
                  <dd className="col-span-2 text-foreground">{auditModal.entry.user_name || "System"}</dd>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <dt className="text-muted-foreground font-medium col-span-1">Risk level</dt>
                  <dd className="col-span-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded uppercase ${
                      auditModal.entry.risk_level === "high"
                        ? "bg-destructive/10 text-destructive"
                        : auditModal.entry.risk_level === "medium"
                          ? "bg-medicare-amber-light text-medicare-amber"
                          : "bg-medicare-green-light text-medicare-green"
                    }`}>
                      {auditModal.entry.risk_level || "low"}
                    </span>
                  </dd>
                </div>
                {auditModal.entry.details && (
                  <div>
                    <dt className="text-muted-foreground font-medium mb-1.5">Details</dt>
                    <dd className="text-foreground text-sm bg-muted/40 rounded-lg p-3 leading-relaxed">
                      {auditModal.entry.details}
                    </dd>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <dt className="text-muted-foreground font-medium col-span-1">Audit ID</dt>
                  <dd className="col-span-2 font-mono text-[11px] text-muted-foreground break-all">
                    {auditModal.entry.id}
                  </dd>
                </div>
              </dl>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

