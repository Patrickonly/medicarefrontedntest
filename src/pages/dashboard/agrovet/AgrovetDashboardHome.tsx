import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Banknote,
  Bell,
  Boxes,
  Clock,
  CreditCard,
  Gauge,
  Package,
  ReceiptText,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-RW", {
    style: "currency",
    currency: "RWF",
    maximumFractionDigits: 0,
  }).format(value || 0);

const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value || 0);

interface StatCardDef {
  label: string;
  value: string;
  icon: any;
  tone: "blue" | "emerald" | "orange" | "rose" | "violet";
}

const toneClasses: Record<StatCardDef["tone"], string> = {
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
  orange: "bg-orange-50 text-orange-700 border-orange-200",
  rose: "bg-rose-50 text-rose-700 border-rose-200",
  violet: "bg-violet-50 text-violet-700 border-violet-200",
};

function StatCardsGrid({ cards }: { cards: StatCardDef[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
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
      ))}
    </div>
  );
}

function DashboardHeader({ subtitle, greetingName }: { subtitle: string; greetingName: string }) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">System Online</Badge>
          <Badge className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50">Agrovet Operations</Badge>
        </div>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight text-slate-900">
          Welcome back, {greetingName} 👋
        </h1>
        <p className="mt-1 font-medium text-slate-500">{subtitle}</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Today</p>
        <p className="mt-1 text-sm font-bold text-slate-900">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
        </p>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8 bg-slate-50/30 min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div className="space-y-3">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-32 rounded-full" />
          </div>
          <Skeleton className="h-10 w-64 md:w-96" />
          <Skeleton className="h-5 w-48 md:w-72" />
        </div>
        <Skeleton className="h-16 w-48 rounded-2xl" />
      </div>
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
    </div>
  );
}

