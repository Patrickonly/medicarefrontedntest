import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Building2, Loader2, Plus, Ticket } from "lucide-react";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

const priorityBadgeClass: Record<string, string> = {
  LOW: "bg-slate-50 text-slate-600 border-slate-200",
  MEDIUM: "bg-blue-50 text-blue-700 border-blue-200",
  HIGH: "bg-amber-50 text-amber-700 border-amber-200",
  URGENT: "bg-red-50 text-red-700 border-red-200",
};

const statusBadgeClass: Record<string, string> = {
  OPEN: "bg-blue-50 text-blue-700 border-blue-200",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border-amber-200",
  RESOLVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CLOSED: "bg-slate-100 text-slate-500 border-slate-200",
};

const emptyForm = { subject: "", category: "General", priority: "MEDIUM" as (typeof PRIORITIES)[number], message: "" };

export default function SupportPage() {
  const { success, error } = useToast();
  const { organizationId } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["support-tickets"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>("/api/support/tickets");
      return res.data || [];
    },
    enabled: !!organizationId,
  });

  const createTicketMutation = useMutation({
    mutationFn: async (data: typeof form) => api.post("/api/support/tickets", data),
    onSuccess: () => {
      success("Success", "Support ticket submitted");
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      setIsDialogOpen(false);
      setForm(emptyForm);
    },
    onError: (err: any) => error("Error", err.message || "Failed to submit ticket"),
  });

  const handleSubmit = () => {
    if (!form.subject.trim() || !form.message.trim()) {
      error("Error", "Subject and message are required");
      return;
    }
    createTicketMutation.mutate(form);
  };

  if (!organizationId) {
    return (
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Support</h1>
          <p className="text-slate-500">Monitor and respond to support tickets raised across the platform.</p>
        </div>
        <Card className="border-slate-200 shadow-sm rounded-2xl">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Building2 className="h-10 w-10 text-slate-300" />
            <p className="font-semibold text-slate-700">Not available for Super Admin yet</p>
            <p className="max-w-md text-sm text-slate-500">
              Support tickets are scoped to a single organization on the backend. There is currently no
              platform-wide ticket view for Super Admin — this needs a backend change to support it.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Support</h1>
          <p className="text-slate-500">Raise and track support tickets for your organization.</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-[#0aa9ad] hover:bg-[#07969a] text-white">
          <Plus className="mr-2 h-4 w-4" /> New Ticket
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm rounded-2xl">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Ticket className="w-5 h-5 text-[#0aa9ad]" />
            Support Tickets
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Raised</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : tickets.length > 0 ? (
                tickets.map((ticket: any) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium text-slate-900">{ticket.subject}</TableCell>
                    <TableCell className="text-slate-600">{ticket.category}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={priorityBadgeClass[ticket.priority] || ""}>{ticket.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusBadgeClass[ticket.status] || ""}>{ticket.status?.replace("_", " ")}</Badge>
                    </TableCell>
                    <TableCell className="text-slate-500 text-sm">{new Date(ticket.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">No support tickets found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl">
          <DialogHeader>
            <DialogTitle>New Support Ticket</DialogTitle>
            <DialogDescription>Describe the issue and we'll route it to the right team.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Brief summary of the issue" className="rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Billing, Technical" className="rounded-xl" />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(val) => setForm({ ...form, priority: val as typeof form.priority })}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>{p.charAt(0) + p.slice(1).toLowerCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Describe the issue in detail..." className="rounded-xl min-h-[100px]" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSubmit} disabled={createTicketMutation.isPending} className="bg-[#0aa9ad] hover:bg-[#07969a] text-white rounded-xl">
              {createTicketMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Ticket"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
