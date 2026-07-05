import { describe, it, expect, vi, beforeEach } from "vitest";
import { api } from "./api";

describe("401 handling distinguishes failed auth attempts from expired sessions", () => {
  beforeEach(() => {
    localStorage.setItem("auth_token", "some-existing-token");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ success: false, error: "Invalid credentials" }), {
          status: 401,
          headers: { "content-type": "application/json" },
        })
      )
    );
  });

  it("surfaces the real backend error message for a failed login, not 'Session expired'", async () => {
    await expect(api.post("/api/auth/login", { identifier: "a@b.com", password: "wrong" })).rejects.toThrow(
      "Invalid credentials"
    );
  });

  it("does not clear localStorage on a failed login attempt", async () => {
    await expect(api.post("/api/auth/login", { identifier: "a@b.com", password: "wrong" })).rejects.toThrow();
    expect(localStorage.getItem("auth_token")).toBe("some-existing-token");
  });

  it("does not dispatch auth:session-expired on a failed login attempt", async () => {
    const handler = vi.fn();
    window.addEventListener("auth:session-expired", handler);
    await expect(api.post("/api/auth/login", { identifier: "a@b.com", password: "wrong" })).rejects.toThrow();
    expect(handler).not.toHaveBeenCalled();
    window.removeEventListener("auth:session-expired", handler);
  });

  it("still treats a 401 from /api/auth/validate as a real session expiry", async () => {
    await expect(api.validateToken()).rejects.toThrow("Session expired. Please log in again.");
    expect(localStorage.getItem("auth_token")).toBeNull();
  });
});
