// Short-lived, pre-session "flow state" — proves this browser just
// completed register/login (or a subscribe step) for a specific user, and
// survives a hard refresh mid-flow without persisting across browser
// restarts. Backed by sessionStorage (not localStorage): the whole point is
// to be gone once the tab/browser closes on an abandoned signup.

const STORAGE_KEY = "medicare_flow";

export type FlowStep = "subscribe" | "verify-otp";

/** Which action started this flow - register and login both eventually
 * reach step "verify-otp", so this is the only way left to tell a fresh
 * registration's (longer-lived) code apart from a returning login's
 * (short-lived) one once you're on the OTP page. */
export type FlowOrigin = "register" | "login";

export interface FlowSessionState {
  token: string;
  userId: string;
  organizationId?: string;
  step: FlowStep;
  origin?: FlowOrigin;
  /** ISO timestamp of when the most recently sent OTP code expires, so the
   * OTP page can show a live countdown instead of a fixed guess. */
  otpExpiresAt?: string;
}

export const saveFlowSession = (state: FlowSessionState): void => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage unavailable (e.g. private browsing edge cases) - the
    // flow just won't survive a refresh, which is a UX regression, not a
    // security one.
  }
};

export const getFlowSession = (): FlowSessionState | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.token || !parsed?.userId || !parsed?.step) return null;
    return parsed as FlowSessionState;
  } catch {
    return null;
  }
};

export const clearFlowSession = (): void => {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
};

/**
 * True only if a flow session exists, is for the given step, and (when
 * provided) matches the expected userId. Used by page guards so a bare
 * URL query param is never sufficient on its own.
 */
export const hasValidFlowSession = (step: FlowStep, expectedUserId?: string | null): boolean => {
  const state = getFlowSession();
  if (!state || state.step !== step) return false;
  if (expectedUserId && state.userId !== expectedUserId) return false;
  return true;
};
