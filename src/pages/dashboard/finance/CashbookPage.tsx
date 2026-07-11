import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, Loader2, ArrowUpRight, ArrowDownRight, DollarSign } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { StatCard } from "@/components/shared/StatCard";
import { useToast } from "@/hooks/use-toast";
import { PageTransition } from "@/components/ui/page-transition";
import { TableRowsSkeleton } from "@/components/shared/TableRowsSkeleton";

export default function CashbookPage() {
  const { organizationId } = useAuth();
  const { error } = useToast();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["cashbook", organizationId],
    queryFn: async () => {
      try {
        const res = await api.get("/api/cashbook");
        const all = res.data;
        if (!Array.isArray(all)) return [];
        all.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return all;
      } catch (err: any) {
        console.error("Failed to fetch cashbook:", err);
        error("Network Error", err?.message || "Failed to connect to the backend server.");
        return [];
      }
    },
    enabled: !!organizationId,
  });

  const totalIn = (Array.isArray(transactions) ? transactions : []).reduce((acc: number, tx: any) => {
    return (tx.transactionType === "IN" || tx.transaction_type === "IN") ? acc + (Number(tx.amount) || 0) : acc;
  }, 0);

  const totalOut = (Array.isArray(transactions) ? transactions : []).reduce((acc: number, tx: any) => {
    return (tx.transactionType === "OUT" || tx.transaction_type === "OUT") ? acc + (Number(tx.amount) || 0) : acc;
  }, 0);

  const netBalance = totalIn - totalOut;

  return (
    <PageTransition className="min-h-screen bg-muted font-sans pb-10">
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Cashbook</h1>
            <p className="text-muted-foreground mt-1">Automatically tracking all money coming in and going out.</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            icon={ArrowUpRight}
            label="Total Cash In"
            value={totalIn}
            format="currency"
            colorClass="bg-emerald-600 text-white"
          />
          <StatCard
            icon={ArrowDownRight}
            label="Total Cash Out"
            value={totalOut}
            format="currency"
            colorClass="bg-rose-600 text-white"
          />
          <StatCard
            icon={DollarSign}
            label="Net Balance"
            value={netBalance}
            format="currency"
            colorClass="bg-[#0aa9ad] text-white"
          />
        </div>

        <Card className="border-border shadow-sm rounded-2xl">
          <CardHeader className="bg-background/50 border-b border-border py-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#0aa9ad]" />
              Transactions
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRowsSkeleton columns={["text", "badge", "text", "text", "text"]} />
                ) : transactions.map((tx: any) => (
                  <TableRow key={tx.id}>
                    <TableCell>{new Date(tx.date).toLocaleString()}</TableCell>
                    <TableCell>
                      {tx.transactionType === "IN" || tx.transaction_type === "IN" ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">IN</Badge>
                      ) : (
                        <Badge className="bg-rose-50 text-rose-700 border-rose-200">OUT</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-semibold text-slate-700">{tx.category}</TableCell>
                    <TableCell className="text-muted-foreground">{tx.description || "-"}</TableCell>
                    <TableCell className={`text-right font-bold ${(tx.transactionType || tx.transaction_type) === "IN" ? "text-emerald-600" : "text-rose-600"}`}>
                      {(tx.transactionType || tx.transaction_type) === "IN" ? "+" : "-"}{(tx.amount)?.toLocaleString()} RWF
                    </TableCell>
                  </TableRow>
                ))}
                {!isLoading && transactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No cashbook transactions found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
