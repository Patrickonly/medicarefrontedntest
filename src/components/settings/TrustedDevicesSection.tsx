import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, MonitorSmartphone, Trash2, ShieldCheck, Clock } from "lucide-react";
import { getDeviceHash } from "@/lib/trustedDevice";
import { formatDistanceToNow } from "date-fns";

interface TrustedDevice {
  id: string;
  device_label: string | null;
  device_hash: string;
  created_at: string;
  last_seen_at: string;
  expires_at: string;
}

export default function TrustedDevicesSection() {
  const { success, error: toastError } = useToast();
  const { user } = useAuth();
  const [devices, setDevices] = useState<TrustedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [currentHash, setCurrentHash] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    void load();
    void getDeviceHash().then(setCurrentHash);
  }, [user]);

  const logAudit = (action: string, details: string, risk: "low" | "medium" = "low") => {
    api.post("/api/audit-logs", {
      action,
      resource_type: "user_account",
      resource_id: user?.id,
      risk_level: risk,
      details,
    }).catch(() => undefined);
  };

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: TrustedDevice[] }>("/api/trusted-devices");
      setDevices(res.data || []);
    } catch {
      setDevices([]);
    } finally {
      setLoading(false);
    }
  };

  const revoke = async (id: string, label: string | null) => {
    if (!confirm(`Revoke trust for "${label || "this device"}"? It will need to verify TOTP next sign-in.`)) return;
    setWorking(id);
    try {
      await api.delete(`/api/trusted-devices/${id}`);
      logAudit("trusted_device_revoked", `Revoked trusted device: ${label || id}`);
      success("Success", "Device revoked");
      void load();
    } catch (revokeError: any) {
      toastError("Error", revokeError.message || "Failed to revoke device");
    } finally {
      setWorking(null);
    }
  };

  const revokeAll = async () => {
    if (!user || !devices.length) return;
    if (!confirm("Revoke all trusted devices? Every device will need to verify TOTP next sign-in.")) return;
    setWorking("ALL");
    try {
      await api.delete("/api/trusted-devices");
      logAudit("trusted_devices_cleared", `Cleared all ${devices.length} trusted devices`, "medium");
      success("Success", "All trusted devices revoked");
      void load();
    } catch (revokeError: any) {
      toastError("Error", revokeError.message || "Failed to revoke devices");
    } finally {
      setWorking(null);
    }
  };

  if (loading) {
    return (
      <div className="medicare-card flex items-center justify-center py-8">
        <Loader2 size={20} className="animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="medicare-card space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-medicare-blue/10 flex items-center justify-center flex-shrink-0">
            <MonitorSmartphone size={20} className="text-medicare-blue" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm">Trusted Devices</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Devices that skip 2FA verification for 30 days. Revoke any you don't recognize.
            </p>
          </div>
        </div>
        {devices.length > 0 && (
          <Button onClick={revokeAll} disabled={!!working} variant="outline" size="sm" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
            {working === "ALL" ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Revoke all
          </Button>
        )}
      </div>

      {devices.length === 0 ? (
        <div className="text-xs text-muted-foreground italic py-4 text-center bg-muted/30 rounded-lg">
          No trusted devices yet. Check "Trust this device" during your next 2FA verification to add one.
        </div>
      ) : (
        <ul className="space-y-2">
          {devices.map((d) => {
            const isCurrent = d.device_hash === currentHash;
            const expired = new Date(d.expires_at) < new Date();
            return (
              <li key={d.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isCurrent ? "bg-medicare-green-light" : "bg-muted"}`}>
                  <MonitorSmartphone size={16} className={isCurrent ? "text-medicare-green" : "text-muted-foreground"} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground truncate">{d.device_label || "Unknown device"}</p>
                    {isCurrent && (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-medicare-green bg-medicare-green-light px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                        <ShieldCheck size={10} /> Current
                      </span>
                    )}
                    {expired && (
                      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        Expired
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 inline-flex items-center gap-1">
                    <Clock size={11} />
                    Last used {formatDistanceToNow(new Date(d.last_seen_at), { addSuffix: true })} · expires {formatDistanceToNow(new Date(d.expires_at), { addSuffix: true })}
                  </p>
                </div>
                <Button onClick={() => revoke(d.id, d.device_label)} disabled={!!working} variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive flex-shrink-0">
                  {working === d.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
