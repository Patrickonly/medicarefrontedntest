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

export default function ShiftManagementPage() {
  const { success, error } = useToast();
  const { organizationId, user } = useAuth();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isClosingDialog, setIsClosingDialog] = useState(false);
  const [activeShift, setActiveShift] = useState<any>(null);
  const [startingCash, setStartingCash] = useState("");
  const [closingCash, setClosingCash] = useState("");

  const { data: shifts = [], isLoading } = useQuery({
    queryKey: ["shifts", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/cash-sessions");
      const all = res || [];
      all.sort((a: any, b: any) => new Date(b.opened_at).getTime() - new Date(a.opened_at).getTime());
      return all;
    },
    enabled: !!organizationId,
  });

  const openShiftMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post("/api/cash-sessions/open", data);
      return res.data;
    },
    onSuccess: () => {
      success("Success", { description: "Shift opened successfully." });
      setIsDialogOpen(false);
      setStartingCash("");
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      // Dashboard needs this too
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    },
    onError: (err: any) => {
      error("Error", { description: err.message || "Failed to open shift." });
    }
  });

  const closeShiftMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.post("/api/cash-sessions/close", { session_id: id, ...data });
      return res.data;
    },
    onSuccess: () => {
      success("Success", { description: "Shift closed successfully." });
      setIsClosingDialog(false);
      setActiveShift(null);
      setClosingCash("");
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    },
    onError: (err: any) => {
      error("Error", { description: err.message || "Failed to close shift." });
    }
  });

  const handleOpenShift = () => {
    if (!startingCash) {
      error("Error", { description: "Starting cash is required." });
      return;
    }

    openShiftMutation.mutate({
      user_id: user?.id,
      opening_balance: Number(startingCash)
    });
  };

  const handleCloseShift = () => {
    if (!closingCash) {
      error("Error", { description: "Closing cash is required." });
      return;
    }

    closeShiftMutation.mutate({
      id: activeShift.id,
      data: {
        closing_balance: Number(closingCash)
      }
    });
  };

  const hasOpenShift = shifts.some((s: any) => s.status === "OPEN");

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shift Management</h1>
          <p className="text-slate-500">Open and close cashier shifts.</p>
        </div>
        {!isLoading && !hasOpenShift && (
          <Button onClick={() => setIsDialogOpen(true)} className="bg-[#0aa9ad] hover:bg-[#07969a] rounded-xl">
            <Plus className="w-4 h-4 mr-2" /> Open Shift
          </Button>
        )}
      </div>

      <Card className="border-slate-200 shadow-sm rounded-2xl">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
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
                <TableHead>Starting Cash</TableHead>
                <TableHead>Closing Cash</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : shifts.map((shift: any) => (
                <TableRow key={shift.id}>
                  <TableCell>{new Date(shift.opened_at).toLocaleString()}</TableCell>
                  <TableCell>{shift.closed_at ? new Date(shift.closed_at).toLocaleString() : "-"}</TableCell>
                  <TableCell className="font-semibold">{shift.opening_balance} RWF</TableCell>
                  <TableCell className="font-semibold">{shift.closing_balance !== undefined && shift.closing_balance !== null ? `${shift.closing_balance} RWF` : "-"}</TableCell>
                  <TableCell>
                    {shift.status === "OPEN" ? (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Open</Badge>
                    ) : shift.status === "DISCREPANCY" ? (
                      <Badge className="bg-amber-50 text-amber-700 border-amber-200">Discrepancy</Badge>
                    ) : (
                      <Badge className="bg-slate-50 text-slate-500 border-slate-200">Closed</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {shift.status === "OPEN" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-orange-600 border-orange-200 hover:bg-orange-50"
                        onClick={() => { setActiveShift(shift); setIsClosingDialog(true); }}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" /> Close Shift
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && shifts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">No shifts recorded.</TableCell>
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
              <Label>Starting Cash (RWF)</Label>
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
              <Label>Closing Cash (RWF)</Label>
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
    </div>
  );
}

