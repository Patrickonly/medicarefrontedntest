import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Save, Tag, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const emptyDiscountForm = { months: 1, discount_percentage: 0 };

export default function EditDiscountRulePage() {
  const { id } = useParams<{ id: string }>();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [discountForm, setDiscountForm] = useState(emptyDiscountForm);

  const { data: discountRules = [], isLoading } = useQuery({
    queryKey: ["admin-discount-rules"],
    queryFn: async () => {
      const res = await api.get<any[]>("/api/admin/subscriptions/discount-rules");
      return Array.isArray(res) ? res : (res?.results || res?.data || []);
    },
  });

  useEffect(() => {
    if (discountRules.length > 0 && id) {
      const rule = discountRules.find((r: any) => r.id === id);
      if (rule) {
        setDiscountForm({
          months: rule.months || 1,
          discount_percentage: Number(rule.discount_percentage) || 0,
        });
      }
    }
  }, [discountRules, id]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof discountForm) => {
      return await api.put(`/api/admin/subscriptions/discount-rules?id=${id}`, data);
    },
    onSuccess: () => {
      success("Success", "Discount rule updated successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-discount-rules"] });
      navigate("/dashboard/subscriptions");
    },
    onError: (err: any) => error("Error", err.message || "Failed to update discount rule"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (discountForm.months < 1) {
      error("Error", "Duration must be at least 1 month");
      return;
    }
    updateMutation.mutate(discountForm);
  };

  if (isLoading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#0aa9ad]" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="mb-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/dashboard/subscriptions")}
          className="mb-4 text-muted-foreground hover:text-foreground -ml-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Subscriptions
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0aa9ad]/10 text-[#0aa9ad]">
            <Tag className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Edit Discount Rule</h1>
            <p className="text-muted-foreground mt-1">Update duration and discount percentage.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>Rule Details</CardTitle>
            <CardDescription>Configure duration and discount percentage.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Duration (months)</Label>
                <Input
                  type="number"
                  min={1}
                  value={discountForm.months}
                  onChange={(e) => setDiscountForm({ ...discountForm, months: Number(e.target.value) || 1 })}
                  className="rounded-xl border-border"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Discount Percentage (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={discountForm.discount_percentage}
                  onChange={(e) => setDiscountForm({ ...discountForm, discount_percentage: Number(e.target.value) || 0 })}
                  className="rounded-xl border-border"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/dashboard/subscriptions")}
            className="w-32"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="w-40 bg-[#0aa9ad] hover:bg-[#07969a] text-white"
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
