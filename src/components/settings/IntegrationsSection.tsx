import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, MessageSquare, CreditCard, FlaskConical,
  Loader2, Save, ExternalLink, Shield,
} from "lucide-react";

interface IntegrationsProps {
  onBack: () => void;
}

interface IntegrationConfig {
  sms_provider: "none" | "twilio" | "africas_talking" | "nexmo";
  sms_enabled: boolean;
  payment_gateway: "none" | "stripe" | "paystack" | "flutterwave" | "mpesa";
  payment_enabled: boolean;
  lab_system: "none" | "hl7_fhir" | "lis_generic" | "custom_api";
  lab_enabled: boolean;
  ehr_system: "none" | "openmrs" | "dhis2" | "custom";
  ehr_enabled: boolean;
}

const DEFAULT_CONFIG: IntegrationConfig = {
  sms_provider: "none",
  sms_enabled: false,
  payment_gateway: "none",
  payment_enabled: false,
  lab_system: "none",
  lab_enabled: false,
  ehr_system: "none",
  ehr_enabled: false,
};

const INTEGRATIONS = [
  {
    category: "SMS & Messaging",
    icon: MessageSquare,
    configKey: "sms" as const,
    providerKey: "sms_provider" as const,
    enabledKey: "sms_enabled" as const,
    description: "Send appointment reminders, lab results, and alerts via SMS",
    providers: [
      { value: "none", label: "Not configured" },
      { value: "twilio", label: "Twilio" },
      { value: "africas_talking", label: "Africa's Talking" },
      { value: "nexmo", label: "Vonage (Nexmo)" },
    ],
  },
  {
    category: "Payment Gateway",
    icon: CreditCard,
    configKey: "payment" as const,
    providerKey: "payment_gateway" as const,
    enabledKey: "payment_enabled" as const,
    description: "Accept payments for billing, invoices, and service charges",
    providers: [
      { value: "none", label: "Not configured" },
      { value: "stripe", label: "Stripe" },
      { value: "paystack", label: "Paystack" },
      { value: "flutterwave", label: "Flutterwave" },
      { value: "mpesa", label: "M-Pesa" },
    ],
  },
  {
    category: "Laboratory System",
    icon: FlaskConical,
    configKey: "lab" as const,
    providerKey: "lab_system" as const,
    enabledKey: "lab_enabled" as const,
    description: "Connect to external lab information systems for results",
    providers: [
      { value: "none", label: "Not configured" },
      { value: "hl7_fhir", label: "HL7 FHIR" },
      { value: "lis_generic", label: "Generic LIS" },
      { value: "custom_api", label: "Custom API" },
    ],
  },
  {
    category: "EHR / Health System",
    icon: Shield,
    configKey: "ehr" as const,
    providerKey: "ehr_system" as const,
    enabledKey: "ehr_enabled" as const,
    description: "Integrate with national health information systems",
    providers: [
      { value: "none", label: "Not configured" },
      { value: "openmrs", label: "OpenMRS" },
      { value: "dhis2", label: "DHIS2" },
      { value: "custom", label: "Custom Integration" },
    ],
  },
];

export default function IntegrationsSection({ onBack }: IntegrationsProps) {
  const { success, error: toastError } = useToast();
  const { organizationId, userRole } = useAuth();
  const isAdmin = userRole === "org_owner" || userRole === "admin" || userRole === "super_admin" || userRole === "director";

  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<IntegrationConfig>(DEFAULT_CONFIG);

  useEffect(() => {
    if (organizationId) fetchSettings();
  }, [organizationId]);

  const fetchSettings = async () => {
    if (!organizationId) return;
    try {
      const res = await api.get<{ success: boolean; data: { settings?: Record<string, unknown> } }>(`/api/organizations?id=${organizationId}`, { organizationId });
      const integrations = res.data?.settings?.integrations as Partial<IntegrationConfig> | undefined;
      if (integrations) setConfig({ ...DEFAULT_CONFIG, ...integrations });
    } catch (fetchError: any) {
      toastError("Error", fetchError.message || "Failed to load integration settings");
    }
  };

  const handleSave = async () => {
    if (!organizationId || !isAdmin) return;
    setSaving(true);
    try {
      const res = await api.get<{ success: boolean; data: { settings?: Record<string, unknown> } }>(`/api/organizations?id=${organizationId}`, { organizationId });
      const currentSettings = (res.data?.settings && typeof res.data.settings === "object" ? res.data.settings : {}) as Record<string, unknown>;
      await api.put(`/api/organizations?id=${organizationId}`, {
        settings: { ...currentSettings, integrations: { ...config } },
      }, { organizationId });
      success("Success", "Integration settings saved");
    } catch (saveError: any) {
      toastError("Error", saveError.message || "Failed to save integration settings");
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
        <h2 className="font-display font-bold text-xl text-foreground">Integrations</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Connect third-party services to extend your system</p>
      </div>

      <div className="space-y-4">
        {INTEGRATIONS.map((integration) => {
          const providerValue = config[integration.providerKey];
          const enabledValue = config[integration.enabledKey];
          const isConfigured = providerValue !== "none";

          return (
            <div key={integration.configKey} className="medicare-card space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isConfigured && enabledValue ? "bg-primary/10" : "bg-muted"}`}>
                    <integration.icon size={20} className={isConfigured && enabledValue ? "text-primary" : "text-muted-foreground"} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">{integration.category}</h3>
                    <p className="text-xs text-muted-foreground">{integration.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isConfigured && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${enabledValue ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>
                      {enabledValue ? "Active" : "Paused"}
                    </span>
                  )}
                  {isConfigured && (
                    <button
                      className={`w-10 h-5 rounded-full transition-colors relative ${enabledValue ? "bg-primary" : "bg-muted-foreground/30"}`}
                      onClick={() => isAdmin && setConfig({ ...config, [integration.enabledKey]: !enabledValue })}
                      disabled={!isAdmin}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${enabledValue ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Provider</label>
                  <select
                    className="medicare-input"
                    value={providerValue}
                    onChange={(e) => setConfig({ ...config, [integration.providerKey]: e.target.value })}
                    disabled={!isAdmin}
                  >
                    {integration.providers.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                {isConfigured && (
                  <div className="flex items-end">
                    <Button variant="outline" size="sm" className="gap-1.5 h-9 text-xs" disabled>
                      <ExternalLink size={12} />
                      Configure API Keys
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isAdmin && (
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save Integration Settings
        </Button>
      )}
    </div>
  );
}
