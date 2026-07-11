import { useState } from "react";
import { CreditCard, DollarSign, Receipt, FileText, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatCard } from "@/components/shared/StatCard";
import { StatusBadge, getBillingStatusBadge } from "@/components/shared/StatusBadge";
import { AvatarCircle } from "@/components/shared/AvatarCircle";
import { DataTableCard, Th, Td } from "@/components/shared/DataTableCard";
import { DataPagination } from "@/components/shared/DataPagination";
import { LoadingState, TableSkeleton } from "@/components/shared/DataStates";
import { SearchBar } from "@/components/shared/SearchBar";
import { useData, formatCurrency } from "@/hooks/use-data";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

const revenueByDay = [
  { day: "Mon", revenue: 48250 }, { day: "Tue", revenue: 52100 }, { day: "Wed", revenue: 45800 },
  { day: "Thu", revenue: 61200 }, { day: "Fri", revenue: 58900 }, { day: "Sat", revenue: 32400 }, { day: "Sun", revenue: 18500 },
];

export default function BillingPage() {
  const { organizationId } = useAuth();
  
  const { data: sales = [], isLoading: isSalesLoading } = useQuery({
    queryKey: ["sales", organizationId],
    queryFn: async () => {
      const res = await api.get("/api/sales");
      return res.data || [];
    },
    enabled: !!organizationId,
  });

  const { data: customers = [], isLoading: isCustomersLoading } = useQuery({
    queryKey: ["customers", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/customers");
      const list = Array.isArray(res) ? res : (res?.results || res?.data || []);
      return list.map((c: any) => ({ ...c, name: c.full_name || c.name }));
    },
    enabled: !!organizationId,
  });

  const fetchInvoices = () => sales;
  const { paginatedData, isLoading: isDataLoading, search, setSearch, page, setPage, pageSize, setPageSize, totalPages, total } = useData<any>({ fetchFn: fetchInvoices, searchFields: ["invoice_number", "invoiceNumber"] });

  const totalRevenue = sales.reduce((s: number, i: any) => s + (i.status === "Completed" ? (i.totalAmount || i.total_amount || 0) : 0), 0);
  const outstanding = sales.reduce((s: number, i: any) => s + (i.status === "pending" || i.status === "Pending" ? (i.totalAmount || i.total_amount || 0) : 0), 0);
  const insurancePending = 0; // Agrovet doesn't typically have insurance pending

  const getPatient = (pid: string) => customers.find((p: any) => p.id === pid);

  const isLoading = isSalesLoading || isCustomersLoading || isDataLoading;

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="Billing & Finance"
        subtitle="Manage invoices, payments, and financial operations"
        actions={
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm rounded-xl">
            <Plus size={16} className="mr-2" /> Create Invoice
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} label="Revenue (MTD)" value={totalRevenue + outstanding} format="currency" change={0} colorClass="bg-primary/10 text-primary" />
        <StatCard icon={CreditCard} label="Collected Today" value={Math.round(totalRevenue)} format="currency" colorClass="bg-medicare-green/10 text-medicare-green" delay={0.05} />
        <StatCard icon={Receipt} label="Outstanding" value={outstanding} format="currency" colorClass="bg-medicare-amber/10 text-medicare-amber" delay={0.1} />
        <StatCard icon={FileText} label="Insurance Pending" value={insurancePending} format="currency" colorClass="bg-medicare-blue/10 text-medicare-blue" delay={0.15} />
      </div>

      <div className="bg-card rounded-xl border border-border p-6" style={{ boxShadow: "var(--shadow-card)" }}>
        <h3 className="font-display font-semibold text-foreground mb-1">Weekly Revenue</h3>
        <p className="text-xs text-muted-foreground mb-4">Collections by day</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={revenueByDay}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 20% 92%)" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(210 15% 50%)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(210 15% 50%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k RWF`} />
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(210 20% 90%)", fontSize: 12 }} formatter={(value: number) => [formatCurrency(value), "Revenue"]} />
            <Bar dataKey="revenue" fill="hsl(187 70% 38%)" radius={[4, 4, 0, 0]} barSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <SearchBar value={search} onChange={setSearch} placeholder="Search by invoice number..." />

      <DataTableCard title="Recent Sales / Invoices">
        {isLoading ? <TableSkeleton rows={8} /> : (
          <>
            <div className="flex items-center gap-2 px-6 pt-4">
              <span className="text-xs text-muted-foreground whitespace-nowrap">Show entries:</span>
              <Select value={String(pageSize)} onValueChange={(val) => setPageSize(Number(val))}>
                <SelectTrigger aria-label="Entries per page" className="h-8 w-[70px] text-xs rounded-lg border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-border bg-secondary/30">
                  <Th>Invoice</Th><Th>Customer</Th><Th>Date</Th><Th>Total</Th><Th>Payment</Th><Th>Balance</Th><Th>Status</Th>
                </tr></thead>
                <tbody>
                  {paginatedData.map((inv: any) => {
                    const status = inv.status === "Completed" ? "paid" : (inv.status === "pending" || inv.status === "Pending") ? "pending" : "overdue";
                    const badge = getBillingStatusBadge(status);
                    const customer = getPatient(inv.customerId || inv.customer_id);
                    const totalAmt = inv.totalAmount || inv.total_amount || 0;
                    const balance = status === "paid" ? 0 : totalAmt;
                    const invoiceNo = inv.invoiceNumber || inv.invoice_number || inv.ebmReceiptNo || inv.ebm_receipt_no || String(inv.id ?? "").split("-")[0].toUpperCase();
                    
                    return (
                      <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                        <Td className="font-mono text-primary font-medium">{invoiceNo}</Td>
                        <Td>
                          {customer ? (
                            <div className="flex items-center gap-2">
                              <AvatarCircle firstName={customer.name} lastName="" />
                              <span className="font-medium text-foreground">{customer.name}</span>
                            </div>
                          ) : <span className="text-muted-foreground">Walk-in</span>}
                        </Td>
                        <Td className="text-muted-foreground">{new Date(inv.timestamp || inv.date || inv.createdAt || inv.created_at).toLocaleDateString()}</Td>
                        <Td className="font-semibold text-foreground">{totalAmt.toLocaleString()} RWF</Td>
                        <Td className="text-medicare-green font-medium">{inv.paymentMethod || inv.payment_method}</Td>
                        <Td className={`font-medium ${balance > 0 ? "text-medicare-red" : "text-muted-foreground"}`}>{balance.toLocaleString()} RWF</Td>
                        <Td>
                          <div className="flex items-center justify-between">
                            <StatusBadge variant={badge.variant} dot>{badge.label}</StatusBadge>
                            <Button variant="ghost" size="sm" className="h-8 text-blue-600 ml-2" onClick={() => window.print()}>Print</Button>
                          </div>
                        </Td>
                      </tr>
                    );
                  })}
                  {paginatedData.length === 0 && (
                    <tr>
                      <Td colSpan={7} className="text-center py-8 text-muted-foreground">No invoices found.</Td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <DataPagination page={page} totalPages={totalPages} total={total} pageSize={pageSize} onPageChange={setPage} />
          </>
        )}
      </DataTableCard>
    </div>
  );
}
