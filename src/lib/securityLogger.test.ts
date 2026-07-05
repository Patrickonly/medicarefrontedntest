// Unit tests for the security event logger and access-denied detection.
import { describe, it, expect, vi, beforeEach } from "vitest";

const postMock = vi.fn();
vi.mock("@/lib/api", () => ({
  api: { post: (...args: unknown[]) => postMock(...args) },
}));

import { logSecurityEvent, logIfAccessDenied } from "./securityLogger";

beforeEach(() => {
  postMock.mockReset();
  postMock.mockResolvedValue({ success: true, data: { id: "evt-1" } });
});

describe("logSecurityEvent", () => {
  it("rejects invalid action strings without calling the API", async () => {
    const id = await logSecurityEvent({ action: "BAD ACTION!!", resourceType: "x" });
    expect(id).toBeNull();
    expect(postMock).not.toHaveBeenCalled();
  });

  it("posts to /api/audit-logs with normalized payload", async () => {
    const id = await logSecurityEvent({
      action: "access_denied",
      resourceType: "patients",
      resourceId: "p-123",
      details: { op: "select" },
      risk: "high",
    });
    expect(id).toBe("evt-1");
    expect(postMock).toHaveBeenCalledWith("/api/audit-logs", expect.objectContaining({
      action: "access_denied",
      resource_type: "patients",
      resource_id: "p-123",
      risk_level: "high",
    }));
  });

  it("swallows API errors and returns null", async () => {
    postMock.mockRejectedValueOnce(new Error("nope"));
    const id = await logSecurityEvent({ action: "ok_action", resourceType: "x" });
    expect(id).toBeNull();
  });
});

describe("logIfAccessDenied", () => {
  it("returns false when no error", async () => {
    expect(await logIfAccessDenied(null, { resourceType: "x" })).toBe(false);
    expect(postMock).not.toHaveBeenCalled();
  });

  it("logs on 403 status", async () => {
    const r = await logIfAccessDenied({ status: 403, message: "forbidden" }, { resourceType: "patients", operation: "select" });
    expect(r).toBe(true);
    expect(postMock).toHaveBeenCalled();
  });

  it("logs on PG 42501 insufficient_privilege", async () => {
    const r = await logIfAccessDenied({ code: "42501", message: "permission denied for table" }, { resourceType: "audit_logs" });
    expect(r).toBe(true);
  });

  it("logs on row-level security violations", async () => {
    const r = await logIfAccessDenied({ message: "new row violates row-level security policy" }, { resourceType: "user_roles" });
    expect(r).toBe(true);
  });

  it("ignores unrelated errors (e.g. validation)", async () => {
    const r = await logIfAccessDenied({ code: "23505", message: "duplicate key" }, { resourceType: "x" });
    expect(r).toBe(false);
    expect(postMock).not.toHaveBeenCalled();
  });
});
