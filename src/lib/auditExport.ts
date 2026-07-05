import { api } from "@/lib/api";

// Pure helpers for the 2FA audit-trail export feature. Extracted so they can
// be unit-tested without rendering the TwoFactorGate component.

export const ADMIN_ROLES_FOR_EXPORT = ["org_owner", "admin", "super_admin", "director"] as const;

export type AuditFilter = "all" | "enrollment" | "qr" | "recovery" | "support";

export const FILTER_LABELS: Record<AuditFilter, string> = {
  all: "All",
  enrollment: "Enrollments",
  qr: "QR refreshes",
  recovery: "Recovery codes",
  support: "Support unlocks",
};

export const AUDIT_FILTER_GROUPS: Record<Exclude<AuditFilter, "all">, string[]> = {
  enrollment: ["2fa_enabled_required", "2fa_enabled", "2fa_disabled", "2fa_enrollment_started", "2fa_force_reenroll"],
  qr: ["2fa_enrollment_qr_refreshed", "2fa_enrollment_failed"],
  recovery: ["recovery_codes_generated", "recovery_codes_regenerated", "2fa_recovery_codes_generated"],
  support: ["2fa_support_requested"],
};

export const EVENT_LABELS: Record<string, string> = {
  "2fa_enabled_required": "2FA enrollment completed",
  "2fa_enabled": "2FA enabled",
  "2fa_disabled": "2FA disabled",
  "recovery_codes_generated": "Recovery codes generated",
  "recovery_codes_regenerated": "Recovery codes regenerated",
  "2fa_recovery_codes_generated": "Recovery codes generated",
  "2fa_enrollment_started": "Enrollment started",
  "2fa_enrollment_qr_refreshed": "QR / setup key refreshed",
  "2fa_enrollment_failed": "Verification failed",
  "2fa_support_requested": "Recovery request submitted",
  "2fa_force_reenroll": "Admin reset your 2FA factor",
  "2fa_audit_exported": "Audit trail exported",
};

export interface AuditEntry {
  id: string;
  action: string;
  details: string | null;
  created_at: string;
}

export const canExportAudit = (role: string | null | undefined): boolean =>
  !!role && (ADMIN_ROLES_FOR_EXPORT as readonly string[]).includes(role);

