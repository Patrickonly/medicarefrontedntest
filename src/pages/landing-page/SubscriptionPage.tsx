import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, ArrowRight, CheckCircle, CreditCard, Download, FileImage, FileText,
  HeartPulse, Loader2, Shield, Star, UploadCloud, X, Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { getFlowSession, saveFlowSession, hasValidFlowSession } from "@/lib/flowSession";
import { useAuth } from "@/hooks/useAuth";

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string | number;
  features: Record<string, unknown>;
}

interface DiscountRule {
  id: string;
  months: number;
  discount_percentage: string | number;
}

const TIER_ICONS = [Zap, Star, Shield];
const MAX_RECEIPT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB, matches the on-screen copy
const ACCEPTED_RECEIPT_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];

export default function SubscriptionPage() {
  const { success, error } = useToast();
  const flowSession = getFlowSession();
  const { user, organizationId: sessionOrganizationId } = useAuth();
  // This page is reached two ways, neither of which should ever put an id
  // in the URL: (1) mid-registration, before any session exists - identity
  // comes from the signed flow session; (2) an already-authenticated user
  // whose subscription lapsed - identity comes from the real session
  // (useAuth), which OTPPage's post-verify redirect relies on since the
  // flow session is intentionally cleared once verification succeeds.
  const userId = flowSession?.userId || user?.id || null;
  const organizationId = flowSession?.organizationId || sessionOrganizationId || null;
  const hasSession = !!user;
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"ONLINE" | "MANUAL">("ONLINE");
  const [loading, setLoading] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [downloading, setDownloading] = useState<"pdf" | "image" | null>(null);
  const [receipt, setReceipt] = useState<{
    reference: string;
    planName: string;
    billingCycle: "monthly" | "yearly";
    amount: number;
    startDate: Date;
    endDate: Date;
  } | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Proof-of-payment upload for manual/bank-transfer subscriptions - the
  // backend requires a receiptUrl for MANUAL_INVOICE payments.
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    // Legitimate here means either: a real logged-in session (the
    // OTPPage "your subscription lapsed" redirect), or a flow session
    // issued by a real /api/auth/register call. Neither can be faked by
    // typing a URL, since there's no id in the URL to type anymore.
    if (!userId || !organizationId) {
      error("Error", "Invalid session. Please register first.");
      navigate("/register");
      return;
    }
    if (!hasSession && !hasValidFlowSession("subscribe", userId)) {
      error("Error", "Invalid session. Please register first.");
      navigate("/register");
    }
  }, [userId, organizationId, hasSession, navigate]);

  const { data, isLoading: plansLoading } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      return api.get<{ plans: SubscriptionPlan[]; discounts: DiscountRule[] }>("/api/subscriptions/plans");
    },
  });

  const months = billingCycle === "yearly" ? 12 : 1;

  // Real, active plans sorted cheapest -> priciest, mapped onto the existing
  // 3-tier visual layout (Starter/Professional/Enterprise-style cards).
  // Duplicate/test plan rows in the data just mean we show whatever the
  // three cheapest currently-active plans are - no plan names are hardcoded.
  const tierPlans = useMemo(() => {
    const plans = data?.plans || [];
    return [...plans].sort((a, b) => Number(a.price) - Number(b.price)).slice(0, 3);
  }, [data]);

  useEffect(() => {
    if (!selectedPlanId && tierPlans.length > 0) {
      setSelectedPlanId(tierPlans[Math.min(1, tierPlans.length - 1)].id);
    }
  }, [tierPlans, selectedPlanId]);

  const selectedPlan = tierPlans.find((p) => p.id === selectedPlanId) || null;

  const discountForMonths = (data?.discounts || []).find((d) => d.months === months);
  const discountPct = discountForMonths ? Number(discountForMonths.discount_percentage) : 0;

  const getTotal = () => {
    if (!selectedPlan) return 0;
    const base = Number(selectedPlan.price) * months;
    return Math.round(base - base * (discountPct / 100));
  };

  const featureList = (plan: SubscriptionPlan) =>
    Object.entries(plan.features || {})
      .filter(([, v]) => v === true)
      .map(([k]) => k.replace(/_/g, " "))
      .slice(0, 4);

  const handleNextStep = () => setStep((s) => Math.min(s + 1, 2));
  const handlePrevStep = () => setStep((s) => Math.max(s - 1, 1));

  const handleProofFileChange = async (file: File | null) => {
    if (!file) {
      setProofFile(null);
      setProofUrl(null);
      return;
    }

    if (!ACCEPTED_RECEIPT_TYPES.includes(file.type)) {
      error("Error", "Please upload a PDF, PNG, JPG or WEBP file.");
      return;
    }

    if (file.size > MAX_RECEIPT_SIZE_BYTES) {
      error("Error", "File is too large. Maximum receipt size is 10MB.");
      return;
    }

    setProofFile(file);
    setProofUrl(null);
    setUploadingProof(true);
    try {
      const res = await api.upload<{ success: boolean; data: { url: string } }>(
        "/api/uploads",
        file,
        { fields: { kind: "receipt" } }
      );
      setProofUrl(res.data.url);
    } catch (err: any) {
      error("Error", err?.message || "Failed to upload receipt");
      setProofFile(null);
    } finally {
      setUploadingProof(false);
    }
  };

  const clearProofFile = () => {
    setProofFile(null);
    setProofUrl(null);
  };

  const handleReceiptDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    if (uploadingProof) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleProofFileChange(file);
  };

  const handleSubscribe = async () => {
    if (!userId || !organizationId || !selectedPlan) return;

    if (paymentMethod === "MANUAL" && !proofUrl) {
      error("Error", "Please upload your payment receipt (PDF or image) before continuing.");
      return;
    }

    if (paymentMethod === "ONLINE" && !phoneNumber) {
      error("Error", "Please enter your Mobile Money phone number before continuing.");
      return;
    }

    setLoading(true);
    try {
      const startDate = new Date();
      const endDate = new Date();
      if (billingCycle === "yearly") {
        endDate.setFullYear(startDate.getFullYear() + 1);
      } else {
        endDate.setMonth(startDate.getMonth() + 1);
      }

      const flowToken = flowSession?.token;
      const response = await api.post<{ message: string; subscription?: any; payment?: any; flowToken?: string }>(
        "/api/subscriptions/subscribe",
        {
          organizationId,
          planId: selectedPlan.id,
          months,
          paymentMethod: paymentMethod === "ONLINE" ? "MOMO" : "MANUAL_INVOICE",
          phone: paymentMethod === "ONLINE" ? phoneNumber : undefined,
          receiptUrl: paymentMethod === "MANUAL" ? proofUrl : undefined,
        },
        flowToken ? { headers: { "x-flow-token": flowToken } } : undefined
      );

      // Subscribe hands back a fresh flow token scoped to the next step
      // (verify-otp) so the OTP page can be gated the same way. Subscribe
      // itself doesn't send a new code, so carry over the expiry from the
      // code register() already sent - that's still the one being asked for.
      if (response.flowToken && userId) {
        saveFlowSession({
          token: response.flowToken,
          userId,
          organizationId: organizationId || undefined,
          step: "verify-otp",
          origin: flowSession?.origin || "register",
          otpExpiresAt: flowSession?.otpExpiresAt,
        });
      }

      success("Success", "Subscription Setup Complete! Please verify your account.");

      if (paymentMethod === "MANUAL") {
        setReceipt({
          reference: response?.payment?.id ? `SUB-${response.payment.id}` : `SUB-${Date.now()}`,
          planName: selectedPlan.name,
          billingCycle,
          amount: getTotal(),
          startDate,
          endDate,
        });
        setReceiptOpen(true);
      } else {
        // No userId in the URL - OTPPage derives it from the flow session
        // this subscribe call just refreshed above.
        navigate("/otp");
      }
    } catch (err: any) {
      error("Error", err?.message || "Failed to setup subscription");
    } finally {
      setLoading(false);
    }
  };

  const handleReceiptClose = () => {
    setReceiptOpen(false);
    if (userId) navigate("/otp");
  };

  const handleDownloadPdf = async () => {
    if (!receiptRef.current) return;
    setDownloading("pdf");
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ unit: "px", format: [canvas.width, canvas.height] });
      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`${receipt?.reference || "receipt"}.pdf`);
    } catch {
      error("Error", "Failed to generate PDF receipt.");
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadImage = async () => {
    if (!receiptRef.current) return;
    setDownloading("image");
    try {
      const canvas = await html2canvas(receiptRef.current, { scale: 2, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = `${receipt?.reference || "receipt"}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch {
      error("Error", "Failed to generate image receipt.");
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-20 h-80 w-80 rounded-[5rem] bg-[#e4fafa]" />
        <div className="absolute right-[-120px] bottom-20 h-96 w-96 rounded-[5rem] bg-[#dff8f8]" />
      </div>

      <div className="relative grid min-h-screen lg:grid-cols-[0.8fr_1.2fr]">
        {/* Left Column - Branded Side */}
        <section className="relative hidden overflow-hidden bg-[#0aa9ad] text-white lg:block">
          <div className="absolute inset-0 bg-gradient-to-tr from-[#057d82]/90 via-[#079ba0]/80 to-[#0aa9ad]/60" />
          <div className="absolute -bottom-24 -left-16 h-72 w-72 rounded-[5rem] bg-card/10" />
          <div className="absolute right-10 top-28 h-52 w-52 rounded-[4rem] bg-card/10" />

          <div className="absolute left-10 top-10 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-card text-[#07969a] shadow-xl shadow-teal-950/10">
              <HeartPulse className="h-7 w-7" />
            </div>
            <div>
              <p className="font-heading text-2xl font-extrabold tracking-tight">MEDICARE ONE</p>
              <p className="text-xs font-black uppercase tracking-[0.26em] text-white/75">
                Healthcare Operations
              </p>
            </div>
          </div>

          <div className="relative z-10 flex min-h-screen flex-col justify-center px-12 py-24 xl:px-16">
            <div className="max-w-xl">
              <div className="mb-7 inline-flex rounded-full bg-card/20 px-4 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-white backdrop-blur">
                Step {step} of 2
              </div>

              <h1 className="font-heading text-4xl font-extrabold leading-tight tracking-tight xl:text-5xl">
                {step === 1 && "Choose the perfect plan for your business"}
                {step === 2 && "Secure your subscription"}
              </h1>

              <p className="mt-7 max-w-lg text-lg font-medium leading-relaxed text-teal-50">
                {step === 1 && "Get full access to MedicareOne features tailored for your Healthcare Facility"}
                {step === 2 && "Complete your setup safely using our secure payment gateway."}
              </p>

              <div className="mt-12">
                <div className="flex items-center gap-4">
                  {[1, 2].map((s) => (
                    <div key={s} className="flex items-center gap-2">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold transition-colors ${step >= s ? "bg-card text-[#0aa9ad]" : "bg-card/20 text-white"}`}>
                        {s < step ? <CheckCircle className="h-5 w-5" /> : s}
                      </div>
                      {s < 2 && <div className={`h-1 w-12 rounded-full ${step > s ? "bg-card" : "bg-card/20"}`} />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column - Wizard */}
        <section className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <div className="w-full max-w-4xl">
            <Button
              variant="ghost"
              className="mb-6 text-[#5f6d84] hover:text-[#0aa9ad] transition-colors"
              onClick={() => step === 1 ? navigate(-1) : handlePrevStep()}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {step === 1 ? "Go Back" : "Back"}
            </Button>

            <div className="rounded-[2.5rem] border border-border bg-card/95 p-7 shadow-2xl shadow-teal-900/10 backdrop-blur sm:p-9 min-h-[600px] flex flex-col">

              {/* --- STEP 1: Plan Selection --- */}
              {step === 1 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex-1 flex flex-col">
                  <div className="mb-7 flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h2 className="font-heading text-2xl font-extrabold text-[#09111f]">Select a Plan</h2>
                      <p className="text-sm text-[#5f6d84]">Choose the duration for your subscription.</p>
                    </div>
                    <Tabs
                      defaultValue="monthly"
                      onValueChange={(v) => setBillingCycle(v as "monthly" | "yearly")}
                      className="w-[280px]"
                    >
                      <TabsList className="w-full grid grid-cols-2 bg-muted">
                        <TabsTrigger value="monthly" className="data-[state=active]:bg-card rounded-full">Monthly</TabsTrigger>
                        <TabsTrigger value="yearly" className="data-[state=active]:bg-card rounded-full">Yearly</TabsTrigger>
                      </TabsList>
                    </Tabs>
                  </div>

                  {plansLoading ? (
                    <div className="flex-1 flex items-center justify-center py-20">
                      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                      {tierPlans.map((plan, idx) => {
                        const Icon = TIER_ICONS[idx] || Zap;
                        const isSelected = selectedPlanId === plan.id;
                        const total = Math.round(
                          Number(plan.price) * months - Number(plan.price) * months * (discountPct / 100)
                        );
                        return (
                          <div
                            key={plan.id}
                            className={`relative rounded-[1.6rem] border p-6 cursor-pointer transition-all ${
                              isSelected
                                ? "border-[#0aa9ad] bg-[#e8fbfb] shadow-lg ring-1 ring-[#0aa9ad]"
                                : "border-border bg-card hover:border-[#8ee4e7]"
                            }`}
                            onClick={() => setSelectedPlanId(plan.id)}
                          >
                            {idx === 1 && (
                              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                <span className="bg-[#0aa9ad] text-white px-4 py-1 rounded-full text-[10px] font-bold">POPULAR</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 mb-4">
                              <Icon className="h-5 w-5 text-[#07969a]" />
                              <h3 className="text-xl font-bold text-[#09111f]">{plan.name}</h3>
                            </div>
                            <div className="mb-4">
                              <span className="text-3xl font-extrabold text-[#09111f]">
                                {total.toLocaleString()}
                              </span>
                              <span className="text-sm text-[#5f6d84]"> RWF/{billingCycle === "monthly" ? "mo" : "yr"}</span>
                            </div>
                            <ul className="space-y-3 mb-6 text-sm text-[#5f6d84] capitalize">
                              {featureList(plan).length > 0 ? (
                                featureList(plan).map((f) => (
                                  <li key={f} className="flex gap-2">
                                    <CheckCircle className="h-4 w-4 text-[#07969a] shrink-0" /> {f}
                                  </li>
                                ))
                              ) : (
                                <li className="flex gap-2">
                                  <CheckCircle className="h-4 w-4 text-[#07969a] shrink-0" /> Full platform access
                                </li>
                              )}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="mt-auto pt-6 flex justify-end border-t border-border">
                    <Button
                      className="h-12 px-8 rounded-full bg-[#0aa9ad] hover:bg-[#07969a] text-white shadow-xl shadow-teal-500/20 font-black"
                      onClick={handleNextStep}
                      disabled={!selectedPlan}
                    >
                      Continue <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* --- STEP 2: Payment --- */}
              {step === 2 && (
                <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex-1 flex flex-col">
                  <div className="mb-7">
                    <h2 className="font-heading text-2xl font-extrabold text-[#09111f]">Payment Method</h2>
                    <p className="text-sm text-[#5f6d84]">Choose how you'd like to securely pay for your subscription.</p>
                  </div>

                  <div className="mb-8 max-w-2xl mx-auto w-full">
                    <RadioGroup
                      defaultValue="ONLINE"
                      onValueChange={(v) => setPaymentMethod(v as "ONLINE" | "MANUAL")}
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    >
                      <div>
                        <RadioGroupItem value="ONLINE" id="online" className="peer sr-only" />
                        <Label
                          htmlFor="online"
                          className="flex flex-col items-center justify-between rounded-[1.6rem] border-2 border-border bg-card p-6 hover:bg-[#e8fbfb] peer-data-[state=checked]:border-[#0aa9ad] [&:has([data-state=checked])]:bg-[#f0fcfc] cursor-pointer transition-all"
                        >
                          <CreditCard className="mb-3 h-10 w-10 text-[#5f6d84] peer-data-[state=checked]:text-[#0aa9ad]" />
                          <div className="text-center">
                            <p className="font-bold text-[#09111f]">Online Payment</p>
                            <p className="text-sm text-[#5f6d84]">Cards & Mobile Money</p>
                          </div>
                        </Label>
                      </div>
                      <div>
                        <RadioGroupItem value="MANUAL" id="manual" className="peer sr-only" />
                        <Label
                          htmlFor="manual"
                          className="flex flex-col items-center justify-between rounded-[1.6rem] border-2 border-border bg-card p-6 hover:bg-[#e8fbfb] peer-data-[state=checked]:border-[#0aa9ad] [&:has([data-state=checked])]:bg-[#f0fcfc] cursor-pointer transition-all"
                        >
                          <Shield className="mb-3 h-10 w-10 text-[#5f6d84] peer-data-[state=checked]:text-[#0aa9ad]" />
                          <div className="text-center">
                            <p className="font-bold text-[#09111f]">Manual Payment</p>
                            <p className="text-sm text-[#5f6d84]">Bank Transfer</p>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {paymentMethod === "MANUAL" && (
                    <div className="mb-8 max-w-2xl mx-auto w-full">
                      <Label className="mb-2 block text-sm font-bold text-[#09111f]">
                        Upload your payment receipt (PDF or image)
                      </Label>
                      <label
                        htmlFor="receipt-upload"
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleReceiptDrop}
                        className="relative flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#0aa9ad]/40 bg-muted p-8 text-center cursor-pointer hover:bg-[#eefbfb] transition-colors"
                      >
                        {proofFile && !uploadingProof && (
                          <button
                            type="button"
                            aria-label="Remove uploaded file"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              clearProofFile();
                            }}
                            className="absolute right-3 top-3 rounded-full bg-card p-1.5 text-[#5f6d84] shadow hover:text-red-600 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                        {uploadingProof ? (
                          <Loader2 className="h-8 w-8 animate-spin text-[#0aa9ad]" />
                        ) : (
                          <UploadCloud className="h-8 w-8 text-[#0aa9ad]" />
                        )}
                        <p className="text-sm font-semibold text-[#09111f]">
                          {proofFile ? proofFile.name : "Drag & drop or click to upload your bank transfer receipt"}
                        </p>
                        <p className="text-xs text-[#5f6d84]">PDF, PNG, JPG or WEBP - up to 10MB</p>
                        {proofUrl && (
                          <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                            <CheckCircle className="h-3.5 w-3.5" /> Uploaded successfully
                          </p>
                        )}
                        <input
                          id="receipt-upload"
                          type="file"
                          accept="application/pdf,image/png,image/jpeg,image/jpg,image/webp"
                          className="hidden"
                          onChange={(e) => handleProofFileChange(e.target.files?.[0] || null)}
                        />
                      </label>
                    </div>
                  )}

                  {paymentMethod === "ONLINE" && (
                    <div className="mb-8 max-w-2xl mx-auto w-full">
                      <Label className="mb-2 block text-sm font-bold text-[#09111f]">
                        Mobile Money Phone Number
                      </Label>
                      <input
                        type="tel"
                        className="h-14 w-full rounded-[1.2rem] border border-border bg-card px-6 text-sm font-bold text-[#09111f] outline-none transition placeholder:text-[#9badbd] focus:border-[#0aa9ad] focus:ring-4 focus:ring-[#0aa9ad]/10"
                        placeholder="e.g. 078XXXXXXX"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="bg-muted rounded-2xl p-6 mb-8 border border-border">
                    <div className="flex justify-between items-center mb-4 pb-4 border-b border-border">
                      <span className="text-[#5f6d84] font-medium">Selected Plan</span>
                      <span className="font-bold text-[#09111f]">{selectedPlan?.name || "-"} ({billingCycle})</span>
                    </div>
                    <div className="flex justify-between items-center text-lg">
                      <span className="text-[#09111f] font-bold">Total Due</span>
                      <span className="font-extrabold text-[#07969a]">{getTotal().toLocaleString()} RWF</span>
                    </div>
                  </div>

                  <div className="mt-auto pt-6 flex flex-col sm:flex-row justify-between gap-4 border-t border-border">
                    <p className="text-xs text-[#5f6d84] self-center flex items-center gap-1 font-semibold">
                      <Shield className="h-4 w-4 text-[#0aa9ad]" /> Secure, encrypted setup
                    </p>
                    <Button
                      className="h-14 px-10 rounded-full bg-[#0aa9ad] text-base font-black text-white hover:bg-[#07969a] shadow-xl shadow-teal-500/20"
                      onClick={handleSubscribe}
                      disabled={loading || uploadingProof || (paymentMethod === "MANUAL" && !proofUrl)}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        `Complete Setup`
                      )}
                    </Button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </section>
      </div>

      {/* Manual Payment Receipt Dialog */}
      <Dialog open={receiptOpen} onOpenChange={(open) => !open && handleReceiptClose()}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader className="text-center pb-2 border-b border-dashed border-border">
            <DialogTitle className="text-xl font-black">SUBSCRIPTION RECEIPT</DialogTitle>
            <p className="text-xs text-muted-foreground">MEDICARE ONE</p>
          </DialogHeader>
          {receipt && (
            <div ref={receiptRef} className="bg-card py-4 space-y-4 font-mono text-xs text-slate-700">
              <div className="text-center pb-2">
                <p className="text-sm font-black">MEDICARE ONE</p>
                <p className="text-[10px] text-muted-foreground">Healthcare Operations Platform</p>
              </div>
              <div className="flex justify-between">
                <span>Reference:</span>
                <span>{receipt.reference}</span>
              </div>
              <div className="flex justify-between">
                <span>Date:</span>
                <span>{receipt.startDate.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Plan:</span>
                <span>{receipt.planName} ({receipt.billingCycle})</span>
              </div>
              <div className="flex justify-between">
                <span>Valid Until:</span>
                <span>{receipt.endDate.toLocaleDateString()}</span>
              </div>
              <div className="border-t border-b border-dashed border-border py-2">
                <div className="flex justify-between font-bold text-sm">
                  <span>TOTAL (RWF):</span>
                  <span>{receipt.amount.toLocaleString()}</span>
                </div>
              </div>
              <div className="pt-2 text-center text-[10px] text-muted-foreground">
                <p>Payment Method: Manual (Bank Transfer)</p>
                <p className="mt-1 text-amber-600 font-semibold">
                  Payment pending verification. Please complete your bank transfer
                  and keep this receipt as proof of your subscription request.
                </p>
                <p className="mt-2 font-bold">THANK YOU FOR CHOOSING MEDICARE ONE</p>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <div className="flex w-full gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDownloadPdf}
                disabled={downloading !== null}
              >
                {downloading === "pdf" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                Download PDF
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleDownloadImage}
                disabled={downloading !== null}
              >
                {downloading === "image" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileImage className="mr-2 h-4 w-4" />
                )}
                Download Image
              </Button>
            </div>
            <Button className="w-full bg-[#0aa9ad] hover:bg-[#07969a]" onClick={handleReceiptClose}>
              <Download className="mr-2 h-4 w-4" /> Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
