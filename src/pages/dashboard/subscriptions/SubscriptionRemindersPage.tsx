import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Send, ArrowLeft, AlertCircle, BellRing, Mail, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { StatCard } from "@/components/shared/StatCard";

export default function SubscriptionRemindersPage() {
  const { success, error } = useToast();
  const navigate = useNavigate();

  const [daysAhead, setDaysAhead] = useState<number>(7);
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const { data: reminderTargets = [], isLoading } = useQuery({
    queryKey: ["admin-subscription-reminders", daysAhead],
    queryFn: async () => {
      const res: any = await api.get(`/api/admin/subscriptions/reminders?daysAhead=${daysAhead}`);
      return Array.isArray(res) ? res : (res?.results || res?.targets || []);
    },
  });

  const sendRemindersMutation = useMutation({
    mutationFn: async () => {
      return api.post("/api/admin/subscriptions/reminders", {
        daysAhead,
        organizationIds: selectedOrgs.length > 0 ? selectedOrgs : undefined,
        channels: ["EMAIL", "SMS"],
      });
    },
    onSuccess: (data: any) => {
      success("Reminders Sent", data.message || `Processed ${data.sentCount} reminders`);
      setIsConfirmOpen(false);
      setSelectedOrgs([]);
    },
    onError: (err: any) => error("Error", err.message || "Failed to send reminders"),
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrgs(reminderTargets.map((t: any) => t.organizationId || t.id));
    } else {
      setSelectedOrgs([]);
    }
  };

  const handleSelectOrg = (orgId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrgs((prev) => [...prev, orgId]);
    } else {
      setSelectedOrgs((prev) => prev.filter((id) => id !== orgId));
    }
  };

  return (
    <div className="min-h-screen bg-muted font-sans pb-10">
      <div className="p-6 max-w-[1600px] mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/subscriptions")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-[#1e293b] text-3xl font-bold tracking-tight">Payment Reminders</h1>
            <p className="text-muted-foreground text-sm mt-1 font-medium">Preview and send subscription renewal reminders.</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <StatCard
            icon={BellRing}
            label="Pending Reminders"
            value={reminderTargets.length}
            colorClass="bg-[#ec4899] text-white"
          />
          <StatCard
            icon={Send}
            label="Selected Targets"
            value={selectedOrgs.length}
            colorClass="bg-[#3b82f6] text-white"
          />
          <StatCard
            icon={AlertCircle}
            label="Critical Expiries"
            value={reminderTargets.filter((t: any) => {
              const d = new Date(t.expiresAt || t.expires_at);
              return !isNaN(d.getTime()) && (d.getTime() - Date.now()) / (1000 * 3600 * 24) < 3;
            }).length}
            colorClass="bg-[#ef4444] text-white"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
          <div className="space-y-1.5">
            <Label htmlFor="daysAhead" className="text-sm font-semibold text-slate-700">Days Until Expiry Window</Label>
            <div className="flex items-center gap-2">
              <Input
                id="daysAhead"
                type="number"
                min="0"
                value={daysAhead}
                onChange={(e) => setDaysAhead(Number(e.target.value) || 0)}
                className="w-32 h-10 border-border rounded-lg bg-card"
              />
              <span className="text-sm text-muted-foreground">days</span>
            </div>
          </div>

          <Button
            onClick={() => setIsConfirmOpen(true)}
            disabled={reminderTargets.length === 0 || sendRemindersMutation.isPending}
            className="bg-[#ec4899] hover:bg-[#db2777] text-white h-10 px-6 font-medium shadow-sm"
          >
            {sendRemindersMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send Reminders ({selectedOrgs.length > 0 ? selectedOrgs.length : reminderTargets.length})
          </Button>
        </div>

        <Card className="border-border shadow-sm rounded-2xl">
          <CardHeader className="border-b border-border pb-4 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <BellRing className="h-5 w-5 text-[#ec4899]" />
              Organizations Due for Reminder
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-background/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-12 text-center">
                    <Checkbox
                      checked={selectedOrgs.length === reminderTargets.length && reminderTargets.length > 0}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead className="font-semibold text-slate-700 h-11">Organization</TableHead>
                  <TableHead className="font-semibold text-slate-700 h-11">Contacts</TableHead>
                  <TableHead className="font-semibold text-slate-700 h-11">Plan</TableHead>
                  <TableHead className="font-semibold text-slate-700 h-11">Expiry Date</TableHead>
                  <TableHead className="font-semibold text-slate-700 h-11 text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                      Loading targets...
                    </TableCell>
                  </TableRow>
                ) : reminderTargets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <div className="flex flex-col items-center justify-center">
                        <AlertCircle className="h-8 w-8 text-slate-300 mb-2" />
                        <p>No subscriptions expiring within {daysAhead} days.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  reminderTargets.map((target: any) => {
                    const orgId = target.organizationId || target.id;
                    const isSelected = selectedOrgs.includes(orgId);
                    return (
                      <TableRow key={orgId} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleSelectOrg(orgId, checked as boolean)}
                            aria-label={`Select ${target.organizationName}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-900">{target.organizationName}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                            {target.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-3 w-3" /> {target.email}
                              </div>
                            )}
                            {target.phone && (
                              <div className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" /> {target.phone}
                              </div>
                            )}
                            {!target.email && !target.phone && (
                              <span className="text-xs text-red-500 italic">No contact info</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-slate-50">
                            {target.plan || "Unknown Plan"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {target.expiryDate ? format(new Date(target.expiryDate), "MMM dd, yyyy") : "N/A"}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {target.daysUntilExpiry > 0 ? `${target.daysUntilExpiry} days left` : "Expired"}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge className={target.isExpired || target.daysUntilExpiry <= 0 ? "bg-red-100 text-red-700 hover:bg-red-100" : "bg-amber-100 text-amber-700 hover:bg-amber-100"}>
                            {target.isExpired || target.daysUntilExpiry <= 0 ? "Expired" : "Expiring Soon"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Send Payment Reminders?</AlertDialogTitle>
              <AlertDialogDescription>
                This will dispatch email and SMS reminders to <strong>{selectedOrgs.length > 0 ? selectedOrgs.length : reminderTargets.length}</strong> organization(s).
                <br /><br />
                The message will politely inform them that their subscription is due for renewal.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={sendRemindersMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  sendRemindersMutation.mutate();
                }}
                disabled={sendRemindersMutation.isPending}
                className="bg-[#ec4899] hover:bg-[#db2777]"
              >
                {sendRemindersMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Confirm Send
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
