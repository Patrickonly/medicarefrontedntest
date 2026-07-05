import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Loader2, Globe, Clock, DollarSign } from "lucide-react";

interface LocalizationProps {
  onBack: () => void;
}

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "sw", label: "Swahili (Kiswahili)" },
  { code: "fr", label: "French (Français)" },
  { code: "ar", label: "Arabic (العربية)" },
  { code: "pt", label: "Portuguese (Português)" },
  { code: "es", label: "Spanish (Español)" },
  { code: "zh", label: "Chinese (中文)" },
  { code: "hi", label: "Hindi (हिन्दी)" },
];

const TIMEZONES = [
  { value: "Africa/Dar_es_Salaam", label: "East Africa (EAT, UTC+3)" },
  { value: "Africa/Nairobi", label: "Nairobi (EAT, UTC+3)" },
  { value: "Africa/Lagos", label: "West Africa (WAT, UTC+1)" },
  { value: "Africa/Cairo", label: "Cairo (EET, UTC+2)" },
  { value: "Africa/Johannesburg", label: "South Africa (SAST, UTC+2)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "Europe/Paris", label: "Paris (CET, UTC+1)" },
  { value: "America/New_York", label: "New York (EST, UTC-5)" },
  { value: "America/Chicago", label: "Chicago (CST, UTC-6)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PST, UTC-8)" },
  { value: "Asia/Dubai", label: "Dubai (GST, UTC+4)" },
  { value: "Asia/Kolkata", label: "India (IST, UTC+5:30)" },
  { value: "Asia/Shanghai", label: "China (CST, UTC+8)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST, UTC+9)" },
  { value: "Australia/Sydney", label: "Sydney (AEST, UTC+10)" },
];

const CURRENCIES = [
  { code: "TZS", symbol: "TSh", label: "Tanzanian Shilling" },
  { code: "KES", symbol: "KSh", label: "Kenyan Shilling" },
  { code: "UGX", symbol: "USh", label: "Ugandan Shilling" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "ZAR", symbol: "R", label: "South African Rand" },
  { code: "NGN", symbol: "₦", label: "Nigerian Naira" },
  { code: "GHS", symbol: "GH₵", label: "Ghanaian Cedi" },
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham" },
];

const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY", example: "24/03/2026" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY", example: "03/24/2026" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD", example: "2026-03-24" },
  { value: "DD-MMM-YYYY", label: "DD-MMM-YYYY", example: "24-Mar-2026" },
];

export default function LocalizationSection({ onBack }: LocalizationProps) {
  const { success, error: toastError } = useToast();
  const { organizationId, userRole } = useAuth();
  const [saving, setSaving] = useState(false);
  const [language, setLanguage] = useState("en");
  const [timezone, setTimezone] = useState("Africa/Dar_es_Salaam");
  const [currency, setCurrency] = useState("TZS");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");

  const isOwnerOrAdmin = userRole === "org_owner" || userRole === "admin" || userRole === "super_admin" || userRole === "director";

  useEffect(() => {
    if (organizationId) fetchSettings();
  }, [organizationId]);

  const fetchSettings = async () => {
    if (!organizationId) return;
    try {
      const res = await api.get<{ success: boolean; data: { settings?: Record<string, unknown> } }>(`/api/organizations?id=${organizationId}`, { organizationId });
      const s = res.data?.settings;
      if (s?.language) setLanguage(s.language as string);
      if (s?.timezone) setTimezone(s.timezone as string);
      if (s?.currency) setCurrency(s.currency as string);
      if (s?.date_format) setDateFormat(s.date_format as string);
    } catch (fetchError: any) {
      toastError("Error", fetchError.message || "Failed to load localization settings");
    }
  };

  const handleSave = async () => {
    if (!organizationId || !isOwnerOrAdmin) return;
    setSaving(true);
    try {
      const res = await api.get<{ success: boolean; data: { settings?: Record<string, unknown> } }>(`/api/organizations?id=${organizationId}`, { organizationId });
      const existing = (res.data?.settings && typeof res.data.settings === "object" ? res.data.settings : {}) as Record<string, unknown>;
      await api.put(`/api/organizations?id=${organizationId}`, {
        settings: { ...existing, language, timezone, currency, date_format: dateFormat },
      }, { organizationId });
      success("Success", "Localization settings saved");
    } catch (saveError: any) {
      toastError("Error", saveError.message || "Failed to save localization settings");
    } finally {
      setSaving(false);
    }
  };

  const selectClass = "medicare-input appearance-none bg-background";

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft size={16} /> Back to Settings
      </button>
      <div>
        <h2 className="font-display font-bold text-xl text-foreground">Localization</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Language, timezone, and regional format preferences</p>
      </div>

      {/* Language */}
      <div className="medicare-card space-y-3">
        <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
          <Globe size={16} className="text-primary" /> Language
        </h3>
        <p className="text-xs text-muted-foreground">Primary language for the organization interface</p>
        <select value={language} onChange={(e) => setLanguage(e.target.value)} disabled={!isOwnerOrAdmin} className={selectClass}>
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>{l.label}</option>
          ))}
        </select>
      </div>

      {/* Timezone */}
      <div className="medicare-card space-y-3">
        <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
          <Clock size={16} className="text-primary" /> Timezone
        </h3>
        <p className="text-xs text-muted-foreground">Used for appointment scheduling, reports, and timestamps</p>
        <select value={timezone} onChange={(e) => setTimezone(e.target.value)} disabled={!isOwnerOrAdmin} className={selectClass}>
          {TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
        </select>
      </div>

      {/* Currency */}
      <div className="medicare-card space-y-3">
        <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
          <DollarSign size={16} className="text-primary" /> Currency
        </h3>
        <p className="text-xs text-muted-foreground">Default currency for billing and invoicing</p>
        <select value={currency} onChange={(e) => setCurrency(e.target.value)} disabled={!isOwnerOrAdmin} className={selectClass}>
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>{c.symbol} — {c.label} ({c.code})</option>
          ))}
        </select>
      </div>

      {/* Date Format */}
      <div className="medicare-card space-y-3">
        <h3 className="font-semibold text-foreground text-sm">Date Format</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {DATE_FORMATS.map((df) => (
            <button
              key={df.value}
              onClick={() => isOwnerOrAdmin && setDateFormat(df.value)}
              className={`p-3 rounded-lg border-2 text-center transition-colors ${
                dateFormat === df.value ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
              } ${!isOwnerOrAdmin ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <p className={`text-sm font-medium ${dateFormat === df.value ? "text-primary" : "text-foreground"}`}>{df.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{df.example}</p>
            </button>
          ))}
        </div>
      </div>

      {isOwnerOrAdmin && (
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Localization
        </Button>
      )}
    </div>
  );
}
