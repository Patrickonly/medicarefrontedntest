/**
 * Tiny in-memory pub/sub for auth lifecycle events. Used by the
 * AuthProvider to broadcast onAuthStateChange events + role lookup
 * status, and by AuthDebugPanel to render them.
 *
 * Buffer is capped at 200 entries.
 */

export type AuthDebugLevel = "auth" | "role" | "redirect" | "warn" | "error";

export interface AuthDebugEntry {
  id: number;
  ts: number;
  level: AuthDebugLevel;
  label: string;
  detail?: string;
}

const MAX_ENTRIES = 200;
const buffer: AuthDebugEntry[] = [];
const listeners = new Set<(entries: AuthDebugEntry[]) => void>();
let nextId = 1;

export function logAuthDebug(level: AuthDebugLevel, label: string, detail?: unknown) {
  const entry: AuthDebugEntry = {
    id: nextId++,
    ts: Date.now(),
    level,
    label,
    detail:
      detail === undefined
        ? undefined
        : typeof detail === "string"
          ? detail
          : safeStringify(detail),
  };
  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) buffer.splice(0, buffer.length - MAX_ENTRIES);
  for (const fn of listeners) fn([...buffer]);

  // Mirror to console for dev parity. Single namespace makes filtering easy.
  console.debug(`[auth-debug:${level}] ${label}`, detail ?? "");
}

export function subscribeAuthDebug(fn: (entries: AuthDebugEntry[]) => void) {
  listeners.add(fn);
  fn([...buffer]);
  return () => {
    listeners.delete(fn);
  };
}

export function clearAuthDebug() {
  buffer.length = 0;
  for (const fn of listeners) fn([]);
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v, (_k, val) => {
      if (val instanceof Error) return { name: val.name, message: val.message };
      return val;
    });
  } catch {
    return String(v);
  }
}