export const slugify = (s: string): string =>
  (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "organization";

export interface BuildFilenameInput {
  template: string;
  orgName: string;
  filter: AuditFilter;
  ext: "csv" | "pdf";
  date?: string; // YYYY-MM-DD
}

export const buildFilename = ({ template, orgName, filter, ext, date }: BuildFilenameInput): string => {
  const d = date || new Date().toISOString().slice(0, 10);
  const orgSlug = slugify(orgName || "organization");
  const tpl = (template || "{org}-2fa-audit-{filter}-{date}")
    .replace(/\{org\}/g, orgSlug)
    .replace(/\{filter\}/g, filter)
    .replace(/\{date\}/g, d)
    .replace(/\{format\}/g, ext)
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${tpl || `2fa-audit-${d}`}.${ext}`;
};

export const sha256Hex = async (text: string): Promise<string> => {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

export interface CsvBuildInput {
  entries: AuditEntry[];
  includeRawDetails: boolean;
}

/** Build the canonical CSV data block (header + body) used for hashing/exporting. */
export const buildCsvDataBlock = ({ entries, includeRawDetails }: CsvBuildInput): string => {
  const headerCols = ["Timestamp", "Event", "Raw Action", "Details"];
  if (includeRawDetails) headerCols.push("Raw Event JSON");
  const header = headerCols.join(",") + "\n";
  const body = entries
    .map((e) => {
      const cells: string[] = [
        new Date(e.created_at).toISOString(),
        EVENT_LABELS[e.action] || e.action,
        e.action,
        (e.details || "").replace(/"/g, '""'),
      ];
      if (includeRawDetails) cells.push(JSON.stringify(e).replace(/"/g, '""'));
      return cells.map((c) => `"${c}"`).join(",");
    })
    .join("\n");
  return header + body;
};

/** Build the canonical JSON data block used by the PDF exporter for hashing. */
export const buildPdfDataBlock = ({ entries, includeRawDetails }: CsvBuildInput): string =>
  JSON.stringify(
    entries.map((e) => ({
      timestamp: new Date(e.created_at).toISOString(),
      action: e.action,
      details: e.details,
      ...(includeRawDetails ? { raw: e } : {}),
    })),
  );

// ============================================================
// Structured audit_logs payload for `2fa_audit_exported` events
// ============================================================
//
// Earlier versions stored a human-readable string in `audit_logs.details`
// and parsed it back out with regex. That worked but was fragile (a small
// label change broke the UI, and there was no schema). We now serialize a
// versioned JSON object into the same `text` column. `parseExportLogDetails`
// transparently handles both shapes so historic rows still render.

export interface ExportLogPayload {
  v: 1;
  format: "csv" | "pdf";
  filename: string;
  hash: string;
  count: number;
  filter: AuditFilter;
  filterLabel: string;
  fromDate: string | null;
  toDate: string | null;
  dateRangeLabel: string;
  includeRawDetails: boolean;
}

export interface BuildExportLogPayloadInput {
  format: "csv" | "pdf";
  filename: string;
  hash: string;
  count: number;
  filter: AuditFilter;
  fromDate?: string;
  toDate?: string;
  includeRawDetails: boolean;
}

export const buildExportLogPayload = (i: BuildExportLogPayloadInput): ExportLogPayload => {
  const fromDate = i.fromDate || null;
  const toDate = i.toDate || null;
  const dateRangeLabel = fromDate || toDate ? `${fromDate || "earliest"} → ${toDate || "today"}` : "All dates";
  return {
    v: 1,
    format: i.format,
    filename: i.filename,
    hash: i.hash,
    count: i.count,
    filter: i.filter,
    filterLabel: FILTER_LABELS[i.filter],
    fromDate,
    toDate,
    dateRangeLabel,
    includeRawDetails: i.includeRawDetails,
  };
};

export const serializeExportLogDetails = (p: ExportLogPayload): string => JSON.stringify(p);

/**
 * Parse a row's `details` value back into a structured payload.
 * - If the value is JSON with `v: 1`, return it directly.
 * - Otherwise fall back to regex extraction of legacy string format.
 * Returns null if nothing useful can be extracted.
 */
export const parseExportLogDetails = (text: string | null | undefined): Partial<ExportLogPayload> | null => {
  if (!text) return null;
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object") return parsed as ExportLogPayload;
    } catch { /* fall through to legacy */ }
  }
  // Legacy string format: "Exported N ... as CSV (filename.csv). Filter: X; Date range: Y; Raw details: yes; SHA256: ..."
  const fmt = (/as (CSV|PDF)/i.exec(text)?.[1] || "").toLowerCase();
  const filename = /\(([^)]+\.(?:csv|pdf))\)/i.exec(text)?.[1] || "";
  const filterLabel = /Filter:\s*([^;]+)/i.exec(text)?.[1]?.trim() || "";
  const dateRangeLabel = /Date range:\s*([^;]+)/i.exec(text)?.[1]?.trim() || "";
  const raw = /Raw details:\s*(yes|no)/i.exec(text)?.[1] || "";
  const hash = /SHA256:\s*([a-f0-9]{64})/i.exec(text)?.[1] || "";
  const count = parseInt(/Exported (\d+)/i.exec(text)?.[1] || "0", 10) || 0;
  return {
    format: (fmt === "pdf" ? "pdf" : fmt === "csv" ? "csv" : undefined) as ExportLogPayload["format"] | undefined,
    filename: filename || undefined,
    filterLabel: filterLabel || undefined,
    dateRangeLabel: dateRangeLabel || undefined,
    includeRawDetails: raw ? raw === "yes" : undefined,
    hash: hash || undefined,
    count,
  };
};

export interface RecordExportLogInput {
  userId: string;
  userEmail: string | null | undefined;
  role: string | null | undefined;
  payload: ExportLogPayload;
}

/**
 * Insert a `2fa_audit_exported` row, gated by role. Returns `{ logged }`
 * so callers and tests can assert whether an insert was attempted.
 * Network/db errors are swallowed and surfaced as { logged: false, error }
 * so the calling UI can degrade gracefully without breaking role gating.
 */
export const recordExportLog = async (
  { userId, userEmail, role, payload }: RecordExportLogInput,
): Promise<{ logged: boolean; error?: unknown }> => {
  if (!canExportAudit(role)) return { logged: false };
  try {
    const body = {
      action: "2fa_audit_exported",
      user_id: userId,
      user_name: userEmail ?? null,
      resource_type: "user_account",
      resource_id: userId,
      risk_level: "low",
      details: serializeExportLogDetails(payload),
    };
    await api.post("/api/audit_logs", body);
    return { logged: true };
  } catch (error) {
    return { logged: false, error };
  }
};

// ============================================================
// Audit dialog refresh helpers
// ============================================================
//
// `openAudit` in TwoFactorGate must always re-fetch both the activity
// timeline and the "last export on record" card so the dialog never
// shows stale audit_logs data. The fetch logic is extracted here so the
// contract can be unit-tested with a mock supabase client.

export const AUDIT_TIMELINE_ACTIONS = [
  "2fa_enabled_required",
  "2fa_enabled",
  "2fa_disabled",
  "2fa_enrollment_started",
  "2fa_enrollment_qr_refreshed",
  "2fa_enrollment_failed",
  "recovery_codes_generated",
  "recovery_codes_regenerated",
  "2fa_recovery_codes_generated",
  "2fa_support_requested",
  "2fa_force_reenroll",
  "2fa_audit_exported",
] as const;

export interface RefreshAuditDialogInput {
  userId: string;
  role: string | null | undefined;
}

export interface RefreshAuditDialogResult {
  entries: AuditEntry[];
  entriesError: unknown | null;
  lastExportEvent: { created_at: string; details: string | null } | null;
  lastExportError: unknown | null;
  lastExportFetched: boolean; // false when role can't export
}

/**
 * Re-fetch BOTH the audit timeline and the most-recent export event.
 * - Both queries run in parallel.
 * - Errors are captured (never thrown) so the dialog can degrade gracefully.
 * - The export-event query is skipped entirely for roles that can't export.
 */
export const refreshAuditDialogData = async (
  { userId, role }: RefreshAuditDialogInput,
): Promise<RefreshAuditDialogResult> => {
  const timelinePromise = (async () => {
    try {
      const actions = AUDIT_TIMELINE_ACTIONS.join(",");
      const res = await api.get<{ data: AuditEntry[] }>(
        `/api/audit_logs?user_id=${userId}&action=${actions}&limit=20`
      );
      return { entries: (res.data || []) as AuditEntry[], entriesError: null };
    } catch (error) {
      return { entries: [] as AuditEntry[], entriesError: error };
    }
  })();

  const exportPromise = canExportAudit(role)
    ? (async () => {
        try {
          const res = await api.get<{ data: any[] }>(
            `/api/audit_logs?user_id=${userId}&action=2fa_audit_exported&limit=1`
          );
          return { lastExportEvent: res.data?.[0] ?? null, lastExportError: null, lastExportFetched: true };
        } catch (error) {
          return { lastExportEvent: null, lastExportError: error, lastExportFetched: true };
        }
      })()
    : Promise.resolve({ lastExportEvent: null, lastExportError: null, lastExportFetched: false });

  const [t, e] = await Promise.all([timelinePromise, exportPromise]);
  return { ...t, ...e };
};
