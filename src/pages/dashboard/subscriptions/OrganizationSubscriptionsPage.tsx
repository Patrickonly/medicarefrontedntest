import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { format } from "date-fns";
import {
  Building2, Crown, CalendarDays, Clock, ShieldCheck, AlertTriangle, Loader2, Search, FileText,
} from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageTransition } from "@/components/ui/page-transition";

interface OrgSubscription {
  organizationId: string;
  organizationName: string;
  plan: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  remainingDays: number;
  isActive: boolean;
  paymentStatus: string | null;
  paymentMethod: string | null;
}

const statusConfig: Record<string, { bg: string; text: string; dot: string }> = {
  ACTIVE: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
  INACTIVE: { bg: "bg-slate-100 dark:bg-slate-800/40", text: "text-slate-600 dark:text-slate-400", dot: "bg-slate-400" },
  EXPIRED: { bg: "bg-rose-50 dark:bg-rose-900/20", text: "text-rose-700 dark:text-rose-400", dot: "bg-rose-500" },
  PENDING_APPROVAL: { bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
  TRIAL: { bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-500" },
  CANCELLED: { bg: "bg-rose-50 dark:bg-rose-900/20", text: "text-rose-600 dark:text-rose-400", dot: "bg-rose-400" },
};

function getStatusStyle(status: string) {
  return statusConfig[status] || statusConfig.INACTIVE;
}

function getRemainingColor(days: number) {
  if (days <= 0) return "text-rose-600 dark:text-rose-400";
  if (days <= 7) return "text-rose-500 dark:text-rose-400";
  if (days <= 30) return "text-amber-600 dark:text-amber-400";
  return "text-emerald-600 dark:text-emerald-400";
}

export default function OrganizationSubscriptionsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const orgIdFilter = searchParams.get("organizationId");
  const [search, setSearch] = useState("");

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ["admin-org-subscriptions"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: OrgSubscription[] }>("/api/admin/subscriptions/organizations");
      return res.data || [];
    },
  });

  const clearOrgFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete("organizationId");
    setSearchParams(next);
  };

  const filtered = orgIdFilter
    ? orgs.filter((o: OrgSubscription) => String(o.organizationId) === orgIdFilter)
    : search.trim()
    ? orgs.filter((o: OrgSubscription) => o.organizationName.toLowerCase().includes(search.toLowerCase()) || o.plan.toLowerCase().includes(search.toLowerCase()))
    : orgs;

  const totalActive = orgs.filter((o: OrgSubscription) => o.isActive).length;
  const totalExpired = orgs.filter((o: OrgSubscription) => !o.isActive && o.status !== "PENDING_APPROVAL").length;
  const totalPending = orgs.filter((o: OrgSubscription) => o.status === "PENDING_APPROVAL").length;

  return (
    <PageTransition>
      <div className="p-6 lg:p-8 space-y-8 max-w-[1400px] mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
              <Crown size={24} />
            </div>
            Organization Subscriptions
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Overview of all organizations' subscription plans, statuses, and remaining days.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-emerald-200 dark:border-emerald-800/30 bg-emerald-50/50 dark:bg-emerald-900/10">
            <CardContent className="pt-5 pb-4 px-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <ShieldCheck className="text-emerald-600 dark:text-emerald-400" size={24} />
              </div>
              <div>
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">{totalActive}</p>
                <p className="text-sm font-semibold text-emerald-600/80 dark:text-emerald-500/80">Active Subscriptions</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-rose-200 dark:border-rose-800/30 bg-rose-50/50 dark:bg-rose-900/10">
            <CardContent className="pt-5 pb-4 px-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
                <AlertTriangle className="text-rose-600 dark:text-rose-400" size={24} />
              </div>
              <div>
                <p className="text-2xl font-black text-rose-700 dark:text-rose-400">{totalExpired}</p>
                <p className="text-sm font-semibold text-rose-600/80 dark:text-rose-500/80">Expired / Inactive</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-200 dark:border-amber-800/30 bg-amber-50/50 dark:bg-amber-900/10">
            <CardContent className="pt-5 pb-4 px-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Clock className="text-amber-600 dark:text-amber-400" size={24} />
              </div>
              <div>
                <p className="text-2xl font-black text-amber-700 dark:text-amber-400">{totalPending}</p>
                <p className="text-sm font-semibold text-amber-600/80 dark:text-amber-500/80">Pending Approval</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search / Org Filter */}
        {orgIdFilter ? (
          <div className="inline-flex items-center gap-2 text-sm bg-muted/50 border border-border rounded-lg px-3 py-2">
            <span className="text-muted-foreground">
              Showing subscription for organization ID <span className="font-semibold text-foreground">{orgIdFilter}</span>
            </span>
            <Button variant="link" size="sm" className="h-auto p-0 text-primary font-semibold" onClick={clearOrgFilter}>
              View All Organizations
            </Button>
          </div>
        ) : (
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <Input
              placeholder="Search organizations or plans..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-12 rounded-xl bg-card border-border"
            />
          </div>
        )}

        {/* Organization Cards */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Building2 className="mx-auto h-12 w-12 mb-4 opacity-40" />
            <p className="text-lg font-semibold">No organizations found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filtered.map((org: OrgSubscription) => {
              const style = getStatusStyle(org.status);
              const daysColor = getRemainingColor(org.remainingDays);
              return (
                <Card key={org.organizationId} className="border-border hover:shadow-lg transition-shadow duration-300 overflow-hidden">
                  {/* Status bar at top */}
                  <div className={`h-1.5 w-full ${org.isActive ? 'bg-emerald-500' : org.status === 'PENDING_APPROVAL' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                  <CardHeader className="pb-3 pt-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <Building2 className="text-primary" size={20} />
                        </div>
                        <div>
                          <CardTitle className="text-base font-bold leading-tight">{org.organizationName}</CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">ID: {org.organizationId}</p>
                        </div>
                      </div>
                      <Badge className={`${style.bg} ${style.text} border-0 font-bold text-[10px] tracking-wider uppercase px-2.5 py-1`}>
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${style.dot} mr-1.5`} />
                        {org.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 pb-5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted/50 rounded-xl p-3">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Plan</p>
                        <p className="font-bold text-sm mt-0.5 flex items-center gap-1.5">
                          <Crown size={14} className="text-primary" />
                          {org.plan}
                        </p>
                      </div>
                      <div className="bg-muted/50 rounded-xl p-3">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Days Left</p>
                        <p className={`font-black text-lg mt-0.5 ${daysColor}`}>
                          {org.remainingDays}
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-muted/50 rounded-xl p-3">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Start</p>
                        <p className="font-semibold text-xs mt-0.5 flex items-center gap-1.5">
                          <CalendarDays size={12} className="text-muted-foreground" />
                          {org.startDate ? format(new Date(org.startDate), "MMM d, yyyy") : "N/A"}
                        </p>
                      </div>
                      <div className="bg-muted/50 rounded-xl p-3">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">End</p>
                        <p className="font-semibold text-xs mt-0.5 flex items-center gap-1.5">
                          <CalendarDays size={12} className="text-muted-foreground" />
                          {org.endDate ? format(new Date(org.endDate), "MMM d, yyyy") : "N/A"}
                        </p>
                      </div>
                    </div>
                    {(org.paymentMethod || org.paymentStatus) && (
                      <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                        <span className="text-muted-foreground font-medium">
                          Payment: <span className="font-bold text-foreground">{org.paymentMethod || 'N/A'}</span>
                        </span>
                        <span className="text-muted-foreground font-medium">
                          Status: <span className="font-bold text-foreground">{org.paymentStatus || 'N/A'}</span>
                        </span>
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full gap-1.5"
                      onClick={() => navigate(`/dashboard/payments?organizationId=${org.organizationId}${org.status === "PENDING_APPROVAL" ? "&status=PENDING" : ""}`)}
                    >
                      <FileText className="h-3.5 w-3.5" /> View Payments
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
