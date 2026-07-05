import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, it, expect, vi, beforeEach } from "vitest";

let mockUserRole: string | null = "super_admin";
let mockLoading = false;
let mockRoleLoading = false;

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ userRole: mockUserRole, loading: mockLoading, roleLoading: mockRoleLoading }),
}));

import { SuperAdminRoute } from "./SuperAdminRoute";

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/dashboard" element={<div>Dashboard Home</div>} />
        <Route
          path="/dashboard/organizations"
          element={
            <SuperAdminRoute>
              <div>Platform Tenants</div>
            </SuperAdminRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );

describe("SuperAdminRoute", () => {
  beforeEach(() => {
    mockLoading = false;
    mockRoleLoading = false;
  });

  it("renders the protected page for super_admin", () => {
    mockUserRole = "super_admin";
    renderAt("/dashboard/organizations");
    expect(screen.getByText("Platform Tenants")).toBeInTheDocument();
  });

  it("redirects non-super-admin roles to /dashboard", () => {
    mockUserRole = "admin";
    renderAt("/dashboard/organizations");
    expect(screen.queryByText("Platform Tenants")).not.toBeInTheDocument();
    expect(screen.getByText("Dashboard Home")).toBeInTheDocument();
  });

  it("redirects when role lookup has finished and there is no role", () => {
    mockUserRole = null;
    renderAt("/dashboard/organizations");
    expect(screen.queryByText("Platform Tenants")).not.toBeInTheDocument();
    expect(screen.getByText("Dashboard Home")).toBeInTheDocument();
  });

  it("shows a loading state instead of redirecting while role is still resolving", () => {
    mockUserRole = null;
    mockRoleLoading = true;
    renderAt("/dashboard/organizations");
    expect(screen.queryByText("Platform Tenants")).not.toBeInTheDocument();
    expect(screen.queryByText("Dashboard Home")).not.toBeInTheDocument();
  });
});
