import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Building2, Save, Loader2 } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function AddSupplierPage() {
  const { success, error } = useToast();
  const navigate = useNavigate();
  const { organizationId } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    name: "",
    contactPerson: "",
    email: "",
    phone: "",
    paymentTerms: "",
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await api.post("/api/suppliers", data);
      return res.data;
    },
    onSuccess: () => {
      success("Supplier Created", {
        description: `${formData.name} has been added successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      navigate("/dashboard/suppliers");
    },
    onError: (err: any) => {
      error("Error", {
        description: err.message || "Failed to create supplier.",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) return;

    createMutation.mutate({
      name: formData.name,
      // The Supplier schema only has a single free-text contact_info column
      // (no separate phone/email/contact-person fields), so we JSON-encode
      // the form's structured fields into it and decode the same way on read.
      contact_info: JSON.stringify({
        contactPerson: formData.contactPerson,
        phone: formData.phone,
        email: formData.email,
      }),
      payment_terms: formData.paymentTerms,
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard/suppliers")}
          className="mb-4 text-slate-500 hover:text-slate-900 -ml-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Suppliers
        </Button>
        <h1 className="text-2xl font-bold text-slate-900">Add New Supplier</h1>
        <p className="text-sm text-slate-500">Register a new vendor for purchase orders and inventory.</p>
      </div>

      <Card className="border-slate-200 shadow-sm rounded-2xl">
        <CardHeader className="border-b border-slate-100 pb-4 bg-slate-50/50 rounded-t-2xl">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#0aa9ad]" />
            Supplier Details
          </CardTitle>
          <CardDescription>Enter the company information and payment terms below.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Label htmlFor="name" className="text-slate-700 font-medium">Company Name <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  required
                  placeholder="e.g. Global Pharma Ltd"
                  className="rounded-xl border-slate-200 focus-visible:ring-[#0aa9ad]"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="contactPerson" className="text-slate-700 font-medium">Contact Person <span className="text-red-500">*</span></Label>
                <Input
                  id="contactPerson"
                  required
                  placeholder="e.g. Alice Manager"
                  className="rounded-xl border-slate-200 focus-visible:ring-[#0aa9ad]"
                  value={formData.contactPerson}
                  onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
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
                  placeholder="sales@company.com"
                  className="rounded-xl border-slate-200 focus-visible:ring-[#0aa9ad]"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-3 md:col-span-2">
                <Label htmlFor="paymentTerms" className="text-slate-700 font-medium">Payment Terms</Label>
                <Input
                  id="paymentTerms"
                  placeholder="e.g. Net 30, Cash on Delivery"
                  className="rounded-xl border-slate-200 focus-visible:ring-[#0aa9ad]"
                  value={formData.paymentTerms}
                  onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                />
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-xl"
                onClick={() => navigate("/dashboard/suppliers")}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="rounded-xl bg-[#0aa9ad] hover:bg-[#07969a] text-white shadow-md shadow-teal-900/10"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Save className="mr-2 h-4 w-4" /> Save Supplier</>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
