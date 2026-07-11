import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/SubscriptionContext";
import SubscriptionActivationView from "@/components/dashboard/subscriptions/SubscriptionActivationView";
import { getDashboardScope, getSidebarSections } from "@/pages/dashboard/core/dashboardContent";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Headset,
  Menu,
  MessageSquare,
  Search,
  Sun,
  Moon,
  X,
  AlertTriangle,
  Loader2
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import UserMenu from "./UserMenu";

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [desktopSidebarVisible, setDesktopSidebarVisible] = useState(true);
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState("");
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});
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
    if (dashboardScope === "administrator") return "Administrator";
    if (dashboardScope === "agrovet_owner") return "Owner";
    if (dashboardScope === "agrovet_accountant") return "Accountant";
    if (dashboardScope === "agrovet_cashier") return userRole === "cashier_vet" ? "Cashier - Vet" : "Cashier - Agro";
    return "Workspace";
  };

  const { subscription, isLoading: isSubscriptionLoading } = useSubscription();
  const isSuperAdmin = dashboardScope === "super_admin";
  let sections = getSidebarSections(dashboardScope);
  
  // A subscription is considered inactive if it's missing or isActive is false.
  // We ensure it's not considered inactive while still loading.
  const hasNoSubscription = !isSuperAdmin && !isSubscriptionLoading && (!subscription || !subscription.isActive);

  if (hasNoSubscription) {
    sections = [
      {
        label: "Workspace Alert",
        items: [
          {
            icon: AlertTriangle,
            label: "Renewal",
            path: "/dashboard/my-subscription",
          }
        ]
      }
    ];
  }
  
  // Filter sections based on search query
  if (sidebarSearchQuery.trim()) {
    const query = sidebarSearchQuery.toLowerCase();
    sections = sections.map(group => ({
      ...group,
      items: group.items.filter(item => item.label.toLowerCase().includes(query))
    })).filter(group => group.items.length > 0);
  }
  
  // Find the best matching path in the sidebar for active state
  let activePath = "";
  sections.forEach(group => {
    group.items.forEach(item => {
      if (location.pathname === item.path || (item.path !== "/dashboard" && location.pathname.startsWith(item.path + "/"))) {
        if (item.path.length > activePath.length) {
          activePath = item.path;
        }
      }
    });
  });
  if (!activePath && location.pathname === "/dashboard") activePath = "/dashboard";

  const isActivePath = (path: string) => path === activePath || (path !== "/dashboard" && location.pathname.startsWith(path));

  // Initialize expanded menus based on active path
  useEffect(() => {
    sections.forEach(group => {
      group.items.forEach(item => {
        if (item.subItems && isActivePath(item.path)) {
          setExpandedMenus(prev => ({ ...prev, [item.label]: true }));
        }
      });
    });
  }, [location.pathname, sections]);

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const isAccountItemActive = (path: string) => {
    const basePath = path.split("?")[0];
    if (basePath !== "/dashboard/settings") return isActivePath(basePath);
    if (path.includes("tab=profile")) return location.pathname === "/dashboard/settings" && currentTab === "profile";
    if (path.includes("tab=notifications")) return location.pathname === "/dashboard/settings" && currentTab === "notifications";
    return location.pathname === "/dashboard/settings";
  };

  const isBillingPage = location.pathname.includes("/subscriptions") || location.pathname.includes("/my-subscription");
  
  // Show the gate if they have no subscription AND they are not currently on the billing page
  const showSubscriptionGate = hasNoSubscription && !isBillingPage;

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground transition-colors duration-300">
      <aside
        className={`fixed inset-y-0 left-0 z-50 transform border-r border-border bg-card/95 backdrop-blur-xl shadow-xl transition-all duration-300 lg:sticky lg:top-0 lg:h-screen lg:flex-shrink-0 lg:shadow-none ${
          sidebarOpen ? "translate-x-0 w-72" : "-translate-x-full w-72"
        } ${
          desktopSidebarVisible ? "lg:translate-x-0 lg:w-72" : "lg:-translate-x-full lg:w-0 lg:border-r-0 lg:overflow-hidden"
        }`}
      >
        <div className="flex h-full w-72 flex-col overflow-hidden">
          <div className="shrink-0 border-b border-border px-6 py-6">
            <div className="flex items-center justify-between">
              <Link to="/dashboard" className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-lg shadow-primary/20 overflow-hidden shrink-0">
                  {(user as any)?.organization?.logo_url ? (
                    <img src={(user as any).organization.logo_url} alt="Logo" className="h-full w-full object-cover" />
                  ) : (
                    <span className="font-bold text-xl tracking-tighter">M</span>
                  )}
                </div>

                <div className="flex flex-col">
                  <p className="font-heading text-xl font-black leading-tight tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
                    MEDICARE <span className="text-primary font-light">ONE</span>
                  </p>
                  <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mt-0.5">{getRoleLabelString()}</span>
                </div>
              </Link>

              <button
                aria-label="Close sidebar"
                className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-muted-foreground lg:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="px-4 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <input
                type="text"
                placeholder="Search menu..."
                value={sidebarSearchQuery}
                onChange={(e) => setSidebarSearchQuery(e.target.value)}
                className="w-full bg-muted/50 border-none rounded-xl pl-9 pr-4 py-2 text-sm focus:ring-1 focus:ring-primary outline-none transition-all"
              />
            </div>
          </div>

          <nav className="sidebar-scroll-area flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {sections.map((group, groupIdx) => (
              <div key={groupIdx} className="mb-6 last:mb-0">
                {group.label && (
                  <h4 className="mb-3 px-4 text-xs font-bold tracking-widest text-muted-foreground uppercase opacity-70">
                    {group.label}
                  </h4>
                )}
                <div className="space-y-1">
                  {group.items.map((item, itemIdx) => {
                    const active = isActivePath(item.path);
                    const isExpanded = expandedMenus[item.label];
                    const hasSubItems = !!item.subItems?.length;

                    if (hasSubItems) {
                      return (
                        <div key={`${groupIdx}-${itemIdx}`} className="space-y-1">
                          <button
                            onClick={() => toggleMenu(item.label)}
                            className={`w-full group relative flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300 ease-in-out overflow-hidden ${active ? "bg-[#0aa9ad] text-white shadow-lg shadow-teal-500/25" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-foreground"}`}
                          >
                            {!active && <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />}
                            <span className="relative flex items-center gap-3 z-10 transition-transform duration-300 group-hover:translate-x-1">
                              <item.icon size={18} strokeWidth={active ? 2.5 : 2} className={`transition-colors duration-300 ${active ? "text-white" : "text-slate-400 group-hover:text-primary"}`} />
                              {item.label}
                            </span>
                            <span className="relative z-10">
                              <ChevronDown size={16} className={`transition-transform duration-300 ${isExpanded ? "rotate-180" : ""} ${active ? "text-white" : "text-slate-400"}`} />
                            </span>
                          </button>
                          
                          {/* Sub Items */}
                          <div className={`overflow-hidden transition-all duration-300 ease-in-out space-y-1 ${isExpanded ? "max-h-40 opacity-100 mt-1" : "max-h-0 opacity-0"}`}>
                            {item.subItems!.map((subItem, subIdx) => {
                              const isSubActive = location.pathname === subItem.path;
                              return (
                                <Link
                                  key={subIdx}
                                  to={subItem.path}
                                  onClick={() => setSidebarOpen(false)}
                                  className={`flex items-center gap-3 pl-11 pr-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${isSubActive ? "text-primary bg-primary/10 font-bold" : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50"}`}
                                >
                                  <div className={`w-1.5 h-1.5 rounded-full ${isSubActive ? "bg-primary" : "bg-slate-300 dark:bg-slate-600"}`} />
                                  {subItem.label}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={`${groupIdx}-${itemIdx}`}
                        to={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={`group relative flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-300 ease-in-out overflow-hidden ${active ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-foreground"}`}
                      >
                        {/* Modern subtle hover background scale effect */}
                        {!active && <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />}
                        
                        <span className="relative flex items-center gap-3 z-10 transition-transform duration-300 group-hover:translate-x-1">
                          <item.icon size={18} strokeWidth={active ? 2.5 : 2} className={`transition-colors duration-300 ${active ? "text-primary-foreground" : "text-slate-400 group-hover:text-primary"}`} />
                          {item.label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Floating "show sidebar" tab - only rendered once the desktop sidebar
          has been collapsed, so there's always a way back in without hunting
          for the header's toggle button. */}
      {!desktopSidebarVisible && (
        <button
          type="button"
          aria-label="Show sidebar"
          title="Show sidebar"
          className="fixed left-0 top-1/2 z-40 hidden -translate-y-1/2 items-center rounded-r-xl border border-l-0 border-border bg-card p-2 text-muted-foreground shadow-lg transition-colors hover:bg-primary hover:text-primary-foreground lg:flex"
          onClick={() => setDesktopSidebarVisible(true)}
        >
          <ChevronRight size={18} />
        </button>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-border bg-card/90 px-4 shadow-sm backdrop-blur-xl sm:px-8">
          <div className="flex flex-1 items-center gap-4">
            <button aria-label="Open sidebar" className="rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-slate-700 lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <button aria-label="Toggle desktop sidebar" className="hidden lg:block rounded-xl p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-slate-700" onClick={() => setDesktopSidebarVisible(!desktopSidebarVisible)}>
              <Menu size={20} />
            </button>

            <div className="relative hidden w-full max-w-md items-center lg:flex">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <input
                type="text"
                placeholder="Search patients, appointments, invoices..."
                className="medicare-search-input pl-10 pr-16 bg-muted/50 focus:bg-background"
              />
              <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 text-[10px] font-medium text-muted-foreground">
                <span className="bg-card border border-border rounded px-1.5 py-0.5 shadow-sm">Ctrl</span>
                <span>+</span>
                <span className="bg-card border border-border rounded px-1.5 py-0.5 shadow-sm">/</span>
              </div>
            </div>

            <div className="hidden lg:flex items-center ml-4 px-3 py-1.5 bg-primary/10 text-primary rounded-lg border border-primary/20">
              <span className="text-sm font-semibold tracking-wide">{(user as any)?.organization?.name || "Workspace"}</span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            <button className="relative text-muted-foreground transition-colors hover:text-foreground">
              <Bell size={20} />
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-card bg-destructive text-[8px] font-bold text-destructive-foreground">5</span>
            </button>
            <button className="relative hidden text-muted-foreground transition-colors hover:text-foreground sm:block">
              <MessageSquare size={20} />
              <span className="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-card bg-destructive text-[8px] font-bold text-destructive-foreground">2</span>
            </button>

            <div className="mx-2 hidden h-6 w-[1px] bg-border sm:block"></div>
            <UserMenu />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-muted/30 flex flex-col relative">
          <div className="flex-1 flex flex-col">
            {isSubscriptionLoading ? (
              <div className="flex h-full min-h-[60vh] items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : showSubscriptionGate ? (
              <SubscriptionActivationView />
            ) : (
              <Outlet />
            )}
          </div>
          <footer className="w-full py-5 px-6 border-t border-border bg-card flex flex-col sm:flex-row items-center justify-between gap-4 mt-auto">
            <p className="text-sm text-muted-foreground font-medium">
              &copy; {new Date().getFullYear()} <span className="text-foreground font-bold">Medicare</span>. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
              <Link to="/dashboard/support" className="hover:text-primary transition-colors">Support</Link>
              <Link to="/dashboard/settings" className="hover:text-primary transition-colors">Settings</Link>
              <a href="#" className="hover:text-primary transition-colors">Documentation</a>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
