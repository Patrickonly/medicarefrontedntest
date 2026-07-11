import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, CalendarDays, ShieldAlert, Sparkles, AlertTriangle, CheckCircle2, LockKeyhole, Banknote, ShieldCheck, Clock, Smartphone, XCircle } from "lucide-react";
import { PageTransition } from "@/components/ui/page-transition";
import { format } from "date-fns";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useSubscription } from "@/hooks/SubscriptionContext";
import { useAuth } from "@/hooks/useAuth";

export default function SubscriptionActivationView() {
  const { success, error } = useToast();
  const queryClient = useQueryClient();
  const [isRenewModalOpen, setIsRenewModalOpen] = useState(false);
  const [renewalDuration, setRenewalDuration] = useState("1");
  const [paymentMethod, setPaymentMethod] = useState("ONLINE");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [momoPhone, setMomoPhone] = useState("");

  // MoMo is a two-step flow: initiate (returns PENDING + a paymentId), then
  // poll /momo-status until the phone approval resolves. awaitingMomoPaymentId
  // being set drives the "waiting for approval on your phone" screen.
  const [awaitingMomoPaymentId, setAwaitingMomoPaymentId] = useState<string | null>(null);
  const [momoFailed, setMomoFailed] = useState<string | null>(null);
  
  const { subscription, isLoading, refetch } = useSubscription();
  const { userRole } = useAuth();

  const isSuperAdmin = userRole === "super_admin";
  const isOrgAdmin = userRole === "admin" || userRole === "org_owner" || userRole === "owner";
  const canManageBilling = isSuperAdmin || isOrgAdmin;

  const { data: plansData } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      const res = await api.get<{ plans: any[], discounts: any[] }>("/api/subscriptions/plans");
      return res;
    },
    enabled: canManageBilling
  });

  const [selectedPlanId, setSelectedPlanId] = useState<string>("");

  useEffect(() => {
    if (plansData?.plans?.length && !selectedPlanId) {
      // Default to their current plan if it exists, otherwise the first plan
      const currentPlan = plansData.plans.find((p: any) => p.name === subscription?.plan);
      setSelectedPlanId(currentPlan?.id?.toString() || plansData.plans[0].id.toString());
    }
  }, [plansData, subscription, selectedPlanId]);

  const selectedPlan = plansData?.plans?.find((p: any) => p.id.toString() === selectedPlanId);
  const discountForDuration = (months: number) =>
    Number(plansData?.discounts?.find((d: any) => Number(d.months) === months)?.discount_percentage || 0);

  const durationMonths = parseInt(renewalDuration) || 1;
  const discountPercent = discountForDuration(durationMonths);
  const monthlyPrice = Number(selectedPlan?.price || 0);
  const subtotal = monthlyPrice * durationMonths;
  const discountAmount = subtotal * (discountPercent / 100);
  const totalPrice = subtotal - discountAmount;
  const planCurrency = selectedPlan?.currency || "RWF";

  const renewMutation = useMutation({
    mutationFn: async ({ durationMonths, method, receiptUrl, phone }: { durationMonths: number, method: string, receiptUrl?: string, phone?: string }) => {
      const planId = selectedPlanId || plansData?.plans?.[0]?.id || 1;
      const payload = {
        planId: Number(planId),
        months: durationMonths,
        paymentMethod: method === 'ONLINE' ? 'MOMO' : 'MANUAL_INVOICE',
        receiptUrl: receiptUrl,
        ...(method === 'ONLINE' ? { phone } : {}),
      };

      const res: any = await api.post("/api/my-subscription", payload);
      return res;
    },
    onSuccess: async (res) => {
      const isManual = res?.payment?.payment_method === "MANUAL_INVOICE";
      const isMomoPending = res?.payment?.payment_method === "MOMO" && res?.payment?.status === "PENDING";

      if (isMomoPending && res?.payment?.id) {
        // Don't declare success yet — MOMO requires the customer to approve
        // the prompt on their phone. Enter the polling state instead.
        setMomoFailed(null);
        setAwaitingMomoPaymentId(String(res.payment.id));
        return;
      }

      success("Success", res?.message || (isManual ? "Payment submitted for admin approval." : "Your subscription is now active!"));
      await queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
      await refetch();
      setIsRenewModalOpen(false);
      setPaymentSuccess(true);
    },
    onError: (err: any) => {
      error("Renewal Failed", err.message || "Failed to renew subscription. Please try again.");
    },
  });

  // Poll LMBTech's payment status every 4s while waiting for phone approval.
  // This is the source of truth for whether the MOMO payment resolved — the
  // webhook is a latency shortcut only, per the API contract.
  const { data: momoStatusData } = useQuery({
    queryKey: ["momo-status", awaitingMomoPaymentId],
    queryFn: async () => {
      const res: any = await api.get(`/api/subscriptions/momo-status?paymentId=${awaitingMomoPaymentId}`);
      return res?.data;
    },
    enabled: !!awaitingMomoPaymentId,
    refetchInterval: (query) => {
      const st = (query.state.data as any)?.status;
      return st && st !== "PENDING" ? false : 4000;
    },
  });

  useEffect(() => {
    if (!awaitingMomoPaymentId || !momoStatusData) return;
    if (momoStatusData.status === "APPROVED") {
      setAwaitingMomoPaymentId(null);
      queryClient.invalidateQueries({ queryKey: ["my-subscription"] });
      refetch();
      setIsRenewModalOpen(false);
      setPaymentSuccess(true);
    } else if (momoStatusData.status === "REJECTED") {
      setAwaitingMomoPaymentId(null);
      setMomoFailed("The Mobile Money payment was not approved or was declined. You can try again.");
    }
  }, [momoStatusData, awaitingMomoPaymentId]);

  const handleRenew = async () => {
    if (paymentMethod === 'MANUAL') {
      if (!receiptFile) {
        error("Missing Receipt", "Please upload your payment receipt to proceed.");
        return;
      }
      setIsUploading(true);
      try {
        const uploadRes: any = await api.upload("/api/uploads", receiptFile, { fields: { kind: "receipt" } });

        if (uploadRes.success) {
          renewMutation.mutate({ durationMonths: parseInt(renewalDuration), method: paymentMethod, receiptUrl: uploadRes.data.url });
        } else {
          throw new Error(uploadRes.error || "Failed to upload receipt");
        }
      } catch (err: any) {
        error("Upload Failed", err.message || "Could not upload receipt file.");
      } finally {
        setIsUploading(false);
      }
    } else {
      if (!momoPhone.trim()) {
        error("Phone Number Required", "Enter the Mobile Money phone number that will approve this payment.");
        return;
      }
      setMomoFailed(null);
      renewMutation.mutate({ durationMonths: parseInt(renewalDuration), method: paymentMethod, phone: momoPhone.trim() });
    }
  };

  const openPaymentModal = (method: string) => {
    setPaymentMethod(method);
    setMomoPhone("");
    setMomoFailed(null);
    setAwaitingMomoPaymentId(null);
    setIsRenewModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  const isPending = subscription?.status === "PENDING_APPROVAL";
  const isExpired = !subscription || (!subscription.isActive && !isPending);
  const planName = subscription?.plan || "None";
  const status = subscription?.status || "INACTIVE";
  
  const startDate = subscription?.startDate ? new Date(subscription.startDate) : null;
  const endDate = subscription?.endDate ? new Date(subscription.endDate) : null;
  const remainingDays = subscription?.remainingDays || 0;

  // Renewals always extend from today when there's no currently active
  // subscription; only a still-active plan extends from its existing end date.
  // Uses calendar-month arithmetic (not a 30-day approximation) so a
  // 6-month renewal lands 6 calendar months out, not 180 days out.
  const computeNewExpiry = (months: number) => {
    const base = !isExpired && endDate ? new Date(endDate) : new Date();
    const result = new Date(base);
    result.setMonth(result.getMonth() + months);
    return result;
  };
  const newExpiryDate = computeNewExpiry(durationMonths);

  if (paymentSuccess) {
    const isManual = paymentMethod === 'MANUAL';
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center p-8 text-center animate-in zoom-in duration-500 fade-in">
        <div className={`w-28 h-28 rounded-full flex items-center justify-center mb-8 shadow-inner ring-8 ${isManual ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-500 ring-amber-50 dark:ring-amber-900/10' : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500 ring-emerald-50 dark:ring-emerald-900/10'}`}>
          {isManual ? <Clock size={64} strokeWidth={2} /> : <CheckCircle2 size={64} strokeWidth={2} />}
        </div>
        <h2 className="text-4xl font-black mb-4 text-[#09111f] dark:text-white tracking-tight">
          {isManual ? 'Proof Submitted!' : 'Payment Successful!'}
        </h2>
        <p className="text-muted-foreground mb-10 text-xl max-w-lg leading-relaxed font-medium">
          {isManual 
            ? "Your manual payment proof has been submitted and is pending verification. Please wait for an administrator to approve."
            : "Your organization's subscription is now ACTIVE. You can immediately access all system features."}
        </p>
        <Button 
          onClick={() => window.location.href = "/dashboard"} 
          className={`text-white px-10 h-14 rounded-xl font-bold shadow-lg text-lg transition-transform hover:scale-105 ${isManual ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20' : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'}`}
        >
          Continue to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <PageTransition className="p-6 max-w-[1600px] mx-auto space-y-8">
      {/* Empty State Header / Illustration */}
      {isPending && (
        <div className="flex flex-col items-center justify-center p-10 text-center bg-card border border-border shadow-sm rounded-2xl">
          <div className="w-24 h-24 bg-amber-100 dark:bg-amber-900/30 text-amber-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <Clock size={48} strokeWidth={1.5} />
          </div>
          <h2 className="text-3xl font-black mb-3">Subscription Pending</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-6">
            Your manual payment proof has been submitted and is currently under review by an administrator.
            Once verified, your workspace will be fully unlocked.
          </p>
          <Button onClick={() => window.location.reload()} variant="outline" className="px-8 h-12 rounded-xl font-bold border-2">
            Refresh Status
          </Button>
        </div>
      )}

      {isExpired && (
        <div className="flex flex-col items-center justify-center p-10 text-center bg-card border border-border shadow-sm rounded-2xl">
          <div className="w-24 h-24 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-full flex items-center justify-center mb-6 shadow-inner">
            <LockKeyhole size={48} strokeWidth={1.5} />
          </div>
          <h2 className="text-3xl font-black mb-3">No Active Subscription</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-6">
            Your workspace is currently locked because your subscription has expired or is inactive. 
            Activating a subscription unlocks full access to point of sale, inventory management, reports, and team collaboration.
          </p>
          
          {canManageBilling ? (
            <div className="flex gap-4">
               <Button onClick={() => { openPaymentModal('ONLINE'); }} className="bg-[#ea580c] hover:bg-[#c2410c] text-white px-8 h-12 rounded-xl font-bold shadow-lg shadow-orange-500/20 text-md">
                 Pay Online
               </Button>
               <Button onClick={() => { openPaymentModal('MANUAL'); }} variant="outline" className="px-8 h-12 rounded-xl font-bold border-2">
                 Submit Manual Payment
               </Button>
            </div>
          ) : (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-xl p-5 max-w-xl">
              <p className="font-bold text-amber-700 dark:text-amber-500 text-lg">
                This organization does not currently have an active subscription.
              </p>
              <p className="text-amber-600/80 dark:text-amber-400/80 mt-1">
                Please contact your Organization Administrator to renew access.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Subscription Plans & Status */}
      {canManageBilling && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Status Card */}
          <div className="lg:col-span-1">
            <Card className="border-border shadow-sm rounded-2xl h-full flex flex-col relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-full h-1.5 ${isExpired ? 'bg-destructive' : 'bg-emerald-500'}`} />
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <ShieldCheck className={`w-6 h-6 ${isExpired ? 'text-destructive' : 'text-emerald-500'}`} />
                  Subscription Status
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-border/50">
                    <span className="text-muted-foreground font-medium">Current Plan</span>
                    <span className="font-bold">{planName}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-border/50">
                    <span className="text-muted-foreground font-medium">Status</span>
                    <span className={`font-bold px-3 py-1 rounded-full text-xs tracking-wide uppercase ${isPending ? 'bg-amber-500/10 text-amber-600' : isExpired ? 'bg-destructive/10 text-destructive' : 'bg-emerald-500/10 text-emerald-600'}`}>
                      {status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-border/50">
                    <span className="text-muted-foreground font-medium">Start Date</span>
                    <span className="font-semibold">{startDate ? format(startDate, "PP") : "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-border/50">
                    <span className="text-muted-foreground font-medium">End Date</span>
                    <span className="font-semibold">{endDate ? format(endDate, "PP") : "N/A"}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-border/50">
                    <span className="text-muted-foreground font-medium">Days Remaining</span>
                    <span className={`font-bold ${remainingDays < 7 ? 'text-rose-500' : 'text-emerald-600'}`}>
                      {remainingDays} Days
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-border/50">
                    <span className="text-muted-foreground font-medium">Payment Method</span>
                    <span className="font-semibold">{subscription?.paymentMethod || 'N/A'}</span>
                  </div>
                </div>
              </CardContent>
              {remainingDays < 14 && (
                <CardFooter className="bg-muted/30 pt-4">
                  <Button 
                    onClick={() => { openPaymentModal('ONLINE'); }} 
                    className="w-full bg-primary hover:bg-primary/90 font-bold"
                  >
                    Renew Subscription
                  </Button>
                </CardFooter>
              )}
            </Card>
          </div>

          {/* Payment Methods */}
          <div className="lg:col-span-2 space-y-6">
            <h3 className="text-xl font-bold">Payment Methods</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-border shadow-sm rounded-2xl hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center mb-4">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <CardTitle>Online Payment</CardTitle>
                  <CardDescription>Pay instantly using Card, Mobile Money, or other gateways.</CardDescription>
                </CardHeader>
                <CardContent className="pb-6">
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Instant Activation
                    </li>
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Secure Processing
                    </li>
                  </ul>
                  <Button onClick={() => { openPaymentModal('ONLINE'); }} className="w-full font-bold">
                    Pay Online
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border shadow-sm rounded-2xl hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4">
                    <Banknote className="w-6 h-6" />
                  </div>
                  <CardTitle>Manual Payment</CardTitle>
                  <CardDescription>Submit proof of bank transfer or direct deposit.</CardDescription>
                </CardHeader>
                <CardContent className="pb-6">
                  <ul className="space-y-2 mb-6">
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Supports Bank Transfers
                    </li>
                    <li className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Requires Admin Verification
                    </li>
                  </ul>
                  <Button onClick={() => { openPaymentModal('MANUAL'); }} variant="outline" className="w-full font-bold border-2">
                    Submit Manual Payment
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Renew Modal */}
      <Dialog open={isRenewModalOpen} onOpenChange={(open) => { if (!open && !awaitingMomoPaymentId) setIsRenewModalOpen(false); }}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          {awaitingMomoPaymentId ? (
            <div className="py-8 flex flex-col items-center text-center space-y-5">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center shadow-inner">
                <Smartphone className="w-9 h-9 text-primary animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-black mb-2">Waiting for Approval</h3>
                <p className="text-muted-foreground text-sm max-w-xs">
                  A Mobile Money prompt was sent to <strong className="text-foreground">{momoPhone}</strong>. Approve it on your phone to activate your subscription.
                </p>
              </div>
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={() => { setAwaitingMomoPaymentId(null); setMomoFailed("Cancelled. If you already approved it on your phone, refresh to check your subscription status."); }}
              >
                Cancel and close
              </Button>
            </div>
          ) : (
          <>
          <DialogHeader>
            <DialogTitle className="text-xl">
              {paymentMethod === 'ONLINE' ? 'Pay Online' : 'Manual Payment'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {plansData?.plans && plansData.plans.length > 0 && (
              <div className="space-y-3">
                <Label>Select Subscription Plan</Label>
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger className="w-full h-12 rounded-xl border-border bg-background">
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border">
                    {plansData.plans.map((plan: any) => (
                      <SelectItem key={plan.id} value={plan.id.toString()} className="cursor-pointer">
                        {plan.name} - {Number(plan.price).toLocaleString()} RWF/mo
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-3">
              <Label>Select Renewal Duration</Label>
              <Select value={renewalDuration} onValueChange={setRenewalDuration}>
                <SelectTrigger className="w-full h-12 rounded-xl border-border bg-background">
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border">
                  {[1, 3, 6, 12].map((months) => {
                    const pct = discountForDuration(months);
                    const label = months === 12 ? "1 Year Extension" : `${months} Month${months === 1 ? "" : "s"} Extension`;
                    return (
                      <SelectItem key={months} value={months.toString()} className="cursor-pointer">
                        {label}{pct > 0 ? ` (Save ${pct}%)` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            
            {paymentMethod === 'ONLINE' && (
              <div className="space-y-3">
                <Label htmlFor="momo-phone">Mobile Money Phone Number</Label>
                <div className="relative">
                  <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="momo-phone"
                    type="tel"
                    placeholder="07XXXXXXXX"
                    value={momoPhone}
                    onChange={(e) => setMomoPhone(e.target.value)}
                    className="h-12 rounded-xl pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  You'll receive a Mobile Money approval prompt on this number for the amount below.
                </p>
                {momoFailed && (
                  <div className="flex items-start gap-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800/30 text-rose-700 dark:text-rose-400 p-3 rounded-xl text-sm">
                    <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{momoFailed}</span>
                  </div>
                )}
              </div>
            )}

            {paymentMethod === 'MANUAL' && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 text-amber-800 dark:text-amber-500 p-4 rounded-xl text-sm space-y-3">
                <p>
                  <strong>Instructions:</strong> Please transfer the amount to the official Medicare bank account and upload your receipt below.
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="receipt" className="text-amber-900 dark:text-amber-400">Payment Receipt (Image or PDF)</Label>
                  <Input
                    id="receipt"
                    type="file"
                    accept="image/png, image/jpeg, image/webp, application/pdf"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                    className="bg-background/50 border-amber-200 dark:border-amber-800/30 h-10 cursor-pointer"
                  />
                </div>
              </div>
            )}
            
            <div className="bg-muted/50 p-4 rounded-xl border border-border space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Current Expiry:</span>
                <span className="font-medium">{!isExpired && endDate ? format(endDate, "PP") : "N/A (starts today)"}</span>
              </div>
              <div className="flex justify-between items-center text-sm font-semibold pb-3 border-b border-border/50">
                <span>New Expiry:</span>
                <span className="text-primary">{format(newExpiryDate, "PP")}</span>
              </div>
              {selectedPlan && (
                <>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Subtotal ({durationMonths} mo):</span>
                    <span className="font-medium">{planCurrency} {subtotal.toLocaleString()}</span>
                  </div>
                  {discountPercent > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Discount ({discountPercent}%):</span>
                      <span className="font-medium text-emerald-600">- {planCurrency} {discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-base font-bold pt-1">
                    <span>Total Due:</span>
                    <span className="text-primary">{planCurrency} {totalPrice.toLocaleString()}</span>
                  </div>
                </>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenewModalOpen(false)} className="rounded-xl font-semibold">
              Cancel
            </Button>
            <Button
              onClick={handleRenew}
              disabled={renewMutation.isPending || isUploading}
              className="rounded-xl bg-primary hover:bg-primary/90 font-semibold"
            >
              {(renewMutation.isPending || isUploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {paymentMethod === 'ONLINE' ? 'Send Payment Request' : 'Submit Proof'}
            </Button>
          </DialogFooter>
          </>
          )}
        </DialogContent>
      </Dialog>
    </PageTransition>
  );
}
