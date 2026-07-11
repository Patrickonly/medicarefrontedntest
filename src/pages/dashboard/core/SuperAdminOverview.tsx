import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { formatCurrency } from '@/hooks/use-data';
import { SuperAdminOverviewSkeleton } from '@/components/shared/SuperAdminOverviewSkeleton';
import { useQuery } from '@tanstack/react-query';
import {
    Activity,
    ArrowRight,
    Building2,
    CreditCard,
    Filter,
    LayoutGrid,
    Network,
    Search,
    Ticket,
    Users,
} from 'lucide-react';
import { useMemo } from 'react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    XAxis,
    YAxis,
} from 'recharts';

const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(value);

export default function SuperAdminOverview() {
  const { user } = useAuth();

  const { data: dashboardData, isLoading: isLoadingKPIs } = useQuery({
    queryKey: ['super-admin-dashboard'],
    queryFn: async () => {
      try {
        const res = await api.get<{ success: boolean; data: any }>('/api/dashboard');
        return res.data;
      } catch (error) {
        return null;
      }
    },
  });

  const { data: orgsData, isLoading: isLoadingOrgs } = useQuery({
    queryKey: ['super-admin-organizations'],
    queryFn: async () => {
      try {
        const res = await api.get<{ success: boolean; data: any[] }>('/api/admin/organizations');
        return res.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const { data: orgTypesData, isLoading: isLoadingOrgTypes } = useQuery({
    queryKey: ['super-admin-organization-types'],
    queryFn: async () => {
      try {
        const res = await api.get<{ success: boolean; data: any[] }>('/api/organization-types');
        return res.data || [];
      } catch (error) {
        return [];
      }
    },
  });

  const { data: plansData, isLoading: isLoadingPlans } = useQuery({
    queryKey: ['super-admin-subscription-plans'],
    queryFn: async () => {
      try {
        return await api.get<any[]>('/api/admin/subscriptions/plans');
      } catch (error) {
        return [];
      }
    },
  });

  const {
    organizations_total = 0,
    active_organizations = 0,
    total_branches = 0,
    total_users = 0,
    active_subscriptions = 0,
    open_support_tickets = 0,
    top_organizations_by_revenue = [],
  } = dashboardData || {};

  const topOrgsData = useMemo(() => {
    if (Array.isArray(top_organizations_by_revenue) && top_organizations_by_revenue.length > 0) {
      return top_organizations_by_revenue.map((org) => ({
        name: org.name,
        revenue: Number(org.revenue) || 0,
      }));
    }
    return [];
  }, [top_organizations_by_revenue]);

  const orgTypeBreakdown = useMemo(() => {
    const types: any[] = Array.isArray(orgTypesData) ? orgTypesData : [];
    const orgs: any[] = Array.isArray(orgsData) ? orgsData : [];
    const countByTypeId = new Map<string, number>();
    orgs.forEach((org) => {
      const typeId = org.type?.id ? String(org.type.id) : org.organization_type_id ? String(org.organization_type_id) : null;
      if (!typeId) return;
      countByTypeId.set(typeId, (countByTypeId.get(typeId) || 0) + 1);
    });
    return types
      .map((type) => ({
        id: String(type.id),
        name: type.name,
        count: countByTypeId.get(String(type.id)) || 0,
      }))
      .sort((a, b) => b.count - a.count);
  }, [orgTypesData, orgsData]);

  const planBreakdown = useMemo(() => {
    const plans: any[] = Array.isArray(plansData) ? plansData : [];
    const orgs: any[] = Array.isArray(orgsData) ? orgsData : [];
    const countByPlanName = new Map<string, number>();
    orgs.forEach((org) => {
      const planName = org.subscription?.plan?.name || org.subscription?.plan_name;
      if (!planName) return;
      countByPlanName.set(planName, (countByPlanName.get(planName) || 0) + 1);
    });
    return plans.map((plan) => ({
      id: String(plan.id),
      name: plan.name,
      price: Number(plan.price) || 0,
      subscribers: countByPlanName.get(plan.name) || 0,
    }));
  }, [plansData, orgsData]);

  const statCards = [
    {
      title: 'Total Organizations',
      value: formatNumber(organizations_total),
      trend: `${active_organizations} Active`,
      icon: Building2,
      iconBg: 'bg-[#6D5DF6]',
      textColor: 'text-[#6D5DF6]',
    },
    {
      title: 'Active Subscriptions',
      value: formatNumber(active_subscriptions),
      trend: 'Across all plans',
      icon: CreditCard,
      iconBg: 'bg-[#22C55E]',
      textColor: 'text-[#22C55E]',
    },
    {
      title: 'Total Users',
      value: formatNumber(total_users),
      trend: 'Platform wide',
      icon: Users,
      iconBg: 'bg-[#3B82F6]',
      textColor: 'text-[#3B82F6]',
    },
    {
      title: 'Active Branches',
      value: formatNumber(total_branches),
      trend: 'Network reach',
      icon: Network,
      iconBg: 'bg-[#F59E0B]',
      textColor: 'text-[#F59E0B]',
    },
    {
      title: 'Support Tickets',
      value: formatNumber(open_support_tickets),
      trend: 'Awaiting response',
      icon: Ticket,
      iconBg: 'bg-[#EF4444]',
      textColor: 'text-[#EF4444]',
    },
  ];

  if (isLoadingKPIs || isLoadingOrgs || isLoadingOrgTypes || isLoadingPlans) {
    return <SuperAdminOverviewSkeleton />;
  }

  return (
    <div className="relative mx-auto min-h-full w-full space-y-6 overflow-hidden bg-background p-4 font-sans sm:p-6 lg:p-8">
      <div className="pointer-events-none absolute left-0 top-0 -z-10 h-[280px] w-full bg-gradient-to-b from-[#E9ECFF] to-transparent"></div>
      <div className="pointer-events-none absolute right-[-8%] top-[-10%] -z-10 h-[480px] w-[480px] rounded-full bg-[#6D5DF6]/8 blur-[120px]"></div>
      <div className="pointer-events-none absolute bottom-[-12%] left-[-8%] -z-10 h-[420px] w-[420px] rounded-full bg-[#22C55E]/8 blur-[120px]"></div>

      <div className="rounded-[2rem] border border-border/80 bg-card/80 p-6 shadow-[0_16px_45px_-24px_rgba(15,23,42,0.2)] backdrop-blur-xl sm:p-8">
        <div className="mb-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#6D5DF6]/15 bg-muted px-3 py-1 text-[12px] font-black uppercase tracking-[0.24em] text-[#6D5DF6]">
              <span className="h-2 w-2 rounded-full bg-[#6D5DF6]" />
              Super Admin Portal
            </div>
            <h1 className="text-3xl font-black leading-tight tracking-tight text-foreground sm:text-4xl">Platform Overview</h1>
            <p className="max-w-2xl text-[15px] font-medium text-muted-foreground">
              Welcome back, {(user as any)?.first_name || 'Admin'}. Monitor tenant growth, subscription health, and overall system performance in one place.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card/70 px-5 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition-all duration-300 hover:bg-card hover:shadow-md">
              <Activity size={18} className="text-[#6D5DF6]" />
              System Health
            </button>
            <button className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#6D5DF6] to-[#5B4BE0] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#6D5DF6]/25 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-[#6D5DF6]/30">
              Generate Report
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3 xl:grid-cols-5">
          {statCards.map((stat, idx) => (
            <div key={idx} className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[1.35rem] border border-border/70 bg-card/95 p-5 shadow-[0_10px_30px_-18px_rgba(15,23,42,0.2)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-24px_rgba(15,23,42,0.24)]">
              <div className="absolute right-[-10px] top-[-10px] h-24 w-24 rounded-full bg-gradient-to-br from-white/70 to-transparent blur-2xl transition-transform duration-700 group-hover:scale-150"></div>
              <div className="relative z-10 flex items-center justify-between">
                <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg ${stat.iconBg}`}>
                  <stat.icon size={22} strokeWidth={2.2} />
                </div>
                <div className="rounded-full bg-muted px-2.5 py-1">
                  <span className={`text-[11px] font-black uppercase tracking-[0.18em] ${stat.textColor}`}>{stat.trend}</span>
                </div>
              </div>
              <div className="relative z-10 mt-5">
                <h3 className="text-[28px] font-black leading-none tracking-tight text-foreground">{stat.value}</h3>
                <p className="mt-1 text-[14px] font-bold text-muted-foreground">{stat.title}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col rounded-[1.8rem] border border-border/80 bg-card/85 p-7 shadow-[0_10px_35px_-22px_rgba(15,23,42,0.2)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_20px_45px_-24px_rgba(15,23,42,0.24)] lg:col-span-1">
          <div className="mb-8 flex items-start justify-between">
            <div>
              <h3 className="text-xl font-black tracking-tight text-foreground">Top Organizations</h3>
              <p className="mt-1 text-[13px] font-semibold text-muted-foreground">Leading tenants by revenue</p>
            </div>
          </div>

          <div className="mt-auto h-[300px] w-full">
            {topOrgsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={topOrgsData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGrowthFull" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6D5DF6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#6D5DF6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" strokeOpacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600, fontFamily: 'Outfit' }} dy={15} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b', fontWeight: 600, fontFamily: 'Outfit' }} dx={-10} tickFormatter={(val) => `$${val}`} />
                  <RechartsTooltip cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '4 4' }} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontFamily: 'Outfit', fontWeight: 600 }} />
                  <Area type="monotone" dataKey="revenue" stroke="#6D5DF6" strokeWidth={4} fillOpacity={1} fill="url(#colorGrowthFull)" activeDot={{ r: 8, fill: '#6D5DF6', stroke: '#fff', strokeWidth: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center rounded-2xl border border-border bg-background/50 text-muted-foreground">
                <Building2 size={32} className="mb-2 text-slate-300" />
                <span className="text-[14px] font-bold text-foreground">No Revenue Data</span>
                <span className="mt-1 text-[13px] font-medium">Tenant sales data will appear here.</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col overflow-hidden rounded-[1.8rem] border border-border/80 bg-card/85 shadow-[0_10px_35px_-22px_rgba(15,23,42,0.2)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_20px_45px_-24px_rgba(15,23,42,0.24)] lg:col-span-2">
          <div className="flex flex-col justify-between gap-4 border-b border-border bg-card/60 p-7 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-xl font-black tracking-tight text-foreground">Organization Subscriptions</h3>
              <p className="mt-1 text-[13px] font-semibold text-muted-foreground">Manage tenant billing, active plans, and usage.</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="group relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-[#6D5DF6]" />
                <input
                  type="text"
                  placeholder="Search tenants..."
                  className="w-[220px] rounded-2xl border border-border bg-muted/60 py-2.5 pl-10 pr-4 text-[13px] font-bold outline-none transition-all focus:border-[#6D5DF6] focus:bg-card focus:ring-4 focus:ring-[#6D5DF6]/10"
                />
              </div>
              <button aria-label="Filter organizations" className="rounded-2xl border border-border bg-muted/60 p-2.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                <Filter size={18} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-background/80">
                  <th className="px-7 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-muted-foreground">Organization</th>
                  <th className="px-7 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-muted-foreground">Plan</th>
                  <th className="px-7 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-muted-foreground">Status</th>
                  <th className="px-7 py-4 text-[11px] font-black uppercase tracking-[0.22em] text-muted-foreground">Expiry Date</th>
                  <th className="px-7 py-4 text-right text-[11px] font-black uppercase tracking-[0.22em] text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orgsData && orgsData.length > 0 ? (
                  orgsData.slice(0, 5).map((org: any, i: number) => (
                    <tr key={org.id || i} className="transition-colors hover:bg-background/80 group">
                      <td className="px-7 py-5">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#6D5DF6]/20 bg-gradient-to-br from-[#6D5DF6]/10 to-[#6D5DF6]/5 text-lg font-black text-[#6D5DF6] shadow-sm transition-transform group-hover:scale-105">
                            {org.name?.charAt(0) || 'O'}
                          </div>
                          <div>
                            <p className="text-[15px] font-bold text-foreground">{org.name || 'Unknown Org'}</p>
                            <p className="mt-0.5 text-[12px] font-bold text-muted-foreground">{org.type?.name || 'Unspecified Type'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-7 py-5">
                        <div className="inline-flex items-center rounded-lg bg-muted px-3 py-1.5 text-[13px] font-bold text-slate-700">
                          {org.subscription?.plan?.name || org.subscription?.plan_name || 'No Plan'}
                        </div>
                      </td>
                      <td className="px-7 py-5">
                        <span className={`inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-[12px] font-black uppercase tracking-wide ${org.subscription?.status === 'ACTIVE' ? 'bg-[#22C55E]/10 text-[#22C55E]' : org.subscription?.status === 'PENDING_APPROVAL' ? 'bg-[#F59E0B]/10 text-[#F59E0B]' : 'bg-muted text-muted-foreground'}`}>
                          <div className={`h-2 w-2 rounded-full ${org.subscription?.status === 'ACTIVE' ? 'bg-[#22C55E]' : org.subscription?.status === 'PENDING_APPROVAL' ? 'bg-[#F59E0B] animate-pulse' : 'bg-muted-foreground'}`}></div>
                          {org.subscription?.status?.replace('_', ' ') || 'No Subscription'}
                        </span>
                      </td>
                      <td className="px-7 py-5">
                        <span className="text-[14px] font-bold text-muted-foreground">
                          {org.subscription?.end_date ? new Date(org.subscription.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </span>
                      </td>
                      <td className="px-7 py-5 text-right">
                        <button className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-[13px] font-bold text-slate-700 transition-all hover:-translate-x-1 hover:border-[#6D5DF6]/30 hover:bg-[#6D5DF6]/5 hover:text-[#6D5DF6] hover:shadow-sm">
                          Manage
                          <ArrowRight size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="bg-background/30 px-7 py-16 text-center">
                      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-card shadow-sm">
                        <Building2 size={28} className="text-slate-300" />
                      </div>
                      <p className="text-[16px] font-black text-foreground">No organizations found</p>
                      <p className="mx-auto mt-1 max-w-sm text-[14px] font-semibold text-muted-foreground">Platform data is empty or currently syncing with the database.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-center border-t border-border bg-background/50 p-5">
            <button className="inline-flex items-center gap-2 text-[14px] font-black text-[#6D5DF6] transition-colors hover:gap-3 hover:text-[#5B4BE0]">
              View All Organizations <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="flex flex-col rounded-[1.8rem] border border-border/80 bg-card/85 p-7 shadow-[0_10px_35px_-22px_rgba(15,23,42,0.2)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_20px_45px_-24px_rgba(15,23,42,0.24)]">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h3 className="text-xl font-black tracking-tight text-foreground">Organization Types</h3>
              <p className="mt-1 text-[13px] font-semibold text-muted-foreground">Tenant distribution across business types</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#6D5DF6]/10 text-[#6D5DF6]">
              <LayoutGrid size={20} />
            </div>
          </div>

          {orgTypeBreakdown.length > 0 ? (
            <div className="space-y-4">
              {orgTypeBreakdown.map((type, i) => {
                const pct = organizations_total ? Math.round((type.count / organizations_total) * 100) : 0;
                return (
                  <div key={type.id}>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-bold text-foreground">{type.name}</span>
                      <span className="font-semibold text-muted-foreground">{type.count} orgs · {pct}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: ['#6D5DF6', '#22C55E', '#3B82F6', '#F59E0B', '#EF4444'][i % 5] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-[200px] w-full flex-col items-center justify-center rounded-2xl border border-border bg-background/50 text-muted-foreground">
              <LayoutGrid size={32} className="mb-2 text-slate-300" />
              <span className="text-[14px] font-bold text-foreground">No Organization Types</span>
              <span className="mt-1 text-[13px] font-medium">Configure types to see the tenant breakdown.</span>
            </div>
          )}
        </div>

        <div className="flex flex-col rounded-[1.8rem] border border-border/80 bg-card/85 p-7 shadow-[0_10px_35px_-22px_rgba(15,23,42,0.2)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_20px_45px_-24px_rgba(15,23,42,0.24)]">
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h3 className="text-xl font-black tracking-tight text-foreground">Subscription Plans</h3>
              <p className="mt-1 text-[13px] font-semibold text-muted-foreground">Active plans and subscriber counts</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#22C55E]/10 text-[#22C55E]">
              <CreditCard size={20} />
            </div>
          </div>

          {planBreakdown.length > 0 ? (
            <div className="space-y-3">
              {planBreakdown.map((plan) => (
                <div key={plan.id} className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/50 px-4 py-3.5">
                  <div>
                    <p className="text-[14px] font-bold text-foreground">{plan.name}</p>
                    <p className="text-[12px] font-semibold text-muted-foreground">{formatCurrency(plan.price)} / month</p>
                  </div>
                  <div className="rounded-full bg-[#22C55E]/10 px-3 py-1.5">
                    <span className="text-[12px] font-black text-[#22C55E]">{plan.subscribers} subscriber{plan.subscribers === 1 ? '' : 's'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-[200px] w-full flex-col items-center justify-center rounded-2xl border border-border bg-background/50 text-muted-foreground">
              <CreditCard size={32} className="mb-2 text-slate-300" />
              <span className="text-[14px] font-bold text-foreground">No Subscription Plans</span>
              <span className="mt-1 text-[13px] font-medium">Set up plans to track platform revenue.</span>
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 z-10 mt-4 flex flex-col items-center justify-between gap-3 border-t border-border/70 bg-card/90 px-4 py-4 backdrop-blur-xl sm:flex-row sm:px-6">
        <p className="text-[13px] font-bold text-muted-foreground">© {new Date().getFullYear()} HealthCare+ Platform. All rights reserved.</p>
        <div className="flex items-center gap-2 rounded-lg border border-green-100 bg-green-50 px-3 py-1.5">
          <div className="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
          <p className="text-[12px] font-black uppercase tracking-wide text-green-700">Systems Operational</p>
        </div>
      </div>
    </div>
  );
}
