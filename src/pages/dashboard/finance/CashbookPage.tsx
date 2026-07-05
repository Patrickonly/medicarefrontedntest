import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

export default function CashbookPage() {
  const { organizationId } = useAuth();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["cashbook", organizationId],
    queryFn: async () => {
      const res = await api.get("/api/cashbook");
      const all = res.data || [];
      all.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return all;
    },
    enabled: !!organizationId,
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cashbook</h1>
          <p className="text-slate-500">Automatically tracking all money coming in and going out.</p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm rounded-2xl">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
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
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                  </TableCell>
                </TableRow>
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
                  <TableCell className="text-slate-500">{tx.description || "-"}</TableCell>
                  <TableCell className={`text-right font-bold ${(tx.transactionType || tx.transaction_type) === "IN" ? "text-emerald-600" : "text-rose-600"}`}>
                    {(tx.transactionType || tx.transaction_type) === "IN" ? "+" : "-"}{(tx.amount)?.toLocaleString()} RWF
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && transactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">No cashbook transactions found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
