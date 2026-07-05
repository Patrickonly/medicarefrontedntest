import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Banknote, Edit2, Plus, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

export default function ExpensesPage() {
  const { success, error } = useToast();
  const { organizationId } = useAuth();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [formData, setFormData] = useState({ category: "Utilities", description: "", amount: 0 });

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses", organizationId],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/expenses");
      // Each item comes back as { expense: { id, type, amount, note, createdAt } } —
      // normalize to the flat shape the rest of this page expects.
      const all = (res || []).map((item: any) => {
        const e = item.expense || item;
        return {
          id: e.id,
          category: e.type || e.category,
          description: e.note || e.description,
          amount: e.amount,
          date: e.createdAt || e.date,
        };
      });
      all.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
      return all;
    },
    enabled: !!organizationId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post("/api/expenses", data);
      return res.data;
    },
    onSuccess: () => {
      success("Success", { description: "Expense logged." });
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    },
    onError: (err: any) => {
      error("Error", { description: err.message || "Failed to log expense." });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.put(`/api/expenses?id=${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      success("Success", { description: "Expense updated." });
      setIsDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    },
    onError: (err: any) => {
      error("Error", { description: err.message || "Failed to update expense." });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.del(`/api/expenses?id=${id}`);
    },
    onSuccess: () => {
      success("Deleted", { description: "Expense removed." });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
    },
    onError: (err: any) => {
      error("Error", { description: err.message || "Failed to delete expense." });
    }
  });

  const handleOpenDialog = (exp: any = null) => {
    setEditingExpense(exp);
    setFormData({
      category: exp ? exp.category : "Utilities",
      description: exp ? exp.description : "",
      amount: exp ? exp.amount : 0
    });
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.description || formData.amount <= 0) {
      error("Error", { description: "Valid description and amount required." });
      return;
    }

    if (editingExpense) {
      updateMutation.mutate({
        id: editingExpense.id,
        data: {
          category: formData.category,
          note: formData.description,
          amount: formData.amount
        }
      });
    } else {
      createMutation.mutate({
        category: formData.category,
        note: formData.description,
        amount: formData.amount
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Expenses</h1>
          <p className="text-slate-500">Log operational costs and overheads.</p>
        </div>
        <Button onClick={() => handleOpenDialog()} className="bg-[#0aa9ad] hover:bg-[#07969a] rounded-xl">
          <Plus className="w-4 h-4 mr-2" /> Add Expense
        </Button>
      </div>

      <Card className="border-slate-200 shadow-sm rounded-2xl">
        <CardHeader className="bg-slate-50/50 border-b border-slate-100 py-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Banknote className="w-5 h-5 text-[#0aa9ad]" />
            Recent Expenses
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
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
              ) : expenses.map((exp: any) => (
                <TableRow key={exp.id}>
                  <TableCell>{new Date(exp.date).toLocaleString()}</TableCell>
                  <TableCell className="font-semibold">{exp.category}</TableCell>
                  <TableCell className="text-slate-500">{exp.description}</TableCell>
                  <TableCell className="font-bold text-rose-600">{exp.amount.toLocaleString()} RWF</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(exp)} className="text-blue-600">
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this expense? Note: This does not automatically reverse the cashbook entry.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(exp.id)} className="bg-red-600 hover:bg-red-700" disabled={deleteMutation.isPending}>
                              {deleteMutation.isPending && deleteMutation.variables === exp.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!isLoading && expenses.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">No expenses recorded.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editingExpense ? "Edit Expense" : "Log New Expense"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select 
                value={formData.category} 
                onValueChange={(val) => setFormData({...formData, category: val})}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Utilities">Utilities</SelectItem>
                  <SelectItem value="Rent">Rent</SelectItem>
                  <SelectItem value="Salaries">Salaries</SelectItem>
                  <SelectItem value="Transport">Transport</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input 
                value={formData.description} 
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                placeholder="e.g., Electricity Bill for June"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Amount (RWF) *</Label>
              <Input 
                type="number"
                value={formData.amount} 
                onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleSave} className="bg-[#0aa9ad] hover:bg-[#07969a] rounded-xl" disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
