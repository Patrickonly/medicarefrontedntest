import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Database, Download, FileText, Users, Shield,
  Loader2, Save, Clock, HardDrive,
} from "lucide-react";

interface DataBackupProps {
  onBack: () => void;
}

interface RetentionSettings {
  audit_logs_days: number;
  sales_records_days: number;
  inventory_days: number;
  auto_archive: boolean;
}

interface BackupSettings {
  frequency: "daily" | "weekly" | "monthly" | "manual";
  last_backup: string | null;
  include_attachments: boolean;
}

const RETENTION_OPTIONS = [
  { value: 90, label: "90 days" },
  { value: 180, label: "6 months" },
  { value: 365, label: "1 year" },
  { value: 730, label: "2 years" },
  { value: 1825, label: "5 years" },
  { value: 3650, label: "10 years" },
];

export default function DataBackupSection({ onBack }: DataBackupProps) {
  const { success, error: toastError } = useToast();
  const { organizationId, userRole } = useAuth();
  const isAdmin = userRole === "org_owner" || userRole === "admin" || userRole === "super_admin" || userRole === "director";

  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);

  const [retention, setRetention] = useState<RetentionSettings>({
    audit_logs_days: 365,
    sales_records_days: 1825,
    inventory_days: 1825,
    auto_archive: false,
  });

  const [backup, setBackup] = useState<BackupSettings>({
    frequency: "weekly",
    last_backup: null,
    include_attachments: true,
  });

  const handleExport = async (format: "csv" | "pdf", dataType: string) => {
    if (!organizationId) return;
    setExporting(`${dataType}-${format}`);

    try {
      let data: any[] = [];
      let filename = "";

      if (dataType === "customers") {
        const res = await api.get<{ success: boolean; data: any[] }>("/api/customers");
        data = res.data || [];
        filename = `customers_export_${new Date().toISOString().slice(0, 10)}`;
      } else if (dataType === "inventory") {
        const res = await api.get<{ success: boolean; data: any[] }>("/api/product-batches");
        data = res.data || [];
        filename = `inventory_export_${new Date().toISOString().slice(0, 10)}`;
      } else if (dataType === "sales") {
        const res = await api.get<{ success: boolean; data: any[] }>("/api/sales");
        data = res.data || [];
        filename = `sales_export_${new Date().toISOString().slice(0, 10)}`;
      } else if (dataType === "audit_logs") {
        const res = await api.get<{ success: boolean; data: any[] }>("/api/audit-logs");
        data = res.data || [];
        filename = `audit_logs_export_${new Date().toISOString().slice(0, 10)}`;
      }

      if (data.length === 0) {
        success("No data", "No data to export");
        setExporting(null);
        return;
      }

      if (format === "csv") {
        const headers = Object.keys(data[0]);
        const csvContent = [
          headers.join(","),
          ...data.map((row) =>
            headers.map((h) => {
              const val = row[h] ?? "";
              return typeof val === "string" && val.includes(",") ? `"${val}"` : val;
            }).join(",")
          ),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filename}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        success("Success", `${dataType} exported as CSV`);
      } else {
        // Simple PDF-like text export
        const headers = Object.keys(data[0]);
        const textContent = [
          `${dataType.toUpperCase()} EXPORT — ${new Date().toLocaleDateString()}`,
          "=".repeat(60),
          headers.join(" | "),
          "-".repeat(60),
          ...data.map((row) => headers.map((h) => row[h] ?? "—").join(" | ")),
        ].join("\n");

        const blob = new Blob([textContent], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${filename}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        success("Success", `${dataType} exported as text report`);
      }
    } catch {
      toastError("Error", "Export failed");
    }
    setExporting(null);
  };

  const handleSaveSettings = async () => {
    if (!organizationId || !isAdmin) return;
    setSaving(true);
    try {
      const res = await api.get<{ success: boolean; data: { settings?: Record<string, unknown> } }>(`/api/organizations?id=${organizationId}`, { organizationId });
      const currentSettings = (res.data?.settings && typeof res.data.settings === "object" ? res.data.settings : {}) as Record<string, unknown>;
      await api.put(`/api/organizations?id=${organizationId}`, {
        settings: { ...currentSettings, data_retention: { ...retention }, backup: { ...backup } },
      }, { organizationId });
      success("Success", "Data settings saved");
    } catch (saveError: any) {
      toastError("Error", saveError.message || "Failed to save data settings");
    } finally {
      setSaving(false);
    }
  };

  const exportOptions = [
    { key: "customers", label: "Customers", icon: Users },
    { key: "inventory", label: "Inventory", icon: HardDrive },
    { key: "sales", label: "Sales", icon: FileText },
    { key: "audit_logs", label: "Audit Logs", icon: Shield },
  ];

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft size={16} /> Back to Settings
      </button>

      <div>
        <h2 className="font-display font-bold text-xl text-foreground">Data & Backup</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Export data, manage retention policies, and configure backups</p>
      </div>

      {/* Data Export */}
      <div className="medicare-card space-y-4">
        <div className="flex items-center gap-2">
          <Download size={18} className="text-primary" />
          <h3 className="font-semibold text-foreground text-sm">Data Export</h3>
        </div>
        <p className="text-xs text-muted-foreground">Download your organization data in CSV or text report format</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {exportOptions.map((opt) => (
            <div key={opt.key} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <opt.icon size={16} className="text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{opt.label}</span>
              </div>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  disabled={!!exporting}
                  onClick={() => handleExport("csv", opt.key)}
                >
                  {exporting === `${opt.key}-csv` ? <Loader2 size={12} className="animate-spin" /> : null}
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  disabled={!!exporting}
                  onClick={() => handleExport("pdf", opt.key)}
                >
                  {exporting === `${opt.key}-pdf` ? <Loader2 size={12} className="animate-spin" /> : null}
                  Report
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Retention Policy */}
      <div className="medicare-card space-y-4">
        <div className="flex items-center gap-2">
          <Clock size={18} className="text-primary" />
          <h3 className="font-semibold text-foreground text-sm">Retention Policies</h3>
        </div>
        <p className="text-xs text-muted-foreground">Define how long different types of data are kept before archiving</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { key: "audit_logs_days" as const, label: "Audit Logs" },
            { key: "sales_records_days" as const, label: "Sales Records" },
            { key: "inventory_days" as const, label: "Inventory" },
          ].map((field) => (
            <div key={field.key}>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{field.label}</label>
              <select
                className="medicare-input"
                value={retention[field.key]}
                onChange={(e) => setRetention({ ...retention, [field.key]: Number(e.target.value) })}
                disabled={!isAdmin}
              >
                {RETENTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
          ))}
          <div className="flex items-center gap-3 pt-5">
            <button
              className={`w-10 h-5 rounded-full transition-colors relative ${retention.auto_archive ? "bg-primary" : "bg-muted-foreground/30"}`}
              onClick={() => isAdmin && setRetention({ ...retention, auto_archive: !retention.auto_archive })}
              disabled={!isAdmin}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${retention.auto_archive ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
            <span className="text-sm text-foreground">Auto-archive expired records</span>
          </div>
        </div>
      </div>

      {/* Backup Schedule */}
      <div className="medicare-card space-y-4">
        <div className="flex items-center gap-2">
          <Database size={18} className="text-primary" />
          <h3 className="font-semibold text-foreground text-sm">Backup Schedule</h3>
        </div>
        <p className="text-xs text-muted-foreground">Configure automatic backup frequency</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Frequency</label>
            <select
              className="medicare-input"
              value={backup.frequency}
              onChange={(e) => setBackup({ ...backup, frequency: e.target.value as BackupSettings["frequency"] })}
              disabled={!isAdmin}
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="manual">Manual Only</option>
            </select>
          </div>
          <div className="flex items-center gap-3 pt-5">
            <button
              className={`w-10 h-5 rounded-full transition-colors relative ${backup.include_attachments ? "bg-primary" : "bg-muted-foreground/30"}`}
              onClick={() => isAdmin && setBackup({ ...backup, include_attachments: !backup.include_attachments })}
              disabled={!isAdmin}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${backup.include_attachments ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
            <span className="text-sm text-foreground">Include file attachments</span>
          </div>
        </div>
      </div>

      {isAdmin && (
        <Button onClick={handleSaveSettings} disabled={saving} className="gap-2">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Data Settings
        </Button>
      )}
    </div>
  );
}
