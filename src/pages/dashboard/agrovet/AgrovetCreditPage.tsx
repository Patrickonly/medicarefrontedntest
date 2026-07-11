import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ArrowRight, UserSquare2, TrendingDown, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import { formatCurrency } from "@/hooks/use-data";

export default function AgrovetCreditPage() {
  const { organizationId } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: creditsData, isLoading } = useQuery({
    queryKey: ["customerCredits", organizationId],
    queryFn: async () => {
      const res = await api.get<{ totalOutstanding: number, customers: any[] }>("/api/customers/credits");
      return res || { totalOutstanding: 0, customers: [] };
    },
    enabled: !!organizationId,
  });

  const allCustomers = creditsData?.customers || [];
  const totalOutstanding = creditsData?.totalOutstanding || 0;

  const filteredCustomers = allCustomers.filter((c: any) => {
    const matchesSearch = c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone?.includes(searchTerm);
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-muted/30 font-sans pb-10">
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Credit & Receivables</h1>
            <p className="text-muted-foreground mt-1">Manage outstanding balances and customer credits.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="border-none shadow-sm bg-gradient-to-br from-rose-500 to-rose-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium opacity-90">Total Outstanding Credit</CardTitle>
              <TrendingDown className="h-4 w-4 opacity-75" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-black">{formatCurrency(totalOutstanding)}</div>
              <p className="text-xs opacity-75 mt-1">across {filteredCustomers.length} customers</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-border bg-card pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <CardTitle className="text-lg font-bold">Outstanding Balances</CardTitle>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-10 border-border bg-background rounded-xl"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex justify-center items-center h-48 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                  <DollarSign className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">No Outstanding Credits</h3>
                <p className="mt-1">You have no customers with an outstanding balance.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-semibold text-foreground">Customer</TableHead>
                      <TableHead className="font-semibold text-foreground">Contact</TableHead>
                      <TableHead className="font-semibold text-foreground">Credit Limit</TableHead>
                      <TableHead className="font-semibold text-rose-600">Outstanding Balance</TableHead>
                      <TableHead className="text-right font-semibold text-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((c: any) => {
                      const balance = Number(c.outstanding_balance || c.outstandingBalance || c.balance || 0);
                      const limit = Number(c.credit_limit || c.creditLimit || 0);
                      
                      return (
                        <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                <UserSquare2 className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-semibold text-foreground">{c.name || c.full_name}</p>
                                <p className="text-xs text-muted-foreground">ID: {c.id}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">{c.phone || "—"}</TableCell>
                          <TableCell>
                            <span className="font-medium text-slate-700">{formatCurrency(limit)}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 font-bold px-2.5 py-1 shadow-sm">
                              {formatCurrency(balance)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link to={`/dashboard/customers/${c.id}/profile`}>
                              <Button variant="outline" size="sm" className="h-8 text-xs font-semibold bg-[#0aa9ad]/10 text-[#0aa9ad] hover:bg-[#0aa9ad]/20 hover:text-[#07969a] border-none shadow-sm">
                                View Profile <ArrowRight className="ml-1.5 h-3 w-3" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
