import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Upload, Trash2, Save, Loader2, Sun, Moon, Monitor, Palette,
} from "lucide-react";

interface AppearanceProps {
  onBack: () => void;
}

const COLOR_PRESETS = [
  { name: "Blue", value: "#2563eb" },
  { name: "Teal", value: "#0d9488" },
  { name: "Emerald", value: "#059669" },
  { name: "Violet", value: "#7c3aed" },
  { name: "Rose", value: "#e11d48" },
  { name: "Orange", value: "#ea580c" },
  { name: "Slate", value: "#475569" },
  { name: "Indigo", value: "#4f46e5" },
];

type ThemeMode = "light" | "dark" | "system";

export default function AppearanceSection({ onBack }: AppearanceProps) {
  const { success, error: toastError } = useToast();
  const { organizationId, userRole } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [primaryColor, setPrimaryColor] = useState("#2563eb");
  const [customColor, setCustomColor] = useState("#2563eb");

  const isOwnerOrAdmin = userRole === "org_owner" || userRole === "admin" || userRole === "super_admin" || userRole === "director";

  useEffect(() => {
    if (organizationId) fetchSettings();
  }, [organizationId]);

  const fetchSettings = async () => {
    if (!organizationId) return;
    try {
      const res = await api.get<{ success: boolean; data: { logoUrl?: string; logo_url?: string; settings?: Record<string, unknown> } }>(`/api/organizations?id=${organizationId}`, { organizationId });
      const data = res.data;
      if (data) {
        setLogoUrl(data.logoUrl || data.logo_url || null);
        const s = data.settings;
        if (s?.theme) setTheme(s.theme as ThemeMode);
        if (s?.primary_color) {
          setPrimaryColor(s.primary_color as string);
          setCustomColor(s.primary_color as string);
        }
      }
    } catch (fetchError: any) {
      toastError("Error", fetchError.message || "Failed to load appearance settings");
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organizationId || !isOwnerOrAdmin) return;
    if (file.size > 2 * 1024 * 1024) { toastError("Error", "Logo must be under 2MB"); return; }

    setUploading(true);
    try {
      const uploadRes = await api.upload<{ success: boolean; data: { url: string } }>("/api/uploads", file);
      const url = uploadRes.data.url;
      await api.put(`/api/organizations?id=${organizationId}`, { logoUrl: url }, { organizationId });
      setLogoUrl(url);
      success("Success", "Logo uploaded");
    } catch (uploadError: any) {
      toastError("Error", uploadError.message || "Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!organizationId || !isOwnerOrAdmin) return;
    try {
      await api.put(`/api/organizations?id=${organizationId}`, { logoUrl: null }, { organizationId });
      setLogoUrl(null);
      success("Success", "Logo removed");
    } catch (removeError: any) {
      toastError("Error", removeError.message || "Failed to remove logo");
    }
  };

  const handleSave = async () => {
    if (!organizationId || !isOwnerOrAdmin) return;
    setSaving(true);
    try {
      const res = await api.get<{ success: boolean; data: { settings?: Record<string, unknown> } }>(`/api/organizations?id=${organizationId}`, { organizationId });
      const existing = (res.data?.settings && typeof res.data.settings === "object" ? res.data.settings : {}) as Record<string, unknown>;
      await api.put(`/api/organizations?id=${organizationId}`, {
        settings: { ...existing, theme, primary_color: primaryColor },
      }, { organizationId });
      success("Success", "Appearance settings saved");
    } catch (saveError: any) {
      toastError("Error", saveError.message || "Failed to save appearance settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft size={16} /> Back to Settings
      </button>
      <div>
        <h2 className="font-display font-bold text-xl text-foreground">Appearance</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Customize your organization's branding</p>
      </div>

      {/* Logo */}
      <div className="medicare-card space-y-4">
        <h3 className="font-semibold text-foreground text-sm">Organization Logo</h3>
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <Upload size={24} className="text-muted-foreground" />
            )}
          </div>
          <div className="space-y-2">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={!isOwnerOrAdmin} />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading || !isOwnerOrAdmin} className="gap-2">
              {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {uploading ? "Uploading…" : "Upload Logo"}
            </Button>
            {logoUrl && isOwnerOrAdmin && (
              <Button variant="ghost" size="sm" onClick={handleRemoveLogo} className="gap-2 text-destructive hover:text-destructive">
                <Trash2 size={14} /> Remove
              </Button>
            )}
            <p className="text-xs text-muted-foreground">PNG, JPG up to 2MB. Recommended 256×256px.</p>
          </div>
        </div>
      </div>

      {/* Theme */}
      <div className="medicare-card space-y-4">
        <h3 className="font-semibold text-foreground text-sm">Theme</h3>
        <div className="grid grid-cols-3 gap-3">
          {([
            { key: "light" as const, icon: Sun, label: "Light" },
            { key: "dark" as const, icon: Moon, label: "Dark" },
            { key: "system" as const, icon: Monitor, label: "System" },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => isOwnerOrAdmin && setTheme(t.key)}
              className={`p-4 rounded-lg border-2 text-center transition-colors ${
                theme === t.key ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
              } ${!isOwnerOrAdmin ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <t.icon size={24} className={`mx-auto mb-2 ${theme === t.key ? "text-primary" : "text-muted-foreground"}`} />
              <p className={`text-sm font-medium ${theme === t.key ? "text-primary" : "text-foreground"}`}>{t.label}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Primary Color */}
      <div className="medicare-card space-y-4">
        <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
          <Palette size={16} className="text-primary" /> Primary Color
        </h3>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
          {COLOR_PRESETS.map((c) => (
            <button
              key={c.value}
              onClick={() => isOwnerOrAdmin && setPrimaryColor(c.value)}
              className={`group flex flex-col items-center gap-1.5`}
              disabled={!isOwnerOrAdmin}
            >
              <div
                className={`w-10 h-10 rounded-full border-2 transition-all ${
                  primaryColor === c.value ? "border-foreground scale-110 ring-2 ring-offset-2 ring-foreground/20" : "border-transparent hover:scale-105"
                }`}
                style={{ backgroundColor: c.value }}
              />
              <span className="text-[10px] text-muted-foreground">{c.name}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 pt-2">
          <label className="text-xs font-medium text-muted-foreground">Custom:</label>
          <input
            type="color"
            value={customColor}
            onChange={(e) => { setCustomColor(e.target.value); setPrimaryColor(e.target.value); }}
            disabled={!isOwnerOrAdmin}
            className="w-8 h-8 rounded cursor-pointer border border-border"
          />
          <span className="text-xs font-mono text-muted-foreground">{primaryColor}</span>
        </div>
      </div>

      {isOwnerOrAdmin && (
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Appearance
        </Button>
      )}
    </div>
  );
}
