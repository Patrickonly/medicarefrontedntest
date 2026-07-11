import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { ArrowLeft, HeartPulse, TimerReset } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getFlowSession, hasValidFlowSession, saveFlowSession } from "@/lib/flowSession";

const formatCountdown = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

export default function OTPPage() {
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  // The signed flow session (not the URL) is the only source of truth for
  // which user this is - so the raw id never has to appear in the address
  // bar (previously /otp?userId=5, reachable/guessable by anyone).
  const userId = getFlowSession()?.userId || null;

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [secondsUntilExpiry, setSecondsUntilExpiry] = useState<number | null>(() => {
    const otpExpiresAt = getFlowSession()?.otpExpiresAt;
    if (!otpExpiresAt) return null;
    return Math.max(0, Math.round((new Date(otpExpiresAt).getTime() - Date.now()) / 1000));
  });

  const { verifyOtp } = useAuth() as any;

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Live "code expires in mm:ss" countdown, ticking down every second from
  // the expiry timestamp the backend actually issued - not a fixed guess,
  // so it stays accurate across resends and page refreshes.
  useEffect(() => {
    if (secondsUntilExpiry === null || secondsUntilExpiry <= 0) return;
    const timer = setInterval(() => {
      setSecondsUntilExpiry((s) => (s === null ? null : Math.max(0, s - 1)));
    }, 1000);
    return () => clearInterval(timer);
  }, [secondsUntilExpiry !== null && secondsUntilExpiry > 0]);

  useEffect(() => {
    // Require a flow session issued by a real register/login call;
    // otherwise this page can't legitimately have been reached (there's no
    // URL param to fake anymore), so send them back to log in.
    if (!userId || !hasValidFlowSession("verify-otp", userId)) {
      navigate("/login");
    }
  }, [userId, navigate]);

  const handleVerify = async () => {
    if (!userId) return;
    if (otp.length !== 6) {
      toastError("Error", "Please enter a valid 6-digit code");
      return;
    }

    const flowToken = getFlowSession()?.token;
    setLoading(true);

    try {
      const { error: otpError, user } = await verifyOtp(otp, flowToken);

      if (otpError) {
        toastError("Error", otpError.message || "Invalid OTP");
        setLoading(false);
        return;
      }

      try {
        await api.validateToken();
      } catch (validateError) {
        console.error("Session validation failed right after OTP exchange", validateError);
        toastError("Error", "Session could not be verified. Please log in again.");
        setLoading(false);
        navigate("/login", { replace: true });
        return;
      }

      const organizationId = user?.organizationId || user?.organization_id || null;
      let nextRoute = "/dashboard";

      if (organizationId) {
        try {
          const organizationResponse = await api.get<{ success: boolean; data: any }>(
            `/api/organizations/${organizationId}`,
            { organizationId }
          );
          const organization = organizationResponse.data || {};
          const subscriptionStatus = String(
            organization.subscription_status ||
            organization.subscriptionStatus ||
            organization.status ||
            organization.subscription?.status ||
            ""
          ).toLowerCase();

          if (subscriptionStatus && subscriptionStatus !== "active") {
            // No ids in the URL - SubscriptionPage now derives them from
            // the real session (useAuth) that verifyOtp() just established.
            nextRoute = "/subscription";
          }
        } catch {
          // The user's organization_id can point to an org that was deleted
          // or never existed (orphaned reference) - subscription gating is
          // best-effort here, so fall through to the default /dashboard
          // route rather than surfacing a scary error during login.
        }
      }

      if (nextRoute.startsWith("/subscription")) {
        success("Success", "OTP verified. Your account still needs an active subscription, so we opened the subscription page.");
      } else {
        success("Success", "Verification successful! Welcome back.");
      }

      navigate(nextRoute, { replace: true });
    } catch (err) {
      toastError("Error", "An error occurred during verification");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!userId || resending || resendCooldown > 0) return;

    const currentSession = getFlowSession();
    const flowToken = currentSession?.token;
    setResending(true);
    try {
      const response = await api.post<{ success: boolean; message: string; data?: { otpExpiresAt?: string } }>(
        "/api/auth/otp",
        { type: "LOGIN_2FA", origin: currentSession?.origin },
        flowToken ? { headers: { "x-flow-token": flowToken } } : undefined
      );

      // Restart the "expires in" countdown from the fresh code's real
      // expiry, and persist it so a refresh doesn't reset the clock.
      const otpExpiresAt = response.data?.otpExpiresAt;
      if (otpExpiresAt && currentSession) {
        saveFlowSession({ ...currentSession, otpExpiresAt });
        setSecondsUntilExpiry(Math.max(0, Math.round((new Date(otpExpiresAt).getTime() - Date.now()) / 1000)));
      }

      success("Success", "A new code has been sent to whichever contact methods you have enabled in Notification Preferences.");
      setResendCooldown(30);
    } catch (err: any) {
      toastError("Error", err.message || "Failed to resend the code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 top-20 h-80 w-80 rounded-[5rem] bg-[#e4fafa]" />
        <div className="absolute right-[-120px] bottom-20 h-96 w-96 rounded-[5rem] bg-[#dff8f8]" />
      </div>

      <div className="relative grid min-h-screen lg:grid-cols-[0.95fr_1.05fr]">
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
              <p className="text-xs font-black uppercase tracking-[0.26em] text-white/75">Healthcare Operations</p>
            </div>
          </div>

          <div className="relative z-10 flex min-h-screen flex-col justify-center px-12 py-24 xl:px-16">
            <div className="max-w-xl">
              <div className="mb-7 inline-flex rounded-full bg-card/20 px-4 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-white backdrop-blur">
                Account Verification
              </div>

              <h1 className="font-heading text-5xl font-extrabold leading-tight tracking-tight xl:text-6xl">
                Verify your account to get started
              </h1>

              <p className="mt-7 max-w-lg text-lg font-medium leading-relaxed text-teal-50">
                Enter the verification code we sent to your email address or phone number to securely access your workspace.
              </p>
            </div>
          </div>
        </section>

        {/* Right Column - Form */}
        <section className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <div className="w-full max-w-2xl">
            <Button
              variant="ghost"
              className="mb-6 text-[#5f6d84] hover:text-[#0aa9ad] transition-colors"
              onClick={() => navigate("/login")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Button>

            <div className="rounded-[2.5rem] border border-border bg-card/95 p-7 shadow-2xl shadow-teal-900/10 backdrop-blur sm:p-9">
              <div className="mb-7 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0aa9ad] text-white">
                  <HeartPulse className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-heading text-xl font-extrabold text-[#09111f]">
                    MEDICARE <span className="text-[#07969a]">ONE</span>
                  </p>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#8ba0b8]">Account Verification</p>
                </div>
              </div>

              <Card className="mb-8 border-border shadow-sm">
                <CardHeader>
                  <CardTitle className="text-[#09111f] font-extrabold text-2xl">Verification Code</CardTitle>
                  <CardDescription className="text-[#5f6d84] font-medium text-base">
                    We've sent a 6-digit verification code to your email
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="otp" className="text-sm font-black text-[#09111f]">
                      Enter Code
                    </Label>
                    <div className="flex justify-center mt-2">
                      <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                        <InputOTPGroup className="gap-2">
                          {[0, 1, 2, 3, 4, 5].map((index) => (
                            <InputOTPSlot 
                              key={index} 
                              index={index} 
                              className="w-14 h-16 text-3xl font-extrabold rounded-xl border-2 border-border shadow-sm focus-visible:ring-[#0aa9ad] focus-visible:ring-offset-2 transition-all" 
                            />
                          ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </div>

                  {secondsUntilExpiry !== null && (
                    <div
                      className={`flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold transition-colors ${
                        secondsUntilExpiry > 0
                          ? "border-border bg-muted text-[#5f6d84]"
                          : "border-red-200 bg-red-50 text-red-600"
                      }`}
                    >
                      <TimerReset className="h-4 w-4 shrink-0" />
                      {secondsUntilExpiry > 0 ? (
                        <span>
                          Code expires in{" "}
                          <span className="tabular-nums font-mono text-[#09111f]">
                            {formatCountdown(secondsUntilExpiry)}
                          </span>
                        </span>
                      ) : (
                        <span>Code expired. Please request a new one.</span>
                      )}
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full h-14 rounded-full bg-[#0aa9ad] text-base font-black text-white hover:bg-[#07969a] shadow-xl shadow-teal-500/20 transition-all"
                    size="lg"
                    onClick={handleVerify}
                    disabled={loading || otp.length !== 6 || secondsUntilExpiry === 0}
                  >
                    {loading ? (
                      <>
                        <div className="mr-2 h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Verifying...
                      </>
                    ) : (
                      "Verify & Continue"
                    )}
                  </Button>
                </CardFooter>
              </Card>

              <div className="text-center">
                <p className="text-sm font-semibold text-[#5f6d84]">
                  Didn't receive the code?{" "}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resending || resendCooldown > 0}
                    className="font-black text-[#07969a] hover:text-[#056e72] transition-colors disabled:cursor-not-allowed disabled:text-[#8ba0b8]"
                  >
                    {resending ? "Sending..." : resendCooldown > 0 ? `Resend code (${resendCooldown}s)` : "Resend code"}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}




