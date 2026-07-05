import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Percent, Check, X, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function DiscountRequestsPage() {
  const { success, error } = useToast();
  const { organizationId, userRole } = useAuth();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["discount-requests", organizationId],
    queryFn: async () => {
      const res = await api.get("/api/discount-requests");
      return res.data || [];
    },
    enabled: !!organizationId,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await api.put(`/api/discount-requests/${id}`, { status });
      return res.data;
    },
    onSuccess: (data, variables) => {
      success(variables.status === "Approved" ? "Approved" : "Rejected", { 
        description: `Discount request ${variables.status.toLowerCase()}.` 
      });
      queryClient.invalidateQueries({ queryKey: ["discount-requests"] });
    },
    onError: (err: any) => {
      error("Error", { description: err.message || "Failed to update status." });
    }
  });

  const handleApprove = (id: string) => {
    updateMutation.mutate({ id, status: "Approved" });
  };

  const handleReject = (id: string) => {
    updateMutation.mutate({ id, status: "Rejected" });
  };

  const canApprove = userRole === "admin" || userRole === "org_owner" || userRole === "super_admin" || userRole === "director";

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Discount Requests</h1>
          <p className="text-slate-500">Manage cashier requests for applying discounts to sales.</p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm rounded-2xl">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Percent className="w-5 h-5 text-[#0aa9ad]" />
            Pending & Past Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sale ID</TableHead>
                <TableHead>Requested By</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-12">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : requests.map((req: any) => (
                <TableRow key={req.id}>
                  <TableCell className="font-mono text-xs">{req.saleId || req.sale_id}</TableCell>
                  <TableCell className="font-mono text-xs">{req.requestedBy || req.requested_by}</TableCell>
                  <TableCell className="font-bold text-emerald-600">{(req.amount)?.toLocaleString()} RWF</TableCell>
                  <TableCell>
                    {req.status === "Pending" && <Badge className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>}
                    {req.status === "Approved" && <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Approved</Badge>}
                    {req.status === "Rejected" && <Badge className="bg-rose-50 text-rose-700 border-rose-200">Rejected</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    {req.status === "Pending" && canApprove && (
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" 
                          onClick={() => handleApprove(req.id)}
                          disabled={updateMutation.isPending}
                        >
                          {updateMutation.isPending && updateMutation.variables?.id === req.id && updateMutation.variables?.status === "Approved" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-rose-600 border-rose-200 hover:bg-rose-50" 
                          onClick={() => handleReject(req.id)}
                          disabled={updateMutation.isPending}
                        >
                          {updateMutation.isPending && updateMutation.variables?.id === req.id && updateMutation.variables?.status === "Rejected" ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && requests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">No discount requests found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
