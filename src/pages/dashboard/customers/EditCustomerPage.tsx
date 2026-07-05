import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, UserCheck, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export default function EditCustomerPage() {
  const { success, error } = useToast();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    creditLimit: 0,
  });

  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer", id],
    queryFn: async () => {
      // There is no single-customer GET endpoint — fetch the org's full list
      // and pick the one we need, same as the list page already loads it.
      const res = await api.get<any[]>("/api/customers");
      return (res || []).find((c: any) => String(c.id) === String(id));
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (customer) {
      setFormData({
        name: customer.name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        creditLimit: customer.creditLimit || customer.credit_limit || 0,
      });
    }
  }, [customer]);

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await api.put(`/api/customers?id=${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      success("Customer Updated", { description: `${formData.name}'s profile has been updated.` });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      queryClient.invalidateQueries({ queryKey: ["customer", id] });
      navigate("/dashboard/customers");
    },
    onError: (err: any) => {
      error("Error", { description: err.message || "Failed to update customer." });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    updateMutation.mutate({
      id,
      data: {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        credit_limit: formData.creditLimit,
      }
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard/customers")}
          className="mb-4 text-slate-500 hover:text-slate-900 -ml-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Customers
        </Button>
        <h1 className="text-2xl font-bold text-slate-900">Edit Customer</h1>
        <p className="text-sm text-slate-500">Update customer details and credit limits.</p>
      </div>

      <Card className="border-slate-200 shadow-sm rounded-2xl">
        <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50 rounded-t-2xl">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-[#0aa9ad]" />
            Customer Profile
          </CardTitle>
          <CardDescription>Update the personal and credit details below.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label htmlFor="name" className="text-slate-700 font-medium">Full Name <span className="text-red-500">*</span></Label>
                  <Input
                    id="name"
                    required
                    placeholder="e.g. Jean Pierre"
                    className="rounded-xl border-slate-200 focus-visible:ring-[#0aa9ad]"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="phone" className="text-slate-700 font-medium">Phone Number <span className="text-red-500">*</span></Label>
                  <Input
                    id="phone"
                    required
                    placeholder="e.g. +250 788 000 000"
                    className="rounded-xl border-slate-200 focus-visible:ring-[#0aa9ad]"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="email" className="text-slate-700 font-medium">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    className="rounded-xl border-slate-200 focus-visible:ring-[#0aa9ad]"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-3">
                  <Label htmlFor="credit" className="text-slate-700 font-medium">Credit Limit (RWF) <span className="text-red-500">*</span></Label>
                  <Input
                    id="credit"
                    type="number"
                    required
                    min="0"
                    className="rounded-xl border-slate-200 focus-visible:ring-[#0aa9ad]"
                    value={formData.creditLimit}
                    onChange={(e) => setFormData({ ...formData, creditLimit: Number(e.target.value) })}
                  />
                  <p className="text-xs text-slate-500">Set to 0 to disable credit sales for this customer.</p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => navigate("/dashboard/customers")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="rounded-xl bg-[#0aa9ad] hover:bg-[#07969a] text-white shadow-md shadow-teal-900/10"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Save className="mr-2 h-4 w-4" /> Update Customer</>}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
