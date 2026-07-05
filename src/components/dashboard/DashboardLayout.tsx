import { useAuth } from "@/hooks/useAuth";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  CloudOff,
  HeartPulse,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import UserMenu from "./UserMenu";
import { getDashboardScope, getSidebarSections } from "@/pages/dashboard/core/dashboardContent";
import type { UserRole } from "@/types/models";

interface MenuLink {
  icon: any;
  label: string;
  path: string;
}

interface MenuGroup {
  label: string;
  items: MenuLink[];
}

const accountLinks = [
  { icon: Users, label: "Profile Setting", path: "/dashboard/settings?tab=profile" },
  { icon: Bell, label: "Notification Preferences", path: "/dashboard/settings?tab=notifications" },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user, userRole, isAgrovetOrg } = useAuth();
  const resolvedRoleId = Number((user as any)?.role_id ?? (user as any)?.roleId ?? 0);
  const currentTab = new URLSearchParams(location.search).get("tab");
  const dashboardScope = getDashboardScope(userRole, resolvedRoleId, isAgrovetOrg);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const getRoleLabelString = () => {
    if (dashboardScope === "super_admin") return "Super Admin";
    if (dashboardScope === "administrator") {
      const u = user as any;
      const orgIdStr = u?.organizationId || u?.organization_id || u?.organization?.id;
      const branchStr = u?.branch || u?.branchId || u?.branch_id || u?.branch?.name;

      if (branchStr) return `Administrator - Branch ${branchStr}`;
      if (orgIdStr) return `Administrator - Organization ${orgIdStr}`;
      return "Administrator";
    }
    if (dashboardScope === "agrovet_owner") return "Owner";
    if (dashboardScope === "agrovet_accountant") return "Accountant";
    if (dashboardScope === "agrovet_cashier") return userRole === "cashier_vet" ? "Cashier - Vet" : "Cashier - Agro";
    return "Workspace";
  };

  const sections = getSidebarSections(dashboardScope);

  const getPageTitle = (path: string) => {
    const allItems = sections.flatMap((m) => m.items);
    const item = allItems.find((i) => i.path === path);
    if (item) return item.label;
    return "Dashboard";
  };

  const isActivePath = (path: string) => location.pathname === path || (path !== "/dashboard" && location.pathname.startsWith(path));

  const isAccountItemActive = (path: string) => {
    const basePath = path.split("?")[0];
    if (basePath !== "/dashboard/settings") return isActivePath(basePath);
    if (path.includes("tab=profile")) return location.pathname === "/dashboard/settings" && currentTab === "profile";
    if (path.includes("tab=notifications")) return location.pathname === "/dashboard/settings" && currentTab === "notifications";
    return location.pathname === "/dashboard/settings";
  };

  return (
    <div className="flex min-h-screen bg-[#f5fbfb]">
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform border-r border-[#dcebf0] bg-[#0aa9ad] text-white transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 lg:flex-shrink-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-white/15 px-5 py-4">
            <div className="flex items-center justify-between">
              <Link to="/dashboard" className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-[#07969a] shadow-lg shadow-teal-950/10">
                  <HeartPulse className="h-6 w-6" />
                </div>

                <div>
                  <p className="font-heading text-sm font-extrabold tracking-wide text-white">
                    MEDICARE ONE
                  </p>
                  <p className="text-[11px] font-semibold text-white/70">
                    {dashboardScope === "super_admin"
                      ? "Global platform control"
                      : isAgrovetOrg
                        ? "Agrovet Operations"
                        : "Healthcare Operations"}
                  </p>
                </div>
              </Link>

              <button
                className="rounded-xl p-2 text-white/75 hover:bg-white/10 hover:text-white lg:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
            {sections.map((group, groupIdx) => (
              <div key={groupIdx}>
                <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.18em] text-white/55">
                  {group.label}
                </p>

                <div className="space-y-1">
                  {group.items.map((item, itemIdx) => {
                    const active = isActivePath(item.path);

                    return (
                      <Link
                        key={`${groupIdx}-${itemIdx}`}
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={`group flex items-center justify-between rounded-[1rem] px-3 py-2.5 text-sm font-bold transition ${
                          active
                            ? "bg-white text-[#07969a] shadow-lg shadow-teal-950/10"
                            : "text-white/78 hover:bg-white/12 hover:text-white"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <item.icon
                            size={18}
                            className={active ? "text-[#07969a]" : "text-white/65 group-hover:text-white"}
                          />
                          {item.label}
                        </span>

                        {active && <ChevronRight size={16} className="text-[#07969a]" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div className="border-t border-white/15 px-3 py-3 space-y-2">
            {/* Current role */}
            <div className="flex items-center gap-3 rounded-[1rem] bg-white/10 px-3 py-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
                <ShieldCheck size={18} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-white">
                  {(user as any)?.first_name || (user as any)?.firstName
                    ? `${(user as any)?.first_name || (user as any)?.firstName} ${(user as any)?.last_name || (user as any)?.lastName || ""}`.trim()
                    : "Signed in"}
                </p>
                <p className="truncate text-[11px] font-semibold text-white/70">{getRoleLabelString()}</p>
              </div>
            </div>

            <div>
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className={`flex w-full items-center justify-between rounded-[1rem] px-3 py-2.5 text-sm font-bold transition ${
                  settingsOpen ? "bg-white/10 text-white" : "text-white/78 hover:bg-white/12 hover:text-white"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Settings size={18} className={settingsOpen ? "text-white" : "text-white/65"} />
                  Settings
                </span>
                {settingsOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>

              {settingsOpen && (
                <div className="mt-1 space-y-1 pl-4">
                  {accountLinks.map((item) => {
                    const active = isAccountItemActive(item.path);
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center justify-between rounded-[1rem] px-3 py-2.5 text-sm font-bold transition ${
                          active
                            ? "bg-white text-[#07969a] shadow-lg shadow-teal-950/10"
                            : "text-white/78 hover:bg-white/12 hover:text-white"
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <item.icon size={18} className={active ? "text-[#07969a]" : "text-white/65"} />
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              onClick={handleSignOut}
              className="mt-2 flex w-full items-center gap-3 rounded-[1rem] px-3 py-2.5 text-sm font-bold text-white/78 transition hover:bg-white/12 hover:text-white"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#09111f]/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[#dcebf0] bg-white/90 px-4 backdrop-blur-xl sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <button
              className="rounded-xl p-2 text-[#5f6d84] hover:bg-[#e8fbfb] hover:text-[#07969a] lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={22} />
            </button>

              <div className="min-w-0 flex items-center gap-4">
                <p className="hidden truncate font-heading text-sm font-extrabold text-[#09111f] sm:block">
                  {getPageTitle(location.pathname)}
                </p>

              <div className="hidden md:flex items-center gap-1.5 rounded-full border border-[#dcebf0] bg-[#f4fbfb] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0aa9ad]">
                {getRoleLabelString()}
              </div>

              {/* Offline indicator only - "Cloud Synced" pill removed per design. */}
              {!isOnline && (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-red-50 text-red-700 border-red-200">
                  <CloudOff className="w-3 h-3" />
                  Offline Mode
                </div>
              )}
            </div>
          </div>

          <UserMenu />
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
