import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { ArrowLeft, Bell, Loader2, Mail, Save, Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

interface NotificationPrefs {
  email_appointments: boolean;
  email_lab_results: boolean;
  email_prescriptions: boolean;
  email_billing: boolean;
  email_system: boolean;
  sms_appointments: boolean;
  sms_emergency: boolean;
  sms_lab_results: boolean;
  inapp_all: boolean;
  inapp_appointments: boolean;
  inapp_lab_results: boolean;
  inapp_prescriptions: boolean;
  inapp_billing: boolean;
  inapp_staff: boolean;
  inapp_emergency: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  email_appointments: true,
  email_lab_results: true,
  email_prescriptions: true,
  email_billing: true,
  email_system: true,
  sms_appointments: false,
  sms_emergency: true,
  sms_lab_results: false,
  inapp_all: true,
  inapp_appointments: true,
  inapp_lab_results: true,
  inapp_prescriptions: true,
  inapp_billing: true,
  inapp_staff: true,
  inapp_emergency: true,
};

interface Props {
  onBack: () => void;
}

export default function NotificationsSection({ onBack }: Props) {
  const { success, error: toastError } = useToast();
  const { organizationId } = useAuth();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!organizationId) return;
    (async () => {
      try {
        const res = await api.get<{ success: boolean; data: { settings?: Record<string, unknown> } }>(`/api/organizations?id=${organizationId}`, { organizationId });
        const settings = res.data?.settings;
        if (settings && typeof settings === "object" && "notifications" in settings) {
          setPrefs({ ...DEFAULT_PREFS, ...((settings.notifications as Partial<NotificationPrefs>) ?? {}) });
        }
      } catch (fetchError: any) {
        toastError("Error", fetchError.message || "Failed to load notification preferences");
      } finally {
        setLoaded(true);
      }
    })();
  }, [organizationId, toastError]);

  const toggle = (key: keyof NotificationPrefs) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const handleSave = async () => {
    if (!organizationId) return;
    setSaving(true);
    try {
      const res = await api.get<{ success: boolean; data: { settings?: Record<string, unknown> } }>(`/api/organizations?id=${organizationId}`, { organizationId });
      const existing = (res.data?.settings && typeof res.data.settings === "object" ? res.data.settings : {}) as Record<string, unknown>;
      const merged = { ...existing, notifications: JSON.parse(JSON.stringify(prefs)) };
      await api.put(`/api/organizations?id=${organizationId}`, { settings: merged }, { organizationId });
      success("Success", "Notification preferences saved");
    } catch (saveError: any) {
      toastError("Error", saveError.message || "Failed to save notification preferences");
    } finally {
      setSaving(false);
    }
  };

  const Row = ({ label, description, checked, onToggle }: { label: string; description: string; checked: boolean; onToggle: () => void }) => (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onToggle} />
    </div>
  );

  if (!loaded) return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft size={16} /> Back to Settings
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl text-foreground">Notification Preferences</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Manage how your organization receives notifications</p>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm" className="gap-2">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Changes
        </Button>
      </div>

      {/* Email */}
      <div className="medicare-card">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Mail size={16} className="text-primary" />
          </div>
          <h3 className="font-semibold text-foreground text-sm">Email Notifications</h3>
        </div>
        <div className="divide-y divide-border">
          <Row label="Appointments" description="Booking confirmations, reminders, and cancellations" checked={prefs.email_appointments} onToggle={() => toggle("email_appointments")} />
          <Row label="Lab Results" description="Notifications when lab results are ready" checked={prefs.email_lab_results} onToggle={() => toggle("email_lab_results")} />
          <Row label="Prescriptions" description="New prescriptions and refill reminders" checked={prefs.email_prescriptions} onToggle={() => toggle("email_prescriptions")} />
          <Row label="Billing & Invoices" description="Payment receipts and invoice notifications" checked={prefs.email_billing} onToggle={() => toggle("email_billing")} />
          <Row label="System Updates" description="Maintenance, feature updates, and announcements" checked={prefs.email_system} onToggle={() => toggle("email_system")} />
        </div>
      </div>

      {/* SMS */}
      <div className="medicare-card">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-accent/50 flex items-center justify-center">
            <Smartphone size={16} className="text-accent-foreground" />
          </div>
          <h3 className="font-semibold text-foreground text-sm">SMS Notifications</h3>
        </div>
        <div className="divide-y divide-border">
          <Row label="Appointment Reminders" description="SMS reminders before scheduled appointments" checked={prefs.sms_appointments} onToggle={() => toggle("sms_appointments")} />
          <Row label="Emergency Alerts" description="Critical alerts and emergency notifications" checked={prefs.sms_emergency} onToggle={() => toggle("sms_emergency")} />
          <Row label="Lab Results" description="SMS when lab results are verified" checked={prefs.sms_lab_results} onToggle={() => toggle("sms_lab_results")} />
        </div>
      </div>

      {/* In-App */}
      <div className="medicare-card">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
            <Bell size={16} className="text-secondary-foreground" />
          </div>
          <h3 className="font-semibold text-foreground text-sm">In-App Notifications</h3>
        </div>
        <div className="divide-y divide-border">
          <Row label="All Notifications" description="Master toggle for in-app notifications" checked={prefs.inapp_all} onToggle={() => toggle("inapp_all")} />
          <Row label="Appointments" description="Appointment updates and queue status" checked={prefs.inapp_appointments} onToggle={() => toggle("inapp_appointments")} />
          <Row label="Lab Results" description="Lab order status changes" checked={prefs.inapp_lab_results} onToggle={() => toggle("inapp_lab_results")} />
          <Row label="Prescriptions" description="Prescription and dispensing updates" checked={prefs.inapp_prescriptions} onToggle={() => toggle("inapp_prescriptions")} />
          <Row label="Billing" description="Payment and invoice alerts" checked={prefs.inapp_billing} onToggle={() => toggle("inapp_billing")} />
          <Row label="Staff & HR" description="Shift changes, leave approvals, announcements" checked={prefs.inapp_staff} onToggle={() => toggle("inapp_staff")} />
          <Row label="Emergency Alerts" description="Critical patient and system emergencies" checked={prefs.inapp_emergency} onToggle={() => toggle("inapp_emergency")} />
        </div>
      </div>
    </div>
  );
}

