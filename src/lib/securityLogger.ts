// =====================================================
// Security event logger — writes to audit_logs via the API
// =====================================================
// Call from anywhere we catch a 401/403, role-grant attempt, or other
// security-relevant event. Failures here are swallowed (logging must never
// break the calling flow), but they emit a console warning in dev.

import { api } from "@/lib/api";

export type SecurityRisk = "low" | "medium" | "high" | "critical";

export interface SecurityEventInput {
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  risk?: SecurityRisk;
}

const ACTION_RE = /^[a-z0-9_.]{1,64}$/;

export async function logSecurityEvent(evt: SecurityEventInput): Promise<string | null> {
  if (!ACTION_RE.test(evt.action)) {
    if (import.meta.env.DEV) console.warn("[securityLogger] invalid action:", evt.action);
    return null;
  }
  try {
    const res = await api.post<{ success: boolean; data: { id: string } }>("/api/audit-logs", {
      action: evt.action,
      resource_type: evt.resourceType,
      resource_id: evt.resourceId ?? "",
      details: evt.details ?? {},
      risk_level: evt.risk ?? "medium",
    });
    return res.data?.id ?? null;
  } catch (e) {
    if (import.meta.env.DEV) console.warn("[securityLogger] threw:", e);
    return null;
  }
}

/**
 * Inspect an API error and, if it looks like an access-denied rejection,
 * log it. Returns true when an event was emitted.
 */
export async function logIfAccessDenied(
  error: { code?: string; message?: string; status?: number } | null | undefined,
  context: { resourceType: string; resourceId?: string; operation?: string },
): Promise<boolean> {
  if (!error) return false;
  const code = error.code ?? "";
  const msg = (error.message ?? "").toLowerCase();
  const status = error.status ?? 0;
  const denied =
    status === 401 ||
    status === 403 ||
    code === "42501" || // insufficient_privilege
    code === "PGRST301" || // jwt expired / unauthorized
    code === "PGRST302" ||
    msg.includes("row-level security") ||
    msg.includes("permission denied") ||
    msg.includes("violates row-level security");
  if (!denied) return false;
  await logSecurityEvent({
    action: "access_denied",
    resourceType: context.resourceType,
    resourceId: context.resourceId,
    risk: "high",
    details: {
      operation: context.operation ?? "unknown",
      code,
      status,
      message: error.message?.slice(0, 200),
    },
  });
  return true;
}
