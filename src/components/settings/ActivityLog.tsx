import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import {
  Activity, LogIn, KeyRound, ShieldCheck, ShieldAlert, UserCog, Loader2, AlertCircle,
} from "lucide-react";

interface AuditEntry {
  id: string;
  action: string;
  details: string | null;
  ip_address: string | null;
  risk_level: string | null;
  created_at: string;
}

const ACTION_META: Record<string, { icon: typeof Activity; label: string; color: string }> = {
  sign_in: { icon: LogIn, label: "Signed in", color: "text-medicare-blue bg-medicare-blue-light" },
  sign_out: { icon: LogIn, label: "Signed out", color: "text-muted-foreground bg-muted" },
  password_changed: { icon: KeyRound, label: "Password changed", color: "text-medicare-amber bg-medicare-amber-light" },
  "2fa_enabled": { icon: ShieldCheck, label: "2FA enabled", color: "text-medicare-green bg-medicare-green-light" },
  "2fa_disabled": { icon: ShieldAlert, label: "2FA disabled", color: "text-destructive bg-medicare-red-light" },
  profile_updated: { icon: UserCog, label: "Profile updated", color: "text-primary bg-medicare-teal-light" },
  avatar_updated: { icon: UserCog, label: "Avatar updated", color: "text-primary bg-medicare-teal-light" },
};

function getMeta(action: string) {
  return ACTION_META[action] || { icon: Activity, label: action.replace(/_/g, " "), color: "text-muted-foreground bg-muted" };
}

function formatRelative(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(date).toLocaleDateString();
}

export default function ActivityLog() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadActivity();
  }, [user]);

  const loadActivity = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: AuditEntry[] }>("/api/audit-logs?limit=20");
      setEntries(res.data || []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="medicare-card space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
          <Activity size={16} className="text-primary" /> Recent Activity
        </h3>
        <span className="text-xs text-muted-foreground">Last 20 events</span>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 size={20} className="animate-spin text-primary" />
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <AlertCircle size={32} className="mx-auto mb-2 opacity-40" />
          <p className="text-sm font-medium">No activity yet</p>
          <p className="text-xs mt-1">Account events will appear here</p>
        </div>
      ) : (
        <div className="space-y-1">
          {entries.map((entry) => {
            const meta = getMeta(entry.action);
            const Icon = meta.icon;
            const isHighRisk = entry.risk_level === "high" || entry.risk_level === "critical";
            return (
              <div key={entry.id} className="flex items-start gap-3 py-2.5 border-b border-border last:border-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.color}`}>
                  <Icon size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">{meta.label}</p>
                    {isHighRisk && (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-destructive/10 text-destructive uppercase tracking-wider">
                        {entry.risk_level}
                      </span>
                    )}
                  </div>
                  {entry.details && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{entry.details}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                    <span>{formatRelative(entry.created_at)}</span>
                    {entry.ip_address && (
                      <>
                        <span>·</span>
                        <span className="font-mono">{entry.ip_address}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
