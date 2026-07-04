import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Banknote,
  Clock,
  Package,
  ShoppingCart,
  TrendingUp
} from "lucide-react";
import { Link } from "react-router-dom";
import AgrovetDashboardHome from "@/pages/dashboard/agrovet/AgrovetDashboardHome";

const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value);
const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-RW", {
    style: "currency",
    currency: "RWF",
    maximumFractionDigits: 0,
  }).format(value);

export default function DashboardHome() {
  const { user, organizationId, isAgrovetOrg } = useAuth();

  const { data: metrics, isLoading, isError } = useQuery({
    queryKey: ["dashboard-metrics", organizationId],
    queryFn: async () => {
      try {
        const res = await api.get<{ success: boolean; data: any }>(
          "/api/dashboard",
          organizationId ? { organizationId } : undefined
        );
        return res.data;
      } catch (error) {
        console.error("Failed to load dashboard metrics", error);
        // Return default data instead of failing completely
        return {
          sales_today: 0,
          purchases_today: 0,
          profit_today: 0,
          total_products: 0,
          low_stock_products: 0,
          expired_products: 0,
          top_selling_products: [],
          recent_sales: [],
        };
      }
    },
    // Agrovet orgs render an entirely separate dashboard (below) backed by
    // GET /api/agrovet/dashboard - don't also fire the generic /api/dashboard
    // query for them.
    enabled: !!user && !isAgrovetOrg,
  });

  if (isAgrovetOrg) {
    return <AgrovetDashboardHome />;
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8 bg-slate-50/30 min-h-[calc(100vh-4rem)]">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-32 rounded-full" />
            </div>
            <Skeleton className="h-10 w-64 md:w-96" />
            <Skeleton className="h-5 w-48 md:w-72" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-16 w-48 rounded-2xl" />
            <Skeleton className="h-16 w-32 rounded-2xl" />
          </div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3 w-full">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-8 w-32" />
                </div>
                <Skeleton className="h-12 w-12 rounded-2xl shrink-0" />
              </div>
            </div>
          ))}
        </div>

        {/* Alerts & Sales Skeleton */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 space-y-4">
            <Skeleton className="h-7 w-40 mb-2" />
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
          <div className="xl:col-span-2">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="divide-y divide-slate-100">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-4 flex justify-between items-center">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <div className="space-y-2 flex flex-col items-end">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    // If error, just show the empty state
  }

  const {
    sales_today = 0,
    purchases_today = 0,
    profit_today = 0,
    total_products = 0,
    low_stock_products = 0,
    expired_products = 0,
    top_selling_products = [],
    recent_sales = [],
  } = metrics || {};

  // Map API fields to what the UI expects
  const dailySales = sales_today;
  const monthlySales = 0; // Not provided in API
  const todaysPurchases = purchases_today;
  const totalProducts = total_products;
  const lowStockCount = low_stock_products;
  const expiredCount = expired_products;
  const expiringSoonCount = 0;
  const openShift = null;
  const recentSales = recent_sales;
  const orgInfo = {};

  const commandCards = [
    {
      label: "Daily Sales",
      value: formatCurrency(dailySales),
      icon: Banknote,
      tone: "emerald",
    },
    {
      label: "Monthly Sales",
      value: formatCurrency(monthlySales),
      icon: TrendingUp,
      tone: "blue",
    },
    {
      label: "Today's Purchases",
      value: formatCurrency(todaysPurchases),
      icon: ShoppingCart,
      tone: "violet",
    },
    {
      label: "Total Products",
      value: formatNumber(totalProducts),
      icon: Package,
      tone: "orange",
    },
  ];

  const alertCards = [
    { label: "Low Stock Items", count: lowStockCount, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
    { label: "Expired Batches", count: expiredCount, color: "text-red-600", bg: "bg-red-50 border-red-200" },
    { label: "Expiring < 30 Days", count: expiringSoonCount, color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
  ];

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8 bg-slate-50/30 min-h-[calc(100vh-4rem)]">
      {/* Header section */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
              System Online
            </Badge>
            <Badge className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50">
              {orgInfo?.type === "agrovet" ? "Agrovet Operations" : "Healthcare Operations"}
            </Badge>
          </div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-slate-900">
            Welcome back, {user?.first_name || user?.firstName || "User"} 👋
          </h1>
          <p className="mt-1 font-medium text-slate-500">
            Here's what's happening with {orgInfo?.name || "your organization"} today.
          </p>
        </div>

        <div className="flex gap-3">
          {openShift ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm flex items-center gap-3">
              <div className="bg-emerald-100 p-2 rounded-lg">
                <Clock className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600/80">
                  Active Shift
                </p>
                <p className="mt-0.5 text-sm font-black text-emerald-900">
                  Opened {new Date(openShift.openedAt || openShift.opened_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 shadow-sm flex items-center gap-3">
              <div className="bg-rose-100 p-2 rounded-lg">
                <Clock className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600/80">
                  No Active Shift
                </p>
                <Link to="/dashboard/shifts" className="mt-0.5 text-sm font-black text-rose-900 hover:underline">
                  Open Shift Now &rarr;
                </Link>
              </div>
            </div>
          )}
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Today
            </p>
            <p className="mt-1 text-sm font-bold text-slate-900">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {commandCards.map((card) => {
          const toneClasses: Record<string, string> = {
            blue: "bg-blue-50 text-blue-700 border-blue-200",
            emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
            orange: "bg-orange-50 text-orange-700 border-orange-200",
            rose: "bg-rose-50 text-rose-700 border-rose-200",
            violet: "bg-violet-50 text-violet-700 border-violet-200",
          };
          return (
            <Card key={card.label} className="border-slate-200 bg-white shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">{card.label}</p>
                    <p className="mt-3 text-2xl font-black text-slate-950">{card.value}</p>
                  </div>

                  <div className={`rounded-2xl border p-3 ${toneClasses[card.tone]}`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Alerts & Recent Sales */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Alerts */}
        <div className="xl:col-span-1 space-y-4">
          <h2 className="text-lg font-black text-slate-900">Inventory Alerts</h2>
          {alertCards.map((alert, idx) => (
            <div key={idx} className={`rounded-2xl border p-4 flex items-center justify-between ${alert.bg}`}>
              <div className="flex items-center gap-3">
                <AlertTriangle className={`h-5 w-5 ${alert.color}`} />
                <span className={`font-bold ${alert.color}`}>{alert.label}</span>
              </div>
              <span className={`text-xl font-black ${alert.color}`}>{alert.count}</span>
            </div>
          ))}
        </div>

        {/* Recent Sales List */}
        <Card className="border-slate-200 bg-white shadow-sm xl:col-span-2">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-black text-slate-950 flex justify-between items-center">
              <span>Recent Sales</span>
              <Link to="/dashboard/pos" className="text-sm text-[#0aa9ad] hover:underline">New Sale</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {recentSales.map((sale: any, idx: number) => (
                <div key={idx} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{sale.invoiceNumber || sale.invoice_number || sale.ebmReceiptNo || sale.ebm_receipt_no || (sale.id && sale.id.split('-')[0].toUpperCase())}</p>
                    <p className="text-xs text-slate-500">{new Date(sale.timestamp || sale.createdAt || sale.created_at || new Date()).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600 text-sm">{formatCurrency(sale.totalAmount || sale.total_amount || sale.total || 0)}</p>
                    <p className="text-xs font-semibold text-slate-500 uppercase">{sale.paymentMethod || sale.payment_method}</p>
                  </div>
                </div>
              ))}
              {recentSales.length === 0 && (
                <div className="p-8 text-center text-slate-500">
                  No sales recorded yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