function OwnerDashboard({ data, greetingName }: { data: any; greetingName: string }) {
  const cards = data?.cards || {};
  const statCards: StatCardDef[] = [
    { label: "Sales Today", value: formatCurrency(cards.sales_today), icon: Banknote, tone: "emerald" },
    { label: "Sales (30d)", value: formatCurrency(cards.sales_last_30d), icon: TrendingUp, tone: "blue" },
    { label: "Gross Profit (30d)", value: formatCurrency(cards.gross_profit_30d), icon: TrendingUp, tone: "violet" },
    { label: "Inventory Value", value: formatCurrency(cards.inventory_value), icon: Boxes, tone: "orange" },
  ];
  const alertCards = [
    { label: "Low Stock Alerts", count: cards.low_stock_alerts || 0, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
    { label: "Expiry Alerts", count: cards.expiry_alerts || 0, color: "text-red-600", bg: "bg-red-50 border-red-200" },
    { label: "Pending Discount Approvals", count: cards.pending_discount_approvals || 0, color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
    { label: "Overdue Credit Accounts", count: cards.overdue_credit_count || 0, color: "text-rose-600", bg: "bg-rose-50 border-rose-200" },
  ];

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8 bg-slate-50/30 min-h-[calc(100vh-4rem)]">
      <DashboardHeader greetingName={greetingName} subtitle="Here's your business overview for today." />
      <StatCardsGrid cards={statCards} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-1 space-y-4">
          <h2 className="text-lg font-black text-slate-900">Alerts &amp; Approvals</h2>
          {alertCards.map((alert) => (
            <div key={alert.label} className={`rounded-2xl border p-4 flex items-center justify-between ${alert.bg}`}>
              <div className="flex items-center gap-3">
                <AlertTriangle className={`h-5 w-5 ${alert.color}`} />
                <span className={`font-bold ${alert.color}`}>{alert.label}</span>
              </div>
              <span className={`text-xl font-black ${alert.color}`}>{alert.count}</span>
            </div>
          ))}
          <Link
            to="/dashboard/agrovet/alerts"
            className="block text-center rounded-2xl border border-slate-200 bg-white py-3 text-sm font-bold text-[#0aa9ad] hover:bg-slate-50 transition-colors"
          >
            View all alerts &rarr;
          </Link>
        </div>

        <Card className="border-slate-200 bg-white shadow-sm xl:col-span-2">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-black text-slate-950">Top Selling Products (30d)</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {(data?.top_selling_products || []).map((p: any, idx: number) => (
                <div key={idx} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                  <p className="font-bold text-slate-900 text-sm">{p.name || p.product_name}</p>
                  <p className="font-bold text-emerald-600 text-sm">{formatNumber(p.quantity_sold || p.units_sold || 0)} sold</p>
                </div>
              ))}
              {(!data?.top_selling_products || data.top_selling_products.length === 0) && (
                <div className="p-8 text-center text-slate-500">No sales recorded in the last 30 days.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base font-black text-slate-950">Sales by Cashier (30d)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-slate-100">
            {(data?.sales_by_cashier || []).map((s: any, idx: number) => (
              <div key={idx} className="p-4 flex justify-between items-center">
                <p className="font-bold text-slate-900 text-sm">{s.cashier_name || s.name || `Cashier ${idx + 1}`}</p>
                <p className="font-bold text-slate-700 text-sm">{formatCurrency(s.total_sales || s.total || 0)}</p>
              </div>
            ))}
            {(!data?.sales_by_cashier || data.sales_by_cashier.length === 0) && (
              <div className="p-8 text-center text-slate-500">No cashier activity recorded yet.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AccountantDashboard({ data, greetingName }: { data: any; greetingName: string }) {
  const cards = data?.cards || {};
  const statCards: StatCardDef[] = [
    { label: "Revenue (MTD)", value: formatCurrency(cards.revenue_mtd), icon: Banknote, tone: "emerald" },
    { label: "VAT Output (MTD)", value: formatCurrency(cards.vat_output_mtd), icon: ReceiptText, tone: "blue" },
    { label: "Expenses (MTD)", value: formatCurrency(cards.expenses_mtd), icon: TrendingUp, tone: "orange" },
    { label: "Accounts Payable", value: formatCurrency(cards.accounts_payable), icon: CreditCard, tone: "rose" },
  ];
  const secondaryCards: StatCardDef[] = [
    { label: "Accounts Receivable", value: formatCurrency(cards.accounts_receivable), icon: CreditCard, tone: "violet" },
    { label: "MoMo Received (MTD)", value: formatCurrency(cards.momo_received_mtd), icon: Banknote, tone: "emerald" },
    { label: "Bank Received (MTD)", value: formatCurrency(cards.bank_received_mtd), icon: Banknote, tone: "blue" },
    { label: "Overdue Accounts", value: formatNumber(cards.overdue_credit_count), icon: AlertTriangle, tone: "rose" },
  ];

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8 bg-slate-50/30 min-h-[calc(100vh-4rem)]">
      <DashboardHeader greetingName={greetingName} subtitle="Here's your finance overview for this month." />
      <StatCardsGrid cards={statCards} />
      <StatCardsGrid cards={secondaryCards} />

      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-rose-600" />
          <div>
            <p className="font-bold text-rose-700">Overdue Credit Total</p>
            <p className="text-sm text-rose-600">{cards.overdue_credit_count || 0} account(s) past due date</p>
          </div>
        </div>
        <p className="text-xl font-black text-rose-700">{formatCurrency(cards.overdue_credit_total)}</p>
      </div>
    </div>
  );
}

function CashierDashboard({ data, greetingName }: { data: any; greetingName: string }) {
  const cards = data?.cards || {};
  const shift = data?.shift;
  const department = data?.department === "VET" ? "Veterinary" : "Agro";

  const statCards: StatCardDef[] = [
    { label: "My Sales Today", value: formatCurrency(cards.my_sales_today), icon: Banknote, tone: "emerald" },
    { label: "My Sales Count", value: formatNumber(cards.my_sales_count_today), icon: ShoppingCart, tone: "blue" },
    { label: `${department} Low Stock`, value: formatNumber(cards.department_low_stock_count), icon: Package, tone: "orange" },
  ];

  return (
    <div className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8 bg-slate-50/30 min-h-[calc(100vh-4rem)]">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-50">System Online</Badge>
            <Badge className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-50">{department} Department</Badge>
          </div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-slate-900">
            Welcome back, {greetingName} 👋
          </h1>
          <p className="mt-1 font-medium text-slate-500">Here's your shift and sales overview for today.</p>
        </div>

        {shift ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 shadow-sm flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-lg">
              <Clock className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600/80">Active Shift</p>
              <p className="mt-0.5 text-sm font-black text-emerald-900">
                Opened {new Date(shift.opened_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 shadow-sm flex items-center gap-3">
            <div className="bg-rose-100 p-2 rounded-lg">
              <Clock className="w-5 h-5 text-rose-600" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-600/80">No Active Shift</p>
              <Link to="/dashboard/agrovet/shifts" className="mt-0.5 text-sm font-black text-rose-900 hover:underline">
                Open Shift Now &rarr;
              </Link>
            </div>
          </div>
        )}
      </div>

      <StatCardsGrid cards={statCards} />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-black text-slate-950">{department} Low Stock</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {(data?.department_low_stock || []).map((p: any, idx: number) => (
                <div key={idx} className="p-4 flex justify-between items-center">
                  <p className="font-bold text-slate-900 text-sm">{p.name}</p>
                  <p className="text-sm text-amber-600 font-semibold">{p.stock} left (reorder at {p.reorder_level})</p>
                </div>
              ))}
              {(!data?.department_low_stock || data.department_low_stock.length === 0) && (
                <div className="p-8 text-center text-slate-500">No low-stock items in your department.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3 border-b border-slate-100">
            <CardTitle className="text-base font-black text-slate-950 flex justify-between items-center">
              <span>My Recent Discount Requests</span>
              <Link to="/dashboard/agrovet/discounts" className="text-sm text-[#0aa9ad] hover:underline">View all</Link>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {(data?.my_recent_discount_requests || []).map((d: any) => (
                <div key={d.id} className="p-4 flex justify-between items-center">
                  <p className="text-sm text-slate-700">{new Date(d.created_at).toLocaleDateString()}</p>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{formatCurrency(d.amount)}</span>
                    <Badge
                      className={
                        d.status === "APPROVED"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : d.status === "REJECTED"
                            ? "border-rose-200 bg-rose-50 text-rose-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                      }
                    >
                      {d.status}
                    </Badge>
                  </div>
                </div>
              ))}
              {(!data?.my_recent_discount_requests || data.my_recent_discount_requests.length === 0) && (
                <div className="p-8 text-center text-slate-500">No discount requests yet.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function AgrovetDashboardHome() {
  const { user } = useAuth();
  const greetingName = (user as any)?.first_name || (user as any)?.firstName || "User";

  const { data, isLoading } = useQuery({
    queryKey: ["agrovet-dashboard"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any }>("/api/agrovet/dashboard");
      return res.data;
    },
    enabled: !!user,
  });

  if (isLoading) return <DashboardSkeleton />;

  const roleId = String(data?.role?.id || "");

  if (roleId === "14") return <AccountantDashboard data={data} greetingName={greetingName} />;
  if (roleId === "15" || roleId === "16") return <CashierDashboard data={data} greetingName={greetingName} />;
  return <OwnerDashboard data={data} greetingName={greetingName} />;
}
