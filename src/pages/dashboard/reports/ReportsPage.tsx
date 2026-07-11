import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { format, isSameDay, startOfDay, endOfDay } from "date-fns";
import { Link } from "react-router-dom";
import { RefreshCcw, ShoppingCart, CalendarDays, Calendar, Trash2, Package, Printer, FileText, FileSpreadsheet, Download, Wallet, CircleCheck, CircleAlert, Receipt, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup,
} from "@/components/ui/select";
import { formatCurrency } from "@/hooks/use-data";
import { PageTransition } from "@/components/ui/page-transition";

export default function ReportsPage() {
  const { organizationId } = useAuth();
  
  // Date selector state
  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState<string>(today.toISOString());

  // Generate daily options for dropdown
  const dailyOptionsGrouped: Record<string, { value: string; label: string }[]> = useMemo(() => {
    const grouped: Record<string, { value: string; label: string }[]> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const monthGroup = format(d, "MMMM yyyy");
      let label = format(d, "EEE - dd-MMMM-yyyy");
      if (i === 0) label = "Today, " + label;
      else if (i === 1) label = "Yesterday, " + label;
      if (!grouped[monthGroup]) grouped[monthGroup] = [];
      grouped[monthGroup].push({ value: d.toISOString(), label });
    }
    return grouped;
  }, [today]);

  // Queries
  const { data: rawSales = [], isLoading: salesLoading, isRefetching: salesRefetching, refetch: refetchSales } = useQuery({
    queryKey: ["sales", organizationId],
    queryFn: async () => {
      const res = await api.get<{ data?: any[] } | any[]>("/api/sales");
      return Array.isArray(res) ? res : (res?.data || []);
    },
    enabled: !!organizationId,
  });

  const { data: expenses = [], isLoading: expensesLoading, isRefetching: expensesRefetching, refetch: refetchExpenses } = useQuery({
    queryKey: ["expenses", organizationId],
    queryFn: async () => {
      const res = await api.get<{ data?: any[] } | any[]>("/api/expenses");
      const raw = Array.isArray(res) ? res : (res?.data || []);
      // Each item comes back as { expense: { id, type, amount, note, createdAt } } —
      // normalize to the flat shape the rest of this page expects.
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

  const { data: categories = [], isLoading: categoriesLoading, isRefetching: categoriesRefetching, refetch: refetchCategories } = useQuery({
    queryKey: ["categories", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/products/categories");
      return Array.isArray(res) ? res : (res?.data || res?.results || []);
    },
    enabled: !!organizationId,
  });

  const isLoading = salesLoading || expensesLoading || categoriesLoading;
  const isRefreshing = salesRefetching || expensesRefetching || categoriesRefetching;

  // Filter by selected date
  const targetDate = new Date(selectedDate);
  
  const salesInDay = useMemo(() => {
    return rawSales.filter((s: any) => {
      const date = new Date(s.timestamp || s.created_at || s.date || 0);
      return isSameDay(date, targetDate);
    });
  }, [rawSales, selectedDate, targetDate]);

  const expensesInDay = useMemo(() => {
    return expenses.filter((e: any) => {
      const date = new Date(e.date || e.created_at || 0);
      return isSameDay(date, targetDate);
    });
  }, [expenses, selectedDate, targetDate]);

  // Aggregate Metrics
  let totalSales = 0;
  let totalPaid = 0;
  let totalUnpaid = 0;

  salesInDay.forEach((s: any) => {
    const amount = Number(s.totalAmount ?? s.total_amount ?? s.total ?? 0);
    const paid = Number(s.amountPaid ?? s.amount_paid ?? (s.status === 'PAID' ? amount : 0));
    const unpaid = amount - paid;
    
    totalSales += amount;
    totalPaid += paid;
    totalUnpaid += unpaid;
  });

  const totalExpenses = expensesInDay.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);
  const balance = totalPaid - totalExpenses;

  const handleRefresh = () => {
    refetchSales();
    refetchExpenses();
    refetchCategories();
  };

  const handlePrint = () => {
    window.print();
  };



  // Process data for tables
  const { itemsByCategory, categorizedSummary } = useMemo(() => {
    const itemsByCat: Record<string, any[]> = {};
    const summaryByCat: Record<string, Record<string, any>> = {};

    salesInDay.forEach((sale: any) => {
      const saleDate = new Date(sale.timestamp || sale.created_at || sale.date || 0);
      const seller = sale.created_by?.username || sale.created_by?.first_name || sale.createdBy?.firstName || 'System';
      
      const baseStatus = sale.status || 'PAID';
      const paymentMethod = sale.payment_method || sale.paymentMethod || 'CASH';
      const remainingBalance = Number(sale.remaining_balance || 0);
      
      let displayStatus = baseStatus;
      if (paymentMethod === 'CREDIT') {
        if (remainingBalance <= 0) {
          displayStatus = 'PAID CREDIT';
        } else {
          displayStatus = 'CREDIT';
        }
      } else if (baseStatus === 'UNPAID') {
        displayStatus = 'UNPAID';
      } else {
        displayStatus = 'PAID';
      }

      if (Array.isArray(sale.items)) {
        sale.items.forEach((item: any) => {
          const product = item.product || {};
          const cat = categories.find((c: any) => c.id === product.category_id || c.id === product.category?.id);
          const categoryName = cat?.name || product.category?.name || 'Uncategorized';
          const price = Number(item.unit_price || item.unitPrice || 0);
          const qty = Number(item.quantity || 0);
          const total = price * qty;
          
          let paid = baseStatus === 'PAID' ? total : 0;
          let unpaid = baseStatus === 'PAID' ? 0 : total;
          if (paymentMethod === 'CREDIT') {
             // For credit sales, if it's not fully paid, we treat the line items as unpaid for simple reporting
             paid = remainingBalance <= 0 ? total : 0;
             unpaid = remainingBalance <= 0 ? 0 : total;
          }

          // Push to items for SALES DETAILS
          if (!itemsByCat[categoryName]) itemsByCat[categoryName] = [];
          itemsByCat[categoryName].push({
            date: saleDate,
            productName: product.name || 'Unknown',
            price,
            qty,
            total,
            paid,
            unpaid,
            seller,
            status: displayStatus
          });

          // Aggregate for SUMMARY OF SALES
          if (!summaryByCat[categoryName]) summaryByCat[categoryName] = {};
          const prodName = product.name || 'Unknown';
          if (!summaryByCat[categoryName][prodName]) {
            summaryByCat[categoryName][prodName] = {
              productName: prodName,
              price,
              qty: 0,
              total: 0,
              paid: 0,
              unpaid: 0,
              status: displayStatus
            };
          }
          summaryByCat[categoryName][prodName].qty += qty;
          summaryByCat[categoryName][prodName].total += total;
          summaryByCat[categoryName][prodName].paid += paid;
          summaryByCat[categoryName][prodName].unpaid += unpaid;
          summaryByCat[categoryName][prodName].status = displayStatus;
        });
      }
    });

    return { itemsByCategory: itemsByCat, categorizedSummary: summaryByCat };
  }, [salesInDay]);

  const exportCSV = () => {
    const rows = [
      ["Date", "Time", "Category", "Product", "Price", "Qty", "Total", "Paid", "Unpaid", "Seller", "Status"]
    ];
    
    Object.entries(itemsByCategory).forEach(([category, items]) => {
      (items as any[]).forEach((item: any) => {
        rows.push([
          format(item.date, "dd-MMM-yyyy"),
          format(item.date, "HH:mm:ss"),
          category,
          item.productName,
          item.price.toString(),
          item.qty.toString(),
          item.total.toString(),
          item.paid.toString(),
          item.unpaid.toString(),
          item.seller,
          item.status
        ]);
      });
    });

    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Daily_Sales_Report_${selectedDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderCategoryTables = () => {
    const hasSales = Object.keys(itemsByCategory).length > 0;
    const hasExpenses = expensesInDay.length > 0;

    if (!hasSales && !hasExpenses) {
      return (
        <div className="py-12 text-center text-muted-foreground font-medium bg-white dark:bg-slate-900 rounded-2xl border border-border shadow-sm">
          No sales or expenses found for this date.
        </div>
      );
    }

    return (
      <div className="space-y-16">
        {/* Sales Details Section */}
        {hasSales && (
        <>
        <div className="flex flex-col items-center justify-center text-center mt-8">
          <h2 className="text-xl font-black uppercase tracking-widest text-[#09111f] dark:text-white">
            Sales Details
          </h2>
        </div>

        {Object.entries(itemsByCategory).map(([category, items]) => (
          <div key={`details-${category}`} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 border-b border-border text-center">
              <h3 className="text-lg font-black text-[#ea580c] uppercase">{category}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3 text-right">Price</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Paid</th>
                    <th className="px-4 py-3 text-right">Unpaid</th>
                    <th className="px-4 py-3">Seller</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 font-medium">{idx + 1}</td>
                      <td className="px-4 py-3">{format(item.date, "dd-MMM-yyyy")}</td>
                      <td className="px-4 py-3">{format(item.date, "HH:mm:ss")}</td>
                      <td className="px-4 py-3 font-bold">{item.productName}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(item.price)}</td>
                      <td className="px-4 py-3 text-right font-medium">{item.qty}</td>
                      <td className="px-4 py-3 text-right font-bold text-[#09111f] dark:text-white">{formatCurrency(item.total)}</td>
                      <td className="px-4 py-3 text-right font-bold text-[#22c55e]">{item.paid > 0 ? formatCurrency(item.paid) : '0'}</td>
                      <td className="px-4 py-3 text-right font-bold text-rose-600">{item.unpaid > 0 ? formatCurrency(item.unpaid) : '0'}</td>
                      <td className="px-4 py-3 text-slate-500">{item.seller}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          item.status === "PAID" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                          item.status === "UNPAID" ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" :
                          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}

        {/* Summary of Sales Section */}
        <div className="flex flex-col items-center justify-center text-center mt-12">
          <h2 className="text-xl font-black uppercase tracking-widest text-[#09111f] dark:text-white">
            Summary of Sales
          </h2>
        </div>

        {Object.entries(categorizedSummary).map(([category, productsObj]) => {
          const products = Object.values(productsObj);
          const catTotalQty = products.reduce((sum, p) => sum + p.qty, 0);
          const catTotalAmount = products.reduce((sum, p) => sum + p.total, 0);
          const catTotalPaid = products.reduce((sum, p) => sum + p.paid, 0);
          const catTotalUnpaid = products.reduce((sum, p) => sum + p.unpaid, 0);

          return (
            <div key={`summary-${category}`} className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 border-b border-border text-center">
                <h3 className="text-lg font-black text-[#3b82f6] uppercase">{category}</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3">S/NO</th>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3 text-right">Price</th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3 text-right">Total</th>
                      <th className="px-4 py-3 text-right">Paid</th>
                      <th className="px-4 py-3 text-right">Unpaid</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {products.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 font-medium">{idx + 1}</td>
                        <td className="px-4 py-3 font-bold text-slate-700 dark:text-slate-300">{item.productName}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(item.price)}</td>
                        <td className="px-4 py-3 text-right font-medium">{item.qty}</td>
                        <td className="px-4 py-3 text-right font-bold text-[#0aa9ad]">{formatCurrency(item.total)}</td>
                        <td className="px-4 py-3 text-right font-bold text-[#22c55e]">{item.paid > 0 ? formatCurrency(item.paid) : '0'}</td>
                        <td className="px-4 py-3 text-right font-bold text-rose-600">{item.unpaid > 0 ? formatCurrency(item.unpaid) : '0'}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            item.status === "PAID" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                            item.status === "UNPAID" ? "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400" :
                            "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                          }`}>
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 dark:bg-slate-900/30 font-black text-[15px]">
                      <td colSpan={3} className="px-4 py-4 uppercase text-slate-600 dark:text-slate-300">TOTAL:</td>
                      <td className="px-4 py-4 text-right">{catTotalQty}</td>
                      <td className="px-4 py-4 text-right text-[#0aa9ad]">{formatCurrency(catTotalAmount)}</td>
                      <td className="px-4 py-4 text-right text-[#22c55e]">{catTotalPaid > 0 ? formatCurrency(catTotalPaid) : '0'}</td>
                      <td className="px-4 py-4 text-right text-rose-600">{catTotalUnpaid > 0 ? formatCurrency(catTotalUnpaid) : '0'}</td>
                      <td className="px-4 py-4 text-center"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
        </>
        )}

        {/* Expenses Section */}
        {hasExpenses && (
          <>
            <div className="flex flex-col items-center justify-center text-center mt-12">
              <h2 className="text-xl font-black uppercase tracking-widest text-[#09111f] dark:text-white">
                Expenses
              </h2>
            </div>
            <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
              <div className="bg-slate-50/50 dark:bg-slate-900/50 p-4 border-b border-border text-center">
                <h3 className="text-lg font-black text-rose-600 uppercase">Daily Expenses</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-xs">
                    <tr>
                      <th className="px-4 py-3">#</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {expensesInDay.map((exp: any, idx: number) => (
                      <tr key={exp.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-3 font-medium">{idx + 1}</td>
                        <td className="px-4 py-3">{format(new Date(exp.date), "dd-MMM-yyyy")}</td>
                        <td className="px-4 py-3 font-bold">{exp.category || "Uncategorized"}</td>
                        <td className="px-4 py-3 text-slate-500">{exp.description || "-"}</td>
                        <td className="px-4 py-3 text-right font-bold text-rose-600">{formatCurrency(Number(exp.amount || 0))}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 dark:bg-slate-900/30 font-black text-[15px]">
                      <td colSpan={4} className="px-4 py-4 uppercase text-slate-600 dark:text-slate-300">TOTAL:</td>
                      <td className="px-4 py-4 text-right text-rose-600">{formatCurrency(totalExpenses)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <PageTransition>
      <div className="flex flex-col gap-8 pb-12 p-6 max-w-[1600px] mx-auto">
        <div className="flex flex-col items-center justify-center text-center mt-2">
          <h1 className="text-2xl font-black uppercase tracking-widest text-[#09111f] dark:text-white">
            Daily Sales Report
          </h1>
        </div>

        {/* Quick Links */}
        <div className="flex flex-wrap items-center justify-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <span className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <CalendarDays size={16} /> Quick Links:
          </span>
          <Link to="/dashboard/sales-history" className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300">
            <ShoppingCart size={16} /> Sales
          </Link>
          <div className="flex items-center gap-2 rounded-lg bg-[#3b82f6] px-4 py-2 text-sm font-bold text-white shadow-md">
            <Calendar size={16} /> Daily Sales Report
          </div>
          <Link to="/dashboard/reports/monthly" className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300">
            <CalendarDays size={16} /> Monthly Sales Report
          </Link>
          <Link to="/dashboard/sales-history" className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300">
            <Trash2 size={16} /> Recycle Bin - Sales
          </Link>
          <Link to="/dashboard/inventory" className="flex items-center gap-2 rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300">
            <Package size={16} /> Current Stock
          </Link>
        </div>

        {/* Date Selector & Refresh */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 bg-card border border-border p-4 rounded-2xl shadow-sm">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Select Date:</span>
          <Select value={selectedDate} onValueChange={setSelectedDate}>
            <SelectTrigger className="w-[280px] h-10 border-border bg-white dark:bg-slate-900 text-black dark:text-white font-bold rounded-xl text-sm">
              <SelectValue placeholder="Select Date" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(dailyOptionsGrouped).map(([month, days]) => (
                <SelectGroup key={month}>
                  <div className="px-2 py-1.5 text-xs font-bold text-foreground bg-muted/50">{month}</div>
                  {days.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleRefresh} disabled={isRefreshing} className="rounded-xl bg-[#3b82f6] hover:bg-[#2563eb] text-white gap-2 font-bold shadow-md h-10 disabled:opacity-70">
            <RefreshCcw size={16} className={isRefreshing ? "animate-spin" : ""} /> {isRefreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        {/* Export Options */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-card border border-border p-4 rounded-2xl shadow-sm -mt-2">
          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Export:</span>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handlePrint} variant="outline" className="h-9 gap-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
              <Printer size={16} /> Print
            </Button>
            <Button onClick={handlePrint} variant="outline" className="h-9 gap-2 text-rose-600 border-rose-200 hover:bg-rose-50 dark:border-rose-900 dark:hover:bg-rose-950/50">
              <FileText size={16} /> PDF
            </Button>
            <Button onClick={exportCSV} variant="outline" className="h-9 gap-2 text-green-600 border-green-200 hover:bg-green-50 dark:border-green-900 dark:hover:bg-green-950/50">
              <FileSpreadsheet size={16} /> Excel
            </Button>
            <Button onClick={exportCSV} variant="outline" className="h-9 gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-900 dark:hover:bg-blue-950/50">
              <Download size={16} /> CSV
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-2 px-2 text-sm">
          <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-[10px]">i</div>
          <span className="text-muted-foreground">Showing: <strong className="text-foreground">Daily Sales Report</strong> for <strong className="text-orange-500">{format(new Date(selectedDate), "EEE - dd-MMMM-yyyy")}</strong></span>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
          <div className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="absolute inset-x-0 top-0 h-1 bg-[#3b82f6]" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-widest text-slate-500 uppercase">Sales</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3b82f6]/10 text-[#3b82f6]">
                <ShoppingCart size={18} />
              </div>
            </div>
            <span className="text-2xl font-black text-[#09111f] dark:text-white">{formatCurrency(totalSales)}</span>
          </div>

          <div className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="absolute inset-x-0 top-0 h-1 bg-rose-500" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-widest text-slate-500 uppercase">Unpaid</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600">
                <CircleAlert size={18} />
              </div>
            </div>
            <span className="text-2xl font-black text-rose-600">{formatCurrency(totalUnpaid)}</span>
          </div>

          <div className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="absolute inset-x-0 top-0 h-1 bg-[#22c55e]" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-widest text-slate-500 uppercase">Paid</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#22c55e]/10 text-[#22c55e]">
                <CircleCheck size={18} />
              </div>
            </div>
            <span className="text-2xl font-black text-[#22c55e]">{formatCurrency(totalPaid)}</span>
          </div>

          <div className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="absolute inset-x-0 top-0 h-1 bg-amber-500" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-widest text-slate-500 uppercase">Expenses</span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                <Receipt size={18} />
              </div>
            </div>
            <span className="text-2xl font-black text-amber-600">{formatCurrency(totalExpenses)}</span>
          </div>

          <div className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className={`absolute inset-x-0 top-0 h-1 ${balance >= 0 ? "bg-[#22c55e]" : "bg-rose-500"}`} />
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-widest text-slate-500 uppercase">Balance</span>
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${balance >= 0 ? "bg-[#22c55e]/10 text-[#22c55e]" : "bg-rose-500/10 text-rose-600"}`}>
                <Scale size={18} />
              </div>
            </div>
            <span className={`text-2xl font-black ${balance >= 0 ? "text-[#22c55e]" : "text-rose-600"}`}>{formatCurrency(balance)}</span>
          </div>
        </div>

        {/* Data Tables */}
        {renderCategoryTables()}
      </div>
    </PageTransition>
  );
}
