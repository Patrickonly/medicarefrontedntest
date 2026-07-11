import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle, Clock, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { PageTransition } from "@/components/ui/page-transition";
import { TableRowsSkeleton } from "@/components/shared/TableRowsSkeleton";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-RW", { style: "currency", currency: "RWF", maximumFractionDigits: 0 }).format(value || 0);

export default function AgrovetShiftsPage() {
  const { success, error } = useToast();
  const { organizationId, user } = useAuth();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isClosingDialog, setIsClosingDialog] = useState(false);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [startingCash, setStartingCash] = useState("");
  const [closingCash, setClosingCash] = useState("");

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["agrovet-shifts", organizationId],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>("/api/agrovet/shifts");
      return res.data || [];
    },
    enabled: !!organizationId,
  });

  const { data: currentShift } = useQuery({
    queryKey: ["agrovet-shift-current", organizationId],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any }>("/api/agrovet/shifts/current");
      return res.data;
    },
    enabled: !!organizationId,
  });

  const openShiftMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post<{ success: boolean; data: any }>("/api/agrovet/shifts", data);
      return res.data;
    },
    onSuccess: () => {
      success("Success", "Shift opened successfully.");
      setIsDialogOpen(false);
      setStartingCash("");
      queryClient.invalidateQueries({ queryKey: ["agrovet-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["agrovet-shift-current"] });
      queryClient.invalidateQueries({ queryKey: ["agrovet-dashboard"] });
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to open shift.");
    },
  });

  const closeShiftMutation = useMutation({
    mutationFn: async ({ id, closing_balance }: { id: string; closing_balance: number }) => {
      const res = await api.post<{ success: boolean; data: any }>("/api/agrovet/shifts/close", {
        shift_id: id,
        closing_balance,
      });
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.status === "DISCREPANCY") {
        error(
          "Shift Closed With Discrepancy",
          `Expected ${formatCurrency(data.expected_balance)}, difference of ${formatCurrency(Math.abs(data.difference))}.`
        );
      } else {
        success("Success", "Shift closed and reconciled successfully.");
      }
      setIsClosingDialog(false);
      setActiveShift(null);
      setClosingCash("");
      queryClient.invalidateQueries({ queryKey: ["agrovet-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["agrovet-shift-current"] });
      queryClient.invalidateQueries({ queryKey: ["agrovet-dashboard"] });
    },
    onError: (err: any) => {
      error("Error", err.message || "Failed to close shift.");
    },
  });

  const handleOpenShift = () => {
    if (!startingCash) {
      error("Error", "Starting cash is required.");
      return;
    }
    openShiftMutation.mutate({ opening_balance: Number(startingCash) });
  };

  const handleCloseShift = () => {
    if (!closingCash) {
      error("Error", "Closing cash is required.");
      return;
    }
    closeShiftMutation.mutate({ id: activeShift.id, closing_balance: Number(closingCash) });
  };

  const hasOpenShift = !!currentShift;

  return (
    <PageTransition className="p-6 max-w-[1600px] mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cashier Shifts</h1>
          <p className="text-muted-foreground">Open and close your cash drawer shifts.</p>
        </div>
        {!hasOpenShift && (
          <Button onClick={() => setIsDialogOpen(true)} className="bg-[#0aa9ad] hover:bg-[#07969a] rounded-xl">
            <Plus className="w-4 h-4 mr-2" /> Open Shift
          </Button>
        )}
      </div>

      {currentShift && (
        <Card className="border-emerald-200 bg-emerald-50 shadow-sm rounded-2xl">
          <CardContent className="p-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-100 p-2 rounded-lg">
                <Clock className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-600/80">Active Shift</p>
                <p className="text-sm font-black text-emerald-900">
                  Opened {new Date(currentShift.opened_at).toLocaleString()} &middot; Opening balance {formatCurrency(currentShift.opening_balance)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div>
                <p className="text-xs text-emerald-600/70 font-semibold uppercase">Sales</p>
                <p className="font-black text-emerald-900">{currentShift.totals?.salesCount || 0}</p>
              </div>
              <div>
                <p className="text-xs text-emerald-600/70 font-semibold uppercase">Total</p>
                <p className="font-black text-emerald-900">{formatCurrency(currentShift.totals?.grandTotal || 0)}</p>
              </div>
              <div>
                <p className="text-xs text-emerald-600/70 font-semibold uppercase">Cash</p>
                <p className="font-black text-emerald-900">{formatCurrency(currentShift.totals?.cashTotal || 0)}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="text-orange-600 border-orange-200 hover:bg-orange-50 bg-card"
                onClick={() => { setActiveShift(currentShift); setIsClosingDialog(true); }}
              >
                <CheckCircle className="w-4 h-4 mr-2" /> Close Shift
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="border-border shadow-sm rounded-2xl">
        <CardHeader className="bg-background/50 border-b border-border py-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#0aa9ad]" />
            Shift History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Start Time</TableHead>
                <TableHead>End Time</TableHead>
                <TableHead>Opening Balance</TableHead>
                <TableHead>Closing Balance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRowsSkeleton columns={["text", "text", "text", "text", "badge"]} />
              ) : (
                shifts.map((shift: any) => (
                  <TableRow key={shift.id}>
                    <TableCell>{new Date(shift.opened_at).toLocaleString()}</TableCell>
                    <TableCell>{shift.closed_at ? new Date(shift.closed_at).toLocaleString() : "-"}</TableCell>
                    <TableCell className="font-semibold">{formatCurrency(shift.opening_balance)}</TableCell>
                    <TableCell className="font-semibold">
                      {shift.closing_balance !== undefined && shift.closing_balance !== null ? formatCurrency(shift.closing_balance) : "-"}
                    </TableCell>
                    <TableCell>
                      {shift.status === "OPEN" ? (
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Open</Badge>
                      ) : shift.status === "DISCREPANCY" ? (
                        <Badge className="bg-amber-50 text-amber-700 border-amber-200">Discrepancy</Badge>
                      ) : (
                        <Badge className="bg-muted text-muted-foreground border-border">Closed</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
              {!isLoading && shifts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No shifts recorded.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Open New Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Opening Balance (RWF)</Label>
              <Input
                type="number"
                value={startingCash}
                onChange={(e) => setStartingCash(e.target.value)}
                placeholder="Amount in cash drawer"
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleOpenShift} className="bg-[#0aa9ad] hover:bg-[#07969a] rounded-xl" disabled={openShiftMutation.isPending}>
              {openShiftMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Open Shift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isClosingDialog} onOpenChange={setIsClosingDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Close Shift</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Closing Balance (RWF)</Label>
              <Input
                type="number"
                value={closingCash}
                onChange={(e) => setClosingCash(e.target.value)}
                placeholder="Final amount in cash drawer"
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsClosingDialog(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleCloseShift} className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl" disabled={closeShiftMutation.isPending}>
              {closeShiftMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Close Shift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
