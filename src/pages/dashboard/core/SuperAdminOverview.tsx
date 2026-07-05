import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { fetchRoleOptions, getRoleLabel } from "@/lib/roleDirectory";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Banknote,
  Building2,
  CreditCard,
  FileClock,
  HeartPulse,
  ListChecks,
  Ticket,
  Users,
  Warehouse,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  CategoryBarH,
  CategoryColumn,
  CategoryDonut,
  ChartCard,
  EmptyChart,
  formatNumber,
} from "@/pages/dashboard/core/overviewCharts";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-RW", {
    style: "currency",
    currency: "RWF",
    maximumFractionDigits: 0,
    notation: value >= 1_000_000 ? "compact" : "standard",
  }).format(value || 0);

// Read the first present key from a loosely-typed API row - the platform
// endpoints aren't strongly typed and field names vary (snake/camel), so we
// probe a few likely names rather than assume one.
const pick = <T,>(obj: any, keys: string[], fallback: T): T => {
  for (const k of keys) {
    if (obj != null && obj[k] != null) return obj[k] as T;
  }
  return fallback;
};

const titleCase = (s: string) =>
  String(s)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();

// Groups rows by a derived category → [{ name, value }] sorted desc. Beyond
// `max` categories the tail folds into a single "Other" slot so we never cycle
// the palette or crowd the axis.
const groupCount = (
  rows: any[],
  keyOf: (row: any) => string,
  max = 8
): Array<{ name: string; value: number }> => {
  const acc: Record<string, number> = {};
  for (const r of rows) {
    const k = keyOf(r) || "Unknown";
    acc[k] = (acc[k] || 0) + 1;
  }
  const sorted = Object.entries(acc)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
  if (sorted.length <= max) return sorted;
  const head = sorted.slice(0, max - 1);
  const other = sorted.slice(max - 1).reduce((s, d) => s + d.value, 0);
  return [...head, { name: "Other", value: other }];
};

// ---------------------------------------------------------------------------
// KPI stat tile
// ---------------------------------------------------------------------------
interface KpiDef {
  label: string;
  value: string;
  helpText: string;
  icon: any;
  tone: "blue" | "emerald" | "amber" | "rose" | "violet" | "slate";
}

const toneClasses: Record<KpiDef["tone"], string> = {
  blue: "bg-blue-50 text-blue-600 border-blue-100",
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
  amber: "bg-amber-50 text-amber-600 border-amber-100",
  rose: "bg-rose-50 text-rose-600 border-rose-100",
  violet: "bg-violet-50 text-violet-600 border-violet-100",
  slate: "bg-slate-100 text-slate-600 border-slate-200",
};

const toneBar: Record<KpiDef["tone"], string> = {
  blue: "bg-blue-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  violet: "bg-violet-500",
  slate: "bg-slate-400",
};

