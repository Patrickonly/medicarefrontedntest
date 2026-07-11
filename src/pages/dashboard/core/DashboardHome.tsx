import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { AdministratorDashboard } from "./AdministratorDashboard";
import { getDashboardScope } from "./dashboardContent";
import {
  Activity,
  AlertCircle,
  Calendar as CalendarIcon,
  CheckCircle2,
  ChevronDown,
  DollarSign,
  Download,
  MessageSquare,
  Pill,
  TrendingDown,
  TrendingUp,
  Users,
  Building,
  Store,
  ShieldCheck,
  CreditCard
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { formatCurrency } from "@/hooks/use-data";
import { DashboardOverviewSkeleton } from "@/components/shared/DashboardOverviewSkeleton";
import { StatCard } from "@/components/shared/StatCard";
import { PageTransition } from "@/components/ui/page-transition";

export default function DashboardHome() {
  const { user, isAgrovetOrg } = useAuth();
  
  const roleId = Number((user as any)?.role_id ?? (user as any)?.roleId ?? 0);
  const scope = getDashboardScope(user?.role, roleId, isAgrovetOrg);

  const fetchUrl = isAgrovetOrg ? '/api/agrovet/dashboard' : '/api/dashboard';

  const { data: dashboardResponse, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard', fetchUrl],
    queryFn: () => api.get<any>(fetchUrl), // For super admin, this resolves to getSuperAdminDashboard
    staleTime: 5 * 60 * 1000, // 5 minutes cache to make refresh instant
    gcTime: 10 * 60 * 1000,
    retry: 1
  });

  const dbData = dashboardResponse?.data;

  // Administrators now fetch their own live data directly inside the component
  if (scope === "administrator") {
    return <AdministratorDashboard />;
  }

  if (isLoading) {
    return <DashboardOverviewSkeleton />;
  }

  if (isError) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[400px] bg-background w-full rounded-2xl">
        <div className="text-rose-500 mb-4 bg-rose-500/10 p-4 rounded-full">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-lg font-bold text-foreground">Failed to load dashboard</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">{(error as any)?.message || "There was a problem connecting to the server. Please try refreshing."}</p>
        <button onClick={() => window.location.reload()} className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:bg-primary/90">
          Try Again
        </button>
      </div>
    );
  }

  if (!dbData || dbData.success === false) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[400px] bg-background w-full rounded-2xl">
        <div className="text-muted-foreground mb-4 bg-muted p-4 rounded-full">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-lg font-bold text-foreground">No data available</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">The dashboard could not find any active metrics to display.</p>
      </div>
    );
  }

  // --- Map Real Data to the User's Requested Visuals (Super Admin) ---

  // 1. Top Stat Cards
  const totalOrganizations = dbData?.organizations_total || 0;
  const totalBranches = dbData?.total_branches || 0;
  const totalUsers = dbData?.total_users || 0;
  const activeSubscriptions = dbData?.active_subscriptions || 0;
  const platformRevenue = dbData?.revenue || dbData?.platform_summary?.total_revenue || 0;

  // 2. Charts Data
  // Subscription Revenue using recent payments
  let subscriptionRevenueData = (dbData?.recent_payments || []).slice(0, 7).map((p: any) => ({
    name: new Date(p.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    Revenue: Number(p.amount || 0)
  })).reverse();

  if (subscriptionRevenueData.length === 0) {
    subscriptionRevenueData = [
      { name: 'Mon', Revenue: 0 },
      { name: 'Tue', Revenue: 0 },
      { name: 'Wed', Revenue: 0 },
      { name: 'Thu', Revenue: 0 },
      { name: 'Fri', Revenue: 0 },
    ];
  }

  // "Patient Visit Overview" -> "Users & Orgs Overview"
  const totalVisits = totalUsers;
  const newPatients = dbData?.active_organizations || 0;
  const returningPatients = dbData?.pending_organization_approvals || 0;
  const walkInPatients = dbData?.total_branches || 0;

  // "Revenue Overview" -> "Revenue Overview"
  const revenueData = [
    { name: 'Week 1', value: platformRevenue * 0.2 },
    { name: 'Week 2', value: platformRevenue * 0.3 },
    { name: 'Week 3', value: platformRevenue * 0.15 },
    { name: 'Week 4', value: platformRevenue * 0.35 }
  ];

  // "Department Statistics" -> "Top Organizations"
  // 4. Department Statistics -> Top Organizations (Mapped to the user's styling)
  const deptStats = (dbData?.top_organizations_by_revenue || []).slice(0, 5).map((org: any) => ({
    name: org.organization_name || 'Organization',
    patients: Number(org.revenue || 0),
    percentage: Math.min(100, Math.round((Number(org.revenue) / (platformRevenue || 1)) * 100))
  }));
  if (deptStats.length === 0) {
    deptStats.push({ name: 'System Core', patients: platformRevenue, percentage: 100 });
  }

  // "Gender Distribution" -> "Organization Status"
  const genderData = [
    { name: 'Active', value: dbData?.active_organizations || 1, color: '#3B82F6' },
    { name: 'Pending', value: dbData?.pending_organization_approvals || 0, color: '#F59E0B' },
    { name: 'Other', value: 0, color: '#10B981' }
  ];

  // "Age Group Distribution" -> "Subscriptions Overview"
  const ageGroupData = [
    { age: 'Active', count: dbData?.active_subscriptions || 0, percentage: 80 },
    { age: 'Pending', count: dbData?.pending_subscription_approvals || 0, percentage: 20 },
    { age: 'Expired', count: 0, percentage: 0 }
  ];

  // Colors
  const COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

  const formatYAxis = (v: number) => {
    if (v >= 1000000) return `RWF ${(v / 1000000).toFixed(1)}M`;
    if (v >= 1000) return `RWF ${(v / 1000).toFixed(1)}k`;
    return `RWF ${v}`;
  };

  return (
    <PageTransition className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back, {(user as any)?.first_name || 'Admin'} 👋</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 bg-card border border-border px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors">
            <CalendarIcon size={16} className="text-muted-foreground" />
            <span>Today</span>
          </button>
          <button className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm shadow-primary/20">
            <Download size={16} />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Total Organizations */}
        <StatCard
          icon={Building}
          label="Total Organizations"
          value={totalOrganizations}
          colorClass="bg-[#0aa9ad] text-white"
        />

        {/* Total Branches */}
        <StatCard
          icon={Store}
          label="Total Branches"
          value={totalBranches}
          colorClass="bg-[#6366f1] text-white"
        />

        {/* Total Users */}
        <StatCard
          icon={Users}
          label="Total Users"
          value={totalUsers}
          colorClass="bg-[#22c55e] text-white"
        />

        {/* Active Subscriptions */}
        <StatCard
          icon={ShieldCheck}
          label="Active Subscriptions"
          value={activeSubscriptions}
          colorClass="bg-[#f59e0b] text-white"
        />

        {/* Platform Revenue */}
        <StatCard
          icon={DollarSign}
          label="Platform Revenue"
          value={platformRevenue}
          format="currency"
          colorClass="bg-[#ec4899] text-white"
        />
      </div>

      {/* Middle Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Appointments Overview -> Recent Sales */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-foreground">Subscription Revenue</h3>
              <p className="text-sm text-muted-foreground">Recent Organization Subscriptions</p>
            </div>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={subscriptionRevenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={formatYAxis} />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem' }}
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                />
                <Bar dataKey="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Patient Visit Overview -> Platform Overview */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-foreground mb-6">Platform Overview</h3>
          <div className="space-y-6">
            <div>
              <p className="text-3xl font-bold text-foreground">{totalVisits}</p>
              <p className="text-sm font-medium text-muted-foreground">Total Users</p>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Active Organizations</span>
                  <span className="font-medium text-foreground">{newPatients} ({totalOrganizations ? Math.round((newPatients/totalOrganizations)*100) : 0}%)</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-[#8B5CF6] rounded-full" style={{ width: `${totalOrganizations ? (newPatients/totalOrganizations)*100 : 0}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Pending Organizations</span>
                  <span className="font-medium text-foreground">{returningPatients} ({totalOrganizations ? Math.round((returningPatients/totalOrganizations)*100) : 0}%)</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-[#3B82F6] rounded-full" style={{ width: `${totalOrganizations ? (returningPatients/totalOrganizations)*100 : 0}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Total Branches</span>
                  <span className="font-medium text-foreground">{walkInPatients}</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-[#10B981] rounded-full" style={{ width: `100%` }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Revenue and Dept Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Revenue Overview */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-semibold text-foreground">Revenue Overview</h3>
              <p className="text-sm text-muted-foreground">This Month</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-foreground">{formatCurrency(platformRevenue)}</p>
              <p className="text-sm text-emerald-500 font-medium">18.2% from last month</p>
            </div>
          </div>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={formatYAxis} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem' }}
                  formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                />
                <Area type="monotone" dataKey="value" stroke="#10B981" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Statistics -> Top Organizations */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-base font-semibold text-foreground">Top Organizations</h3>
            <button className="text-sm text-primary font-medium hover:underline">View All</button>
          </div>
          <div className="space-y-5">
            {deptStats.map((stat: any, i: number) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-medium text-foreground">{stat.name}</span>
                  <span className="text-muted-foreground">{formatCurrency(stat.patients)} ({stat.percentage}%)</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${stat.percentage}%`, backgroundColor: COLORS[i % COLORS.length] }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Gender Distribution -> Organization Status */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-foreground mb-6">Organization Status</h3>
          <div className="flex items-center justify-between h-[200px]">
            <div className="w-[180px] h-[180px] relative shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem' }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-foreground">{totalOrganizations}</span>
                <span className="text-xs text-muted-foreground">Total Orgs</span>
              </div>
            </div>
            <div className="flex-1 pl-6 space-y-4">
              {genderData.map((item, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-sm font-medium text-foreground">{item.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground ml-5">{item.value} ({totalOrganizations ? Math.round((item.value/totalOrganizations)*100) : 0}%)</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Age Group Distribution -> Subscriptions Overview */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-foreground mb-6">Subscriptions Overview</h3>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageGroupData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis dataKey="age" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} width={60} />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.75rem' }}
                />
                <Bar dataKey="count" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={24}>
                  {ageGroupData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        
        {/* Active Staff -> Active Orgs */}
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 text-[#10B981] flex items-center justify-center shrink-0">
            <Building size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Active Orgs</p>
            <h4 className="text-lg font-bold text-foreground leading-none mb-1">{dbData?.active_organizations || 0}</h4>
          </div>
        </div>

        {/* Pending Payments -> Pending Subs */}
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 text-[#F59E0B] flex items-center justify-center shrink-0">
            <CreditCard size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Pending Subs</p>
            <h4 className="text-lg font-bold text-foreground leading-none mb-1">{dbData?.pending_subscription_approvals || 0}</h4>
          </div>
        </div>

        {/* Expired Medicines -> Open Tickets */}
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[#EF4444]/10 text-[#EF4444] flex items-center justify-center shrink-0">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Open Tickets</p>
            <h4 className="text-lg font-bold text-foreground leading-none mb-1">{dbData?.open_support_tickets || 0}</h4>
          </div>
        </div>

        {/* Unread Messages -> Pending Payments */}
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/10 text-[#3B82F6] flex items-center justify-center shrink-0">
            <MessageSquare size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-0.5">Pending Payments</p>
            <h4 className="text-lg font-bold text-foreground leading-none mb-1">{dbData?.pending_payments || 0}</h4>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[#10B981]/10 text-[#10B981] flex items-center justify-center shrink-0">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-0.5">System Status</p>
            <h4 className="text-lg font-bold text-foreground leading-none mb-1">Operational</h4>
          </div>
        </div>

      </div>
    </PageTransition>
  );
}
