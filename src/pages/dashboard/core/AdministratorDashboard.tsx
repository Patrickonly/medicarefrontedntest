import { useAuth } from "@/hooks/useAuth";
import { StatCard } from "@/components/shared/StatCard";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useMemo } from "react";
import { Loader2 } from "lucide-react";
import {
  Banknote, FileText, Receipt, BadgeDollarSign, Boxes, LineChart,
  ShoppingCart, Truck, AlertTriangle, Package, CalendarCheck2, BarChart3,
  Users, Warehouse, Ticket, PieChart as PieChartIcon, Tags, Layers,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, Legend, ComposedChart, Line
} from "recharts";
import { PageTransition } from "@/components/ui/page-transition";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

const toNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatMoney = (value: unknown): string => `RWF ${toNumber(value).toLocaleString()}`;

export function AdministratorDashboard() {
  const { user, organizationId } = useAuth();

  const subscription = (user as any)?.organization?.Subscription;
  const remainingDays = useMemo(() => {
    if (!subscription?.end_date || subscription?.status !== 'ACTIVE') return null;
    const diff = new Date(subscription.end_date).getTime() - new Date().getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 3600 * 24)));
  }, [subscription]);

  // Queries for Live Data
  const { data: sales = [], isLoading: isSalesLoading } = useQuery({
    queryKey: ["sales", organizationId],
    queryFn: async () => {
      const res = await api.get<{ data?: any[] }>("/api/sales");
      return Array.isArray(res) ? res : (res?.data || []);
    },
    enabled: !!organizationId,
  });

  const { data: expenses = [], isLoading: isExpensesLoading } = useQuery({
    queryKey: ["expenses", organizationId],
    queryFn: async () => {
      const res = await api.get<{ data?: any[] } | any[]>("/api/expenses");
      const raw = Array.isArray(res) ? res : (res?.data || []);
      // Each item comes back as { expense: { id, type, amount, note, createdAt } } —
      // normalize to the flat shape the rest of this dashboard expects.
      return raw.map((item: any) => {
        const e = item.expense || item;
        return {
          id: e.id,
          category: e.type || e.category,
          description: e.note || e.description,
          amount: e.amount,
          date: e.createdAt || e.date,
        };
      });
    },
    enabled: !!organizationId,
  });

  const { data: customers = [], isLoading: isCustomersLoading } = useQuery({
    queryKey: ["customers", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/customers");
      return Array.isArray(res) ? res : (res?.results || res?.data || []);
    },
    enabled: !!organizationId,
  });

  const { data: suppliers = [], isLoading: isSuppliersLoading } = useQuery({
    queryKey: ["suppliers", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/suppliers");
      return Array.isArray(res) ? res : (res?.results || res?.data || []);
    },
    enabled: !!organizationId,
  });

  const { data: productBatches = [], isLoading: isBatchesLoading } = useQuery({
    queryKey: ["product-batches", organizationId],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>("/api/product-batches");
      return res.data || [];
    },
    enabled: !!organizationId,
  });
  
  const { data: products = [], isLoading: isProductsLoading } = useQuery({
    queryKey: ["products", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/products");
      return Array.isArray(res) ? res : (res?.results || res?.data || []);
    },
    enabled: !!organizationId,
  });

  const { data: categories = [], isLoading: isCategoriesLoading } = useQuery({
    queryKey: ["categories", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/products/categories");
      return Array.isArray(res) ? res : (res?.data || []);
    },
    enabled: !!organizationId,
  });

  const { data: productTypes = [], isLoading: isProductTypesLoading } = useQuery({
    queryKey: ["product-types", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/products/types");
      return Array.isArray(res) ? res : (res?.data || []);
    },
    enabled: !!organizationId,
  });

  const { data: purchasesData = [], isLoading: isPurchasesLoading } = useQuery({
    queryKey: ["purchases", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/purchases");
      const raw = Array.isArray(res) ? res : ((res as any)?.data || []);
      // Each item comes back as { purchaseOrder: { id, supplierId, supplierName,
      // totalAmount, status, createdAt, items } } — unwrap to a flat shape.
      return raw.map((item: any) => item.purchaseOrder || item);
    },
    enabled: !!organizationId,
  });

  const { data: shifts = [], isLoading: isShiftsLoading } = useQuery({
    queryKey: ["shifts", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/shifts");
      return Array.isArray(res) ? res : (res?.data || []);
    },
    enabled: !!organizationId,
  });

  // Derived Data
  const {
    revenue, expensesTotal, purchases, creditExposure, stockValue, netCashFlow,
    salesToday, purchasesToday, totalProducts, totalStockUnits, lowStockProducts,
    expiredProducts, expiringSoonProducts, recentSales, trendData,
    branchPerformance, topSellingProducts, staffPerformance, lowStockAlerts,
    categoryStats, typeStats, purchasesTrend, topCustomers, topSuppliers, recentShifts
  } = useMemo(() => {
    let rev = 0;
    let revToday = 0;
    const now = new Date();
    
    // Sort and calculate sales
    const sortedSales = [...sales].sort((a: any, b: any) => 
      new Date(b.timestamp || b.created_at || 0).getTime() - new Date(a.timestamp || a.created_at || 0).getTime()
    );

    sortedSales.forEach(s => {
      const amt = toNumber(s.totalAmount ?? s.total_amount ?? s.total);
      rev += amt;
      const d = new Date(s.timestamp || s.created_at || 0);
      if (d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        revToday += amt;
      }
    });

    // Expenses
    let exp = 0;
    expenses.forEach(e => {
      exp += toNumber(e.amount);
    });

    // Purchases
    let totalPurchases = 0;
    let purchToday = 0;
    const purchTrend = [];
    
    // Calculate purchases trends
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateString = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      
      const dayPurchases = purchasesData.filter(p => {
        const pd = new Date(p.createdAt || p.orderDate || p.order_date || p.created_at || 0);
        return pd.getDate() === d.getDate() && pd.getMonth() === d.getMonth();
      });
      const dayTotal = dayPurchases.reduce((sum, p) => sum + toNumber(p.totalAmount ?? p.total_amount ?? p.total), 0);
      purchTrend.push({ date: dateString, amount: dayTotal });
    }
    
    purchasesData.forEach(p => {
       const amt = toNumber(p.totalAmount ?? p.total_amount ?? p.total);
       totalPurchases += amt;
       const pd = new Date(p.orderDate || p.order_date || p.created_at || 0);
       if (pd.getDate() === now.getDate() && pd.getMonth() === now.getMonth() && pd.getFullYear() === now.getFullYear()) {
         purchToday += amt;
       }
    });

    // Stock & Products
    let stockVal = 0;
    let units = 0;
    let low = 0;
    let expired = 0;
    let expiring = 0;
    const lowStockList: any[] = [];
    
    productBatches.forEach(b => {
      const qty = toNumber(b.quantityRemaining ?? b.quantity_remaining);
      const cost = toNumber(b.unitCost ?? b.unit_cost);
      stockVal += (qty * cost);
      units += qty;
      
      const expDate = new Date(b.expirationDate ?? b.expiration_date ?? 0);
      const diffDays = (expDate.getTime() - now.getTime()) / (1000 * 3600 * 24);
      
      if (qty > 0 && diffDays < 0) expired++;
      else if (qty > 0 && diffDays <= 30) expiring++;
    });

    products.forEach(p => {
      // Match InventoryPage's convention: a product without an explicit
      // reorder level still needs a real threshold (10), not 0 - otherwise
      // "low stock" only ever fires once a product hits zero.
      const reorder = toNumber(p.reorderLevel ?? p.reorder_level ?? 10);
      const productBatchesForP = productBatches.filter(b => b.productId === p.id || b.product_id === p.id);
      const currentStock = productBatchesForP.reduce((sum, b) => sum + toNumber(b.quantityRemaining ?? b.quantity_remaining), 0);

      if (currentStock <= reorder) {
        low++;
        lowStockList.push({ productName: p.name, reorderLevel: reorder, currentStock });
      }
    });

    // Credit Exposure
    let credit = customers.reduce((sum, c) => sum + toNumber(c.outstandingBalance ?? c.outstanding_balance ?? c.balance), 0);

    // Trend Data (Last 30 Days)
    const trends = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateString = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      
      const daySales = sales.filter(s => {
        const sd = new Date(s.timestamp || s.created_at);
        return sd.getDate() === d.getDate() && sd.getMonth() === d.getMonth();
      });
      const dayRev = daySales.reduce((sum, s) => sum + toNumber(s.totalAmount ?? s.total_amount ?? s.total), 0);
      
      const dayExp = expenses.filter(e => {
        const ed = new Date(e.date);
        return ed.getDate() === d.getDate() && ed.getMonth() === d.getMonth();
      });
      const dayExpTotal = dayExp.reduce((sum, e) => sum + toNumber(e.amount), 0);

      trends.push({
        date: dateString,
        revenue: dayRev,
        profit: dayRev - dayExpTotal
      });
    }

    // Products by Category
    const catStats = categories.map(c => {
      const count = products.filter(p => p.categoryId === c.id || p.category_id === c.id).length;
      return { name: c.name, value: count };
    }).filter(c => c.value > 0).sort((a,b) => b.value - a.value).slice(0, 5);

    // Products by Type
    const tStats = productTypes.map(t => {
      const count = products.filter(p => p.productTypeId === t.id || p.product_type_id === t.id).length;
      return { name: t.name, value: count };
    }).filter(t => t.value > 0).sort((a,b) => b.value - a.value).slice(0, 5);

    // Top Customers
    const tCustomers = [...customers]
      .sort((a, b) => toNumber(b.outstandingBalance ?? b.outstanding_balance) - toNumber(a.outstandingBalance ?? a.outstanding_balance))
      .slice(0, 5)
      .map(c => ({ name: (c.name || c.first_name || "Unknown").substring(0,12), value: toNumber(c.outstandingBalance ?? c.outstanding_balance) }));

    // Top Suppliers
    const tSuppliers = [...suppliers]
      .sort((a, b) => toNumber(b.outstandingBalance ?? b.outstanding_balance) - toNumber(a.outstandingBalance ?? a.outstanding_balance))
      .slice(0, 5)
      .map(s => ({ name: (s.name || "Unknown").substring(0,12), value: toNumber(s.outstandingBalance ?? s.outstanding_balance) }));

    // Cash Sessions (Shifts)
    const rShifts = [...shifts]
      .sort((a, b) => new Date(b.startTime || b.start_time || 0).getTime() - new Date(a.startTime || a.start_time || 0).getTime())
      .slice(0, 7)
      .map(s => {
        const d = new Date(s.startTime || s.start_time || 0);
        return {
          name: d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' }),
          expected: toNumber(s.expectedClosingBalance ?? s.expected_closing_balance),
          actual: toNumber(s.actualClosingBalance ?? s.actual_closing_balance)
        };
      }).reverse();

    return {
      revenue: rev,
      expensesTotal: exp,
      purchases: totalPurchases,
      creditExposure: credit,
      stockValue: stockVal,
      netCashFlow: rev - exp,
      salesToday: revToday,
      purchasesToday: purchToday,
      totalProducts: products.length,
      totalStockUnits: units,
      lowStockProducts: low,
      expiredProducts: expired,
      expiringSoonProducts: expiring,
      recentSales: sortedSales.slice(0, 5),
      trendData: trends,
      branchPerformance: [{ branch: "Main", revenue: rev }],
      topSellingProducts: [],
      staffPerformance: [],
      lowStockAlerts: lowStockList.sort((a,b) => a.currentStock - b.currentStock).slice(0, 5),
      categoryStats: catStats,
      typeStats: tStats,
      purchasesTrend: purchTrend,
      topCustomers: tCustomers,
      topSuppliers: tSuppliers,
      recentShifts: rShifts
    };
  }, [sales, expenses, productBatches, products, customers, suppliers, categories, productTypes, purchasesData, shifts]);

  const isLoading = isSalesLoading || isExpensesLoading || isBatchesLoading || isProductsLoading || isCustomersLoading || isSuppliersLoading || isCategoriesLoading || isProductTypesLoading || isPurchasesLoading || isShiftsLoading;

  const summaryCards = [
    { label: "Total Revenue", value: revenue, icon: Banknote, colorClass: "bg-[#3B82F6] text-white" },
    { label: "Total Expenses", value: expensesTotal, icon: FileText, colorClass: "bg-[#EF4444] text-white" },
    { label: "Total Purchases", value: purchases, icon: Receipt, colorClass: "bg-[#F59E0B] text-white" },
    { label: "Credit Exposure", value: creditExposure, icon: BadgeDollarSign, colorClass: "bg-[#8B5CF6] text-white" },
    { label: "Stock Value", value: stockValue, icon: Boxes, colorClass: "bg-[#10B981] text-white" },
    { label: "Net Cash Flow", value: netCashFlow, icon: LineChart, colorClass: "bg-slate-700 text-white" },
  ];

  const actionCards = [
    { label: "Sales", description: "Review the latest invoices and daily checkout activity.", href: "/dashboard/pos", icon: ShoppingCart, tone: "emerald" },
    { label: "Categories", description: "Manage product groupings and sections.", href: "/dashboard/categories", icon: Tags, tone: "blue" },
    { label: "Product Types", description: "Configure types and definitions for products.", href: "/dashboard/product-types", icon: Layers, tone: "violet" },
    { label: "Inventory", description: "Spot low stock, expiring stock, and adjustments.", href: "/dashboard/inventory", icon: Boxes, tone: "rose" },
    { label: "Purchases", description: "Track supplier orders and goods received.", href: "/dashboard/purchase-orders", icon: Receipt, tone: "amber" },
    { label: "Customers", description: "View client profiles, debts, and history.", href: "/dashboard/customers", icon: Users, tone: "slate" },
    { label: "Suppliers", description: "Check lead times, reliability, and fulfillment.", href: "/dashboard/suppliers", icon: Truck, tone: "violet" },
    { label: "Shift Management", description: "Open and close tills with full cash control.", href: "/dashboard/shifts", icon: CalendarCheck2, tone: "blue" },
    { label: "Reports", description: "Compare sales and operational output over time.", href: "/dashboard/reports", icon: BarChart3, tone: "emerald" },
  ];

  const toneClasses: Record<string, string> = {
    emerald: "bg-emerald-100 text-emerald-600",
    blue: "bg-blue-100 text-blue-600",
    amber: "bg-amber-100 text-amber-600",
    rose: "bg-rose-100 text-rose-600",
    violet: "bg-violet-100 text-violet-600",
    slate: "bg-slate-100 text-slate-600",
  };

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#0aa9ad'];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <PageTransition className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-foreground">Administrator Dashboard</h1>
            {remainingDays !== null && (
              <span className={`px-3 py-1 text-xs font-semibold rounded-full border ${remainingDays <= 7 ? 'bg-destructive/10 text-destructive border-destructive/20' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                {remainingDays} Days Left
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-1">Welcome back, {(user as any)?.first_name || "Admin"}</p>
        </div>
      </div>

      <motion.div 
        variants={containerVariants} 
        initial="hidden" 
        animate="show" 
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
      >
        {summaryCards.map((card, i) => (
          <motion.div key={i} variants={itemVariants}>
            <StatCard
              icon={card.icon}
              label={card.label}
              value={card.value}
              format="currency"
              colorClass={card.colorClass}
            />
          </motion.div>
        ))}
      </motion.div>

      <motion.div 
        variants={containerVariants} 
        initial="hidden" 
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
      >
        <motion.div variants={itemVariants} className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-1">
            <ShoppingCart className="h-4 w-4 text-[#0aa9ad]" /> Sales Today
          </div>
          <p className="text-2xl font-bold text-foreground">{formatMoney(salesToday)}</p>
        </motion.div>
        <motion.div variants={itemVariants} className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-1">
            <Truck className="h-4 w-4 text-[#f59e0b]" /> Purchases Today
          </div>
          <p className="text-2xl font-bold text-foreground">{formatMoney(purchasesToday)}</p>
        </motion.div>
        <motion.div variants={itemVariants} className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-1">
            <Package className="h-4 w-4 text-[#8b5cf6]" /> Total Products
          </div>
          <p className="text-2xl font-bold text-foreground">{totalProducts.toLocaleString()}</p>
        </motion.div>
        <motion.div variants={itemVariants} className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-1">
            <Boxes className="h-4 w-4 text-[#3b82f6]" /> Total Stock
          </div>
          <p className="text-2xl font-bold text-foreground">{totalStockUnits.toLocaleString()} <span className="text-sm font-medium text-muted-foreground">units</span></p>
        </motion.div>
        <motion.div variants={itemVariants} className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-1">
            <AlertTriangle className="h-4 w-4 text-[#ea580c]" /> Low Stock Items
          </div>
          <p className="text-2xl font-bold text-foreground">{lowStockProducts}</p>
        </motion.div>
        <motion.div variants={itemVariants} className="bg-card border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-1">
            <Package className="h-4 w-4 text-[#ef4444]" /> Expired Products
          </div>
          <p className="text-2xl font-bold text-foreground">{expiredProducts}</p>
        </motion.div>
      </motion.div>

      {/* --- QUICK ACTIONS --- */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
        <h3 className="text-base font-semibold text-foreground mb-4">Quick Navigation</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-9 gap-4">
          {actionCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <Link
                key={i}
                to={card.href}
                className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors group text-center"
              >
                <div className={`p-3 rounded-full flex-shrink-0 ${toneClasses[card.tone]}`}>
                  <Icon size={20} />
                </div>
                <h4 className="font-semibold text-xs text-slate-800 group-hover:text-primary transition-colors">{card.label}</h4>
              </Link>
            );
          })}
        </div>
      </div>

      {/* --- 30-DAY SALES & PURCHASES TREND --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-foreground mb-4">Sales &amp; Profit Trend (Last 30 Days)</h3>
          {trendData.length > 0 ? (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="date" tick={{ fill: "#6B7280", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} tick={{ fill: "#6B7280", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    formatter={(val: number, name: string) => [`RWF ${val.toLocaleString()}`, name === "revenue" ? "Revenue" : "Profit"]}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Area type="monotone" name="Revenue" dataKey="revenue" stroke="#3B82F6" fill="url(#revenueGradient)" strokeWidth={2} />
                  <Area type="monotone" name="Profit" dataKey="profit" stroke="#10B981" fill="url(#profitGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-16">
              <p>No sales recorded in the last 30 days.</p>
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-foreground mb-4">Purchases Trend (Last 30 Days)</h3>
          {purchasesTrend.length > 0 ? (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={purchasesTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="purchaseGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="date" tick={{ fill: "#6B7280", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} tick={{ fill: "#6B7280", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    formatter={(val: number) => [`RWF ${val.toLocaleString()}`, "Purchases"]}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Area type="monotone" name="Purchases" dataKey="amount" stroke="#F59E0B" fill="url(#purchaseGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-16">
              <p>No purchases recorded in the last 30 days.</p>
            </div>
          )}
        </div>
      </div>

      {/* --- INVENTORY, CATEGORIES & TYPES --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-foreground mb-4">Products by Category</h3>
          <div className="h-[250px] w-full flex items-center justify-center">
            {categoryStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                  <Pie
                    data={categoryStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryStats.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-muted-foreground">
                <PieChartIcon className="w-12 h-12 mb-3 mx-auto opacity-20" />
                <p>No category data</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-foreground mb-4">Products by Type</h3>
          <div className="h-[250px] w-full flex items-center justify-center">
            {typeStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                  <Pie
                    data={typeStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {typeStats.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={COLORS[(i + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-muted-foreground">
                <PieChartIcon className="w-12 h-12 mb-3 mx-auto opacity-20" />
                <p>No product type data</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm md:col-span-2 lg:col-span-1">
          <h3 className="text-base font-semibold text-foreground mb-4">Inventory Alerts</h3>
          {lowStockAlerts.length > 0 ? (
            <div className="space-y-4 mt-2">
              {lowStockAlerts.slice(0, 5).map((item: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="overflow-hidden">
                    <p className="font-semibold text-sm text-foreground truncate">{item.productName || "Unknown Product"}</p>
                    <p className="text-xs text-muted-foreground">Reorder level: {toNumber(item.reorderLevel)}</p>
                  </div>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-50 text-rose-600 uppercase tracking-wide whitespace-nowrap ml-2">
                    {toNumber(item.currentStock)} left
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground flex flex-col items-center justify-center h-[200px]">
              <Boxes className="w-12 h-12 mb-3 opacity-20" />
              <p>No low stock alerts</p>
            </div>
          )}
        </div>
      </div>

      {/* --- CUSTOMERS, SUPPLIERS, & SHIFT MANAGEMENT --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-foreground mb-4">Top Debtors (Customers)</h3>
          {topCustomers.length > 0 ? (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCustomers} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                  <XAxis type="number" tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} tick={{ fill: '#6B7280', fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} width={80} />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: number) => [formatMoney(val), 'Debt Balance']}
                  />
                  <Bar dataKey="value" fill="#EF4444" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center text-muted-foreground flex flex-col items-center justify-center h-[200px]">
              <Users className="w-12 h-12 mb-3 opacity-20" />
              <p>No outstanding customer debts</p>
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h3 className="text-base font-semibold text-foreground mb-4">Top Creditors (Suppliers)</h3>
          {topSuppliers.length > 0 ? (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSuppliers} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                  <XAxis type="number" tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} tick={{ fill: '#6B7280', fontSize: 10 }} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} width={80} />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: number) => [formatMoney(val), 'Unpaid Balance']}
                  />
                  <Bar dataKey="value" fill="#F59E0B" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center text-muted-foreground flex flex-col items-center justify-center h-[200px]">
              <Truck className="w-12 h-12 mb-3 opacity-20" />
              <p>No outstanding supplier debts</p>
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm md:col-span-2 lg:col-span-1">
          <h3 className="text-base font-semibold text-foreground mb-4">Recent Shifts</h3>
          {recentShifts.length > 0 ? (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={recentShifts} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 11 }} />
                  <YAxis hide />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(val: number, name: string) => [formatMoney(val), name === "expected" ? "Expected Cash" : "Actual Cash"]}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Bar dataKey="actual" name="Actual Cash" fill="#10B981" radius={[4, 4, 0, 0]} barSize={20} />
                  <Line type="monotone" dataKey="expected" name="Expected Cash" stroke="#EF4444" strokeWidth={2} dot={{ r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center text-muted-foreground flex flex-col items-center justify-center h-[200px]">
              <CalendarCheck2 className="w-12 h-12 mb-3 opacity-20" />
              <p>No recent shifts</p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