function KpiCard({ kpi }: { kpi: KpiDef }) {
  return (
    <Card className="group relative overflow-hidden border-slate-200/80 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <span className={`absolute inset-x-0 top-0 h-1 ${toneBar[kpi.tone]} opacity-80`} />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{kpi.label}</p>
            <p className="mt-2.5 text-[26px] font-black leading-none text-slate-900 tabular-nums">{kpi.value}</p>
            <p className="mt-2 truncate text-xs font-medium text-slate-500">{kpi.helpText}</p>
          </div>
          <div className={`rounded-2xl border p-2.5 transition-transform group-hover:scale-105 ${toneClasses[kpi.tone]}`}>
            <kpi.icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewSkeleton() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50/60 to-transparent">
      <Skeleton className="h-28 w-full rounded-3xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Skeleton className="h-80 w-full rounded-2xl xl:col-span-2" />
        <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function SuperAdminOverview() {
  const { user, organizationId } = useAuth();
  const greetingName = (user as any)?.first_name || (user as any)?.firstName || "Super Admin";

  // Live platform payload (§3b): organizations_total, active_organizations,
  // pending_organization_approvals, total_branches, total_users,
  // active_subscriptions, pending_subscription_approvals, open_support_tickets,
  // pending_payments, recent_*[], top_organizations_by_revenue[].
  const platformQuery = useQuery({
    queryKey: ["super_admin_platform_dashboard", organizationId],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any }>(
        "/api/dashboard",
        organizationId ? { organizationId } : undefined
      );
      return res.data || {};
    },
    enabled: !!user,
  });

  const orgsQuery = useQuery({
    queryKey: ["admin_organizations"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>("/api/admin/organizations");
      return res.data || [];
    },
    enabled: !!user,
  });

  const usersQuery = useQuery({
    queryKey: ["admin_all_users"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>("/api/users");
      return res.data || [];
    },
    enabled: !!user,
  });

  const ticketsQuery = useQuery({
    queryKey: ["admin_support_tickets"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>("/api/support/tickets");
      return res.data || [];
    },
    enabled: !!user,
  });

  // Role directory (/api/roles) - lets us resolve a user's numeric role_id (or
  // role object) to a human label instead of rendering "[object Object]".
  const rolesQuery = useQuery({
    queryKey: ["roleOptions"],
    queryFn: fetchRoleOptions,
    enabled: !!user,
  });

  // Canonical subscription-payments feed (same source the Payments page uses).
  // The dashboard payload's recent_payments[] doesn't reliably carry the org
  // name; this endpoint returns rows with organization.name + subscription.plan_name.
  const paymentsQuery = useQuery({
    queryKey: ["admin_subscription_payments_all"],
    queryFn: async () => {
      const res = await api.get<any>("/api/admin/subscriptions/payments");
      // This endpoint returns a bare array (not the { success, data } envelope).
      return Array.isArray(res) ? res : res?.data || [];
    },
    enabled: !!user,
  });

  if (platformQuery.isLoading) return <OverviewSkeleton />;

  const p = platformQuery.data || {};
  const roleLabelById = new Map<string, string>();
  (rolesQuery.data || []).forEach((r) => roleLabelById.set(String(r.id), r.label || r.name));

  // Resolve a user row's role to a clean label. The API returns role as an
  // object ({ id, name }) and/or a role_id - never assume it's a bare string.
  const resolveRoleLabel = (u: any): string => {
    const roleId = u?.role_id ?? u?.roleId ?? u?.role?.id;
    if (roleId != null && roleLabelById.has(String(roleId))) return roleLabelById.get(String(roleId))!;
    const name = u?.role?.name ?? (typeof u?.role === "string" ? u.role : null) ?? u?.role_name;
    return name ? getRoleLabel(name) : "Unassigned";
  };
  const organizations = orgsQuery.data || [];
  const users = usersQuery.data || [];
  const tickets = ticketsQuery.data || [];

  // --- KPIs (all live from the platform payload) ---
  const organizationsTotal = pick<number>(p, ["organizations_total", "total_organizations"], 0);
  const activeOrganizations = pick<number>(p, ["active_organizations"], 0);
  const pendingOrgApprovals = pick<number>(p, ["pending_organization_approvals"], 0);
  const totalBranches = pick<number>(p, ["total_branches"], 0);
  const totalUsers = pick<number>(p, ["total_users"], 0);
  const activeSubscriptions = pick<number>(p, ["active_subscriptions"], 0);
  const pendingSubscriptions = pick<number>(p, ["pending_subscription_approvals"], 0);
  const openSupportTickets = pick<number>(p, ["open_support_tickets"], 0);
  const pendingPayments = pick<number>(p, ["pending_payments"], 0);

  const activationRate = organizationsTotal > 0 ? Math.round((activeOrganizations / organizationsTotal) * 100) : 0;

  const kpis: KpiDef[] = [
    { label: "Total organizations", value: formatNumber(organizationsTotal), helpText: "Across the platform", icon: Building2, tone: "blue" },
    { label: "Active organizations", value: formatNumber(activeOrganizations), helpText: `${activationRate}% live on platform`, icon: HeartPulse, tone: "emerald" },
    { label: "Pending approvals", value: formatNumber(pendingOrgApprovals), helpText: "Organizations awaiting review", icon: ListChecks, tone: "amber" },
    { label: "Total branches", value: formatNumber(totalBranches), helpText: "Across the platform", icon: Warehouse, tone: "violet" },
    { label: "Total users", value: formatNumber(totalUsers), helpText: "All organizations", icon: Users, tone: "slate" },
    { label: "Active subscriptions", value: formatNumber(activeSubscriptions), helpText: `${formatNumber(pendingSubscriptions)} pending approval`, icon: CreditCard, tone: "emerald" },
    { label: "Open support tickets", value: formatNumber(openSupportTickets), helpText: "Needs attention", icon: Ticket, tone: "rose" },
    { label: "Pending payments", value: formatNumber(pendingPayments), helpText: "Awaiting reconciliation", icon: FileClock, tone: "slate" },
  ];

  // --- Top organizations by revenue (live) ---
  const topOrgsRaw = pick<any[]>(p, ["top_organizations_by_revenue"], []);
  const revenueByOrg = (Array.isArray(topOrgsRaw) ? topOrgsRaw : [])
    .map((o: any) => ({
      name: pick<string>(o, ["name", "organization_name", "org_name"], "Organization"),
      value: Number(pick<number>(o, ["revenue", "total_revenue", "monthly_revenue", "amount"], 0)),
    }))
    .filter((o) => o.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // --- Organizations by type (derived from the live tenant list) ---
  const orgsByType = groupCount(organizations, (o) =>
    titleCase(pick<string>(o, ["type", "organization_type", "organization_type_name"], "Healthcare"))
  );

  // --- Organizations by status (derived from the live tenant list) ---
  const orgsByStatus = groupCount(organizations, (o) => {
    const s = String(pick<string>(o, ["status"], "active")).toLowerCase();
    if (s === "") return "Active";
    return titleCase(s);
  });

  // --- Users by role & status (live) ---
  const usersByRole = groupCount(users, resolveRoleLabel, 7);
  const usersByStatus = groupCount(users, (u) => {
    const status = pick<string | boolean>(u, ["status", "is_active"], "");
    if (typeof status === "boolean") return status ? "Active" : "Inactive";
    const s = String(status).toLowerCase();
    if (s === "") return "Active";
    return titleCase(s);
  });

  // --- Support tickets by priority & status (live) ---
  const ticketsByPriority = groupCount(tickets, (t) => titleCase(pick<string>(t, ["priority"], "Normal")));
  const ticketsByStatus = groupCount(tickets, (t) => titleCase(pick<string>(t, ["status"], "Open")));

  // --- Subscription status mix (live counts) ---
  const subscriptionMix = [
    { name: "Active", value: activeSubscriptions },
    { name: "Pending", value: pendingSubscriptions },
  ].filter((s) => s.value > 0);

  // --- Platform composition (live counts side-by-side) ---
  const platformComposition = [
    { name: "Organizations", value: organizationsTotal },
    { name: "Branches", value: totalBranches },
    { name: "Users", value: totalUsers },
    { name: "Active subs", value: activeSubscriptions },
    { name: "Open tickets", value: openSupportTickets },
  ].filter((d) => d.value > 0);

  // --- Payments (canonical feed) ---
  const payments: any[] = Array.isArray(paymentsQuery.data) ? paymentsQuery.data : [];

  const paymentOrgName = (pay: any): string =>
    pay?.organization?.name ??
    pick<string>(pay, ["organization_name", "org_name", "business_name", "name"], "Unknown organization");
  const paymentAmount = (pay: any): number => Number(pick<number>(pay, ["amount", "total", "total_amount"], 0));

  // --- Payments by plan (which subscription tiers orgs pay for) ---
  const paymentsByPlan = groupCount(payments, (pay) =>
    titleCase(pay?.subscription?.plan_name ?? pick<string>(pay, ["plan_name", "plan"], "Unknown"))
  );

  // --- Top paying organizations (summed payment amount per org) ---
  const revenuePerOrg: Record<string, number> = {};
  for (const pay of payments) {
    const org = paymentOrgName(pay);
    revenuePerOrg[org] = (revenuePerOrg[org] || 0) + paymentAmount(pay);
  }
  const topPayingOrgs = Object.entries(revenuePerOrg)
    .map(([name, value]) => ({ name, value }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  // --- Recent activity lists (live) ---
  const recentOrganizations = pick<any[]>(p, ["recent_organizations", "recent_orgs"], []);
  // Prefer the canonical payments feed (has org name); fall back to the
  // dashboard payload's recent_payments only if the feed is empty.
  const recentPayments = payments.length > 0 ? payments : pick<any[]>(p, ["recent_payments"], []);

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-50/60 to-transparent">
      {/* Header */}
      <div className="flex flex-col gap-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Badge className="gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              System Online
            </Badge>
            <Badge className="border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-50">Platform Control</Badge>
          </div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-slate-900">
            Welcome back, {greetingName} 👋
          </h1>
          <p className="mt-1 font-medium text-slate-500">
            Platform-wide visibility across every organization, branch, user, and payment.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 px-4 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Today</p>
          <p className="mt-1 text-sm font-bold text-slate-900">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </div>

      {platformQuery.isError && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600" />
          <p className="text-sm font-medium text-rose-700">
            Couldn't load live platform data. Check your connection to the API server.
          </p>
        </div>
      )}

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} kpi={kpi} />
        ))}
      </div>

      {/* Row 1: Top orgs by revenue + orgs by type */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ChartCard className="xl:col-span-2" title="Top Organizations by Revenue" subtitle="Highest earning tenants this cycle">
          {(revenueByOrg.length > 0 ? revenueByOrg : topPayingOrgs).length > 0 ? (
            <CategoryBarH data={revenueByOrg.length > 0 ? revenueByOrg : topPayingOrgs} formatValue={formatCurrency} />
          ) : (
            <EmptyChart message={paymentsQuery.isLoading ? "Loading revenue…" : "No revenue data reported by the platform yet."} />
          )}
        </ChartCard>

        <ChartCard title="Organizations by Type" subtitle="Distribution across the platform">
          {orgsByType.length > 0 ? (
            <CategoryDonut data={orgsByType} centerLabel="Orgs" />
          ) : (
            <EmptyChart message={orgsQuery.isLoading ? "Loading organizations…" : "No organizations loaded yet."} />
          )}
        </ChartCard>
      </div>

      {/* Row 2: Users by role + orgs by status + users by status */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ChartCard title="Users by Role" subtitle="Distribution across all organizations">
          {usersByRole.length > 0 ? (
            <CategoryColumn data={usersByRole} />
          ) : (
            <EmptyChart message={usersQuery.isLoading ? "Loading users…" : "No users loaded yet."} />
          )}
        </ChartCard>

        <ChartCard title="Organizations by Status" subtitle="Active, pending, and inactive tenants">
          {orgsByStatus.length > 0 ? (
            <CategoryDonut data={orgsByStatus} colors={["#10b981", "#f59e0b", "#94a3b8", "#ef4444"]} centerLabel="Orgs" />
          ) : (
            <EmptyChart message={orgsQuery.isLoading ? "Loading organizations…" : "No organizations loaded yet."} />
          )}
        </ChartCard>

        <ChartCard title="Users by Status" subtitle="Active vs inactive accounts">
          {usersByStatus.length > 0 ? (
            <CategoryDonut data={usersByStatus} colors={["#10b981", "#94a3b8", "#f59e0b", "#ef4444"]} centerLabel="Users" />
          ) : (
            <EmptyChart message={usersQuery.isLoading ? "Loading users…" : "No users loaded yet."} />
          )}
        </ChartCard>
      </div>

      {/* Row 3: Subscription status + support tickets by priority + by status */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ChartCard title="Subscription Status" subtitle="Active vs pending across the platform">
          {subscriptionMix.length > 0 ? (
            <CategoryDonut data={subscriptionMix} colors={["#10b981", "#f59e0b"]} centerLabel="Subs" />
          ) : (
            <EmptyChart message="No subscription data reported yet." />
          )}
        </ChartCard>

        <ChartCard title="Support Tickets by Priority" subtitle="Where attention is needed most">
          {ticketsByPriority.length > 0 ? (
            <CategoryColumn data={ticketsByPriority} />
          ) : (
            <EmptyChart message={ticketsQuery.isLoading ? "Loading tickets…" : "No support tickets reported."} />
          )}
        </ChartCard>

        <ChartCard title="Support Tickets by Status" subtitle="Open, in-progress, and resolved">
          {ticketsByStatus.length > 0 ? (
            <CategoryDonut data={ticketsByStatus} centerLabel="Tickets" />
          ) : (
            <EmptyChart message={ticketsQuery.isLoading ? "Loading tickets…" : "No support tickets reported."} />
          )}
        </ChartCard>
      </div>

      {/* Row 4: Payments by plan + platform composition */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ChartCard title="Payments by Plan" subtitle="Subscription tiers organizations pay for">
          {paymentsByPlan.length > 0 ? (
            <CategoryDonut data={paymentsByPlan} centerLabel="Payments" />
          ) : (
            <EmptyChart message={paymentsQuery.isLoading ? "Loading payments…" : "No payments reported yet."} />
          )}
        </ChartCard>

        <ChartCard className="xl:col-span-2" title="Platform Composition" subtitle="Live counts across every organization on the platform">
          {platformComposition.length > 0 ? (
            <CategoryBarH data={platformComposition} />
          ) : (
            <EmptyChart message="No platform counts reported yet." />
          )}
        </ChartCard>
      </div>

      {/* Recent activity lists (live) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border-slate-200/80 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="flex items-center justify-between text-[15px] font-black text-slate-900">
              <span>Recently Created Organizations</span>
              <Link to="/dashboard/organizations" className="text-sm font-semibold text-[#0aa9ad] hover:underline">View all</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {(Array.isArray(recentOrganizations) ? recentOrganizations : []).slice(0, 6).map((o: any, idx: number) => (
                <div key={pick(o, ["id"], idx)} className="flex items-center justify-between p-4 transition-colors hover:bg-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-slate-500">
                      <Building2 className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{pick<string>(o, ["name", "organization_name"], "Organization")}</p>
                      <p className="text-xs capitalize text-slate-500">{pick<string>(o, ["type", "organization_type"], "Healthcare")}</p>
                    </div>
                  </div>
                  <Badge
                    className={
                      String(pick(o, ["status"], "")).toLowerCase() === "pending"
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }
                  >
                    {pick<string>(o, ["status"], "Active")}
                  </Badge>
                </div>
              ))}
              {(!Array.isArray(recentOrganizations) || recentOrganizations.length === 0) && (
                <div className="p-10 text-center text-sm text-slate-500">
                  <Building2 className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                  No recent organizations reported.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200/80 bg-white shadow-sm">
          <CardHeader className="border-b border-slate-100 pb-3">
            <CardTitle className="flex items-center justify-between text-[15px] font-black text-slate-900">
              <span>Recent Payments</span>
              <Link to="/dashboard/payments" className="text-sm font-semibold text-[#0aa9ad] hover:underline">View all</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {(Array.isArray(recentPayments) ? recentPayments : []).slice(0, 6).map((pay: any, idx: number) => {
                const orgName = paymentOrgName(pay);
                const amount = paymentAmount(pay);
                const plan = pay?.subscription?.plan_name ?? pick<string>(pay, ["plan_name", "plan"], "");
                const status = String(pick<string>(pay, ["status"], "Pending"));
                const isApproved = ["approved", "settled", "paid", "completed"].includes(status.toLowerCase());
                return (
                  <div key={pick(pay, ["id"], idx)} className="flex items-center justify-between p-4 transition-colors hover:bg-slate-50">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-emerald-600">
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-900">{orgName}</p>
                        <p className="truncate text-xs text-slate-500">
                          {plan ? `${titleCase(plan)} · ` : ""}
                          <span className="font-semibold text-emerald-600 tabular-nums">{formatCurrency(amount)}</span>
                        </p>
                      </div>
                    </div>
                    <Badge
                      className={
                        isApproved
                          ? "shrink-0 border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "shrink-0 border-amber-200 bg-amber-50 text-amber-700"
                      }
                    >
                      {status}
                    </Badge>
                  </div>
                );
              })}
              {(!Array.isArray(recentPayments) || recentPayments.length === 0) && (
                <div className="p-10 text-center text-sm text-slate-500">
                  <Banknote className="mx-auto mb-2 h-6 w-6 text-slate-300" />
                  No recent payments reported.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
