import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Building2, Loader2, Plus, Ticket, Search, RefreshCcw, FilterX, Clock, CheckCircle2, AlertTriangle, Edit2,
} from "lucide-react";
import { StatCardsSkeleton } from "@/components/shared/StatCardsSkeleton";
import { TableRowsSkeleton } from "@/components/shared/TableRowsSkeleton";
import { StatCard } from "@/components/shared/StatCard";

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

const priorityBadgeClass: Record<string, string> = {
  LOW: "bg-muted text-muted-foreground",
  MEDIUM: "bg-blue-100 text-blue-700",
  HIGH: "bg-amber-100 text-amber-700",
  URGENT: "bg-red-100 text-red-700",
};

const statusBadgeClass: Record<string, string> = {
  SUBMITTED: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  RESOLVED: "bg-[#ecfdf5] text-[#10b981]",
  CLOSED: "bg-muted text-muted-foreground",
};

const STATUSES = ["SUBMITTED", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

const emptyForm = { subject: "", category: "General", priority: "MEDIUM" as (typeof PRIORITIES)[number], message: "" };

export default function SupportPage() {
  const { success, error } = useToast();
  const { organizationId } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [editingTicket, setEditingTicket] = useState<any>(null);
  const [editForm, setEditForm] = useState({ 
    priority: "MEDIUM" as (typeof PRIORITIES)[number], 
    status: "SUBMITTED" as (typeof STATUSES)[number],
    responseMessage: "" 
  });

  const { data: tickets = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["support-tickets"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>("/api/support/tickets");
      return res.data || [];
    },
    enabled: !!organizationId,
  });

  const isDataLoading = isLoading || isRefetching;

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

  const updateTicketMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof editForm }) => api.put(`/api/support/tickets?id=${id}`, data),
    onSuccess: () => {
      success("Success", "Ticket updated.");
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      setEditingTicket(null);
    },
    onError: (err: any) => error("Error", err.message || "Failed to update ticket"),
  });

  const openEditDialog = (ticket: any) => {
    setEditingTicket(ticket);
    setEditForm({
      priority: ticket.priority as (typeof PRIORITIES)[number],
      status: ticket.status as (typeof STATUSES)[number],
      responseMessage: ticket.responseMessage || ticket.response_message || "",
    });
  };

  const handleUpdateTicket = () => {
    if (!organizationId) {
      error("Error", "No organization selected. Please reload and try again.");
      return;
    }
    if (!editingTicket) return;
    updateTicketMutation.mutate({ id: editingTicket.id, data: editForm });
  };

  if (!organizationId) {
    return (
      <div className="min-h-screen bg-muted font-sans pb-10">
        <div className="p-6 max-w-[1600px] mx-auto">
          <div className="flex flex-row justify-between items-center mb-6 gap-4 flex-wrap">
            <div>
              <h1 className="text-[#1e293b] text-3xl font-bold tracking-tight">Support</h1>
              <p className="text-muted-foreground text-sm mt-1 font-medium">Monitor and respond to support tickets raised across the platform</p>
            </div>
            <div className="flex items-center gap-2 bg-card px-3 py-1.5 rounded-xl border border-border shadow-sm">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-2 ml-1">Quick Actions:</span>
              <Button variant="ghost" size="sm" className="h-8 font-medium text-muted-foreground hover:bg-muted" onClick={() => navigate("/dashboard/organizations")}>
                Organizations
              </Button>
              <Button variant="ghost" size="sm" className="h-8 font-medium text-[#5b3bf7] bg-[#5b3bf7]/10 hover:bg-[#5b3bf7]/20" onClick={() => navigate("/dashboard/support")}>
                Support
              </Button>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl shadow-sm">
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
              <div className="bg-muted w-20 h-20 rounded-full flex items-center justify-center mb-2 shadow-sm border border-border">
                <Building2 className="h-10 w-10 text-slate-300" />
              </div>
              <p className="font-bold text-slate-700 text-lg">Not available for Super Admin yet</p>
              <p className="max-w-md text-sm text-muted-foreground">
                Support tickets are scoped to a single organization on the backend. There is currently no
                platform-wide ticket view for Super Admin — this needs a backend change to support it.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredTickets = tickets.filter((t: any) => {
    const matchesSearch =
      t.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" ? true : t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalTickets = tickets.length;
  const openTickets = tickets.filter((t: any) => t.status === "OPEN").length;
  const inProgressTickets = tickets.filter((t: any) => t.status === "IN_PROGRESS").length;
  const resolvedTickets = tickets.filter((t: any) => t.status === "RESOLVED" || t.status === "CLOSED").length;

  const currentData = filteredTickets.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredTickets.length / pageSize);

  return (
    <div className="min-h-screen bg-muted font-sans pb-10">
      <div className="p-6 max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-row justify-between items-center mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-[#1e293b] text-3xl font-bold tracking-tight">Support</h1>
            <p className="text-muted-foreground text-sm mt-1 font-medium">Raise and track support tickets for your organization</p>
          </div>
          <div className="flex items-center gap-2 bg-card px-3 py-1.5 rounded-xl border border-border shadow-sm">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-2 ml-1">Quick Actions:</span>
            <Button variant="ghost" size="sm" className="h-8 font-medium text-muted-foreground hover:bg-muted" onClick={() => navigate("/dashboard/organizations")}>
              Organizations
            </Button>
            <Button variant="ghost" size="sm" className="h-8 font-medium text-[#5b3bf7] bg-[#5b3bf7]/10 hover:bg-[#5b3bf7]/20" onClick={() => navigate("/dashboard/support")}>
              Support
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        {isDataLoading ? <StatCardsSkeleton count={4} /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={Ticket}
            label="Total Tickets"
            value={totalTickets}
            colorClass="bg-[#7c3aed] text-white"
          />
          <StatCard
            icon={AlertTriangle}
            label="Open"
            value={openTickets}
            colorClass="bg-[#3b82f6] text-white"
          />
          <StatCard
            icon={Clock}
            label="In Progress"
            value={inProgressTickets}
            colorClass="bg-[#f59e0b] text-white"
          />
          <StatCard
            icon={CheckCircle2}
            label="Resolved"
            value={resolvedTickets}
            colorClass="bg-[#10b981] text-white"
          />
        </div>
        )}

        {/* Toolbar 1 */}
        <div className="flex flex-wrap items-center gap-4 bg-card rounded-t-xl border border-b-0 border-border p-4 shadow-sm">
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search tickets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 border-border rounded-lg text-sm bg-background/50 focus:bg-card transition-colors"
            />
          </div>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-10 border-border bg-card text-slate-700 font-medium rounded-lg hover:bg-muted">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 bg-muted border border-border h-10 px-4 rounded-lg ml-auto">
            <Ticket className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-bold text-slate-700">Total Tickets: {filteredTickets.length}</span>
          </div>
        </div>

        {/* Toolbar 2: Actions */}
        <div className="flex flex-wrap items-center justify-end gap-4 bg-card border border-border p-4 border-t-slate-50 shadow-sm relative z-10">
          <Button
            variant="outline"
            size="sm"
            disabled={isDataLoading}
            className="h-9 px-4 border-border text-slate-700 bg-card hover:bg-[#5b3bf7]/10 hover:text-[#5b3bf7] hover:border-[#5b3bf7]/30 rounded-lg font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
            onClick={() => refetch()}
          >
            <RefreshCcw className={`w-4 h-4 mr-2 ${isDataLoading ? "animate-spin text-[#5b3bf7]" : ""}`} />
            {isDataLoading ? "Refreshing..." : "Refresh"}
          </Button>
          <Button size="sm" className="h-9 px-4 bg-[#5b3bf7] hover:bg-[#4a2ee0] text-white rounded-lg font-medium transition-colors" onClick={() => setIsDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> New Ticket
          </Button>
        </div>

        {/* Data Table */}
        <div className="bg-card border border-border border-t-0 p-5 rounded-b-xl shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">Show entries:</span>
            <Select value={String(pageSize)} onValueChange={(val) => { setPageSize(Number(val)); setPage(1); }}>
              <SelectTrigger className="h-8 w-[70px] text-xs rounded-lg border-border">
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

          {isDataLoading ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table className="min-w-[800px]">
                <TableHeader className="bg-background/50">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="w-[80px] font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4 pl-4">NO.</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">SUBJECT</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">CATEGORY</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider w-[130px] py-4">PRIORITY</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider w-[130px] py-4">STATUS</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider w-[110px] py-4">RAISED</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider text-right w-[100px] py-4 pr-6">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRowsSkeleton columns={["text", "avatar", "text", "badge", "badge", "text", "actions"]} />
                </TableBody>
              </Table>
            </div>
          ) : currentData.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table className="min-w-[800px]">
                <TableHeader className="bg-background/50">
                  <TableRow className="border-b border-border hover:bg-transparent">
                    <TableHead className="w-[80px] font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4 pl-4">NO.</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">SUBJECT</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider py-4">CATEGORY</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider w-[130px] py-4">PRIORITY</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider w-[130px] py-4">STATUS</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider w-[110px] py-4">RAISED</TableHead>
                    <TableHead className="font-bold text-muted-foreground text-[11px] uppercase tracking-wider text-right w-[100px] py-4 pr-6">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentData.map((ticket: any, idx: number) => (
                    <TableRow key={ticket.id} className="border-b border-slate-50 hover:bg-background/80 transition-colors">
                      <TableCell className="text-sm text-muted-foreground font-medium py-3 pl-4">{(page - 1) * pageSize + idx + 1}</TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#0aa9ad]/15 bg-[#0aa9ad]/10 text-[#0aa9ad]">
                            <Ticket className="h-3.5 w-3.5" />
                          </div>
                          <span className="text-sm font-semibold text-slate-700">{ticket.subject}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3"><span className="text-sm text-muted-foreground font-medium">{ticket.category}</span></TableCell>
                      <TableCell className="py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide ${priorityBadgeClass[ticket.priority] || "bg-muted text-muted-foreground"}`}>
                          {ticket.priority}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide ${statusBadgeClass[ticket.status] || "bg-muted text-muted-foreground"}`}>
                          {ticket.status?.replace("_", " ")}
                        </span>
                      </TableCell>
                      <TableCell className="py-3"><span className="text-sm text-muted-foreground font-medium">{new Date(ticket.created_at).toLocaleDateString()}</span></TableCell>
                      <TableCell className="text-right py-3 pr-6">
                        <Button variant="outline" size="icon" className="h-7 w-7 rounded border-blue-200 text-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-colors shadow-sm" title="Edit Priority/Status" onClick={() => openEditDialog(ticket)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 bg-background/50 rounded-xl border border-dashed border-border mt-2 mb-4 mx-2">
              <div className="bg-card w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-sm border border-border">
                <Ticket className="w-10 h-10 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-2">No support tickets found</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md text-center">We couldn't find any tickets matching your current search or filter criteria. Try adjusting them to see more results.</p>
              <Button className="bg-[#5b3bf7] hover:bg-[#4a2ee0] text-white shadow-sm px-6 h-10" onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}>
                <FilterX className="w-4 h-4 mr-2" /> Clear All Filters
              </Button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-between mt-5 gap-4">
            <div className="text-sm text-muted-foreground font-medium">
              Showing {(page - 1) * pageSize + (currentData.length > 0 ? 1 : 0)} to {(page - 1) * pageSize + currentData.length} of {filteredTickets.length} entries
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                className="text-muted-foreground text-sm font-medium px-3 hover:text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>

              {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                const pageNum = i + 1;
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "ghost"}
                    className={`w-8 h-8 p-0 rounded-md font-medium transition-colors ${
                      page === pageNum ? "bg-[#5b3bf7] hover:bg-[#4a2ee0] text-white shadow-sm" : "text-muted-foreground hover:bg-muted"
                    }`}
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}

              {totalPages > 5 && <span className="text-muted-foreground px-1 font-medium">...</span>}

              {totalPages > 5 && (
                <Button
                  variant={page === totalPages ? "default" : "ghost"}
                  className={`w-8 h-8 p-0 rounded-md font-medium transition-colors ${
                    page === totalPages ? "bg-[#5b3bf7] hover:bg-[#4a2ee0] text-white shadow-sm" : "text-muted-foreground hover:bg-muted"
                  }`}
                  onClick={() => setPage(totalPages)}
                >
                  {totalPages}
                </Button>
              )}

              <Button
                variant="ghost"
                className="text-muted-foreground text-sm font-medium px-3 hover:bg-muted transition-colors disabled:opacity-50"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || totalPages === 0}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

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
              <Button onClick={handleSubmit} disabled={createTicketMutation.isPending} className="bg-[#5b3bf7] hover:bg-[#4a2ee0] text-white rounded-xl">
                {createTicketMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit Ticket"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!editingTicket} onOpenChange={(open) => !open && setEditingTicket(null)}>
          <DialogContent className="sm:max-w-[420px] rounded-2xl">
            <DialogHeader>
              <DialogTitle>Edit Ticket</DialogTitle>
              <DialogDescription>{editingTicket?.subject}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={editForm.priority} onValueChange={(val) => setEditForm({ ...editForm, priority: val as typeof editForm.priority })}>
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
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(val) => setEditForm({ ...editForm, status: val as typeof editForm.status })}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Admin Response</Label>
                <Textarea 
                  value={editForm.responseMessage} 
                  onChange={(e) => setEditForm({ ...editForm, responseMessage: e.target.value })} 
                  placeholder="Enter response to the user..." 
                  className="rounded-xl min-h-[80px]" 
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingTicket(null)} className="rounded-xl">Cancel</Button>
              <Button onClick={handleUpdateTicket} disabled={updateTicketMutation.isPending} className="bg-[#5b3bf7] hover:bg-[#4a2ee0] text-white rounded-xl">
                {updateTicketMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
