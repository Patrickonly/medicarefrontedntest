import doctorPortrait from "@/assets/doctor-portrait.jpg";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
    ArrowLeft,
    Eye,
    EyeOff,
    HeartPulse,
    Loader2,
    Lock
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

export default function ResetPasswordPage() {
  const { success, error: toastError } = useToast();
  const [searchParams] = useSearchParams();
  const identifier = searchParams.get("identifier") || "";

  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { resetPassword } = useAuth() as any;
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!identifier) {
      toastError("Error", "Missing identifier. Please start the process again.");
      return;
    }

    if (!code || code.length !== 6) {
      toastError("Error", "Please enter a valid 6-digit code.");
      return;
    }

    if (newPassword.length < 8) {
      toastError("Error", "Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toastError("Error", "Passwords do not match.");
      return;
    }

    if (loading) return;

    setLoading(true);
    const { error } = await resetPassword(identifier, code, newPassword, confirmPassword);
    
    if (error) {
      setLoading(false);
      toastError("Error", error.message || "Failed to reset password");
      return;
    }

    setLoading(false);
    success("Success", "Password reset successfully! You can now log in.");
    navigate("/login");
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f5fbfb]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-28 top-16 h-80 w-80 rounded-[5rem] bg-[#e4fafa]" />
        <div className="absolute right-[-120px] bottom-20 h-96 w-96 rounded-[5rem] bg-[#dff8f8]" />
      </div>

      <div className="relative grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-[#0aa9ad] text-white lg:block">
          <img
            src={doctorPortrait}
            alt="Healthcare professional using a clinical tablet"
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-40 mix-blend-overlay"
          />

          <div className="absolute inset-0 bg-gradient-to-tr from-[#057d82]/90 via-[#079ba0]/80 to-[#0aa9ad]/60" />
          
          <div className="absolute left-10 top-10 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#07969a] shadow-xl shadow-teal-950/10">
              <HeartPulse className="h-7 w-7" />
            </div>
            <div>
              <p className="font-heading text-2xl font-extrabold tracking-tight">
                MEDICARE ONE
              </p>
              <p className="text-xs font-black uppercase tracking-[0.26em] text-white/75">
                Healthcare Operations
              </p>
            </div>
          </div>

          <div className="relative z-10 flex min-h-screen flex-col justify-center px-12 py-24 xl:px-16">
            <div className="max-w-xl">
              <div className="mb-7 inline-flex rounded-full bg-white/20 px-4 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-white backdrop-blur">
                Account Recovery
              </div>

              <h1 className="font-heading text-5xl font-extrabold leading-tight tracking-tight xl:text-6xl">
                Create your new password.
              </h1>

              <p className="mt-7 max-w-lg text-lg font-medium leading-relaxed text-teal-50">
                Enter the verification code sent to your email and choose a strong new password for your account.
              </p>
            </div>
          </div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <div className="w-full max-w-xl">
            <Link
              to="/forgot-password"
              className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#5f6d84] transition hover:text-[#07969a]"
            >
              <ArrowLeft size={16} />
              Back
            </Link>

            <div className="rounded-[2.5rem] border border-[#dcebf0] bg-white/95 p-7 shadow-2xl shadow-teal-900/10 backdrop-blur sm:p-9 lg:p-10">
              <div className="text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.6rem] bg-[#0aa9ad] text-white shadow-xl shadow-teal-500/20">
                  <Lock className="h-8 w-8" />
                </div>

                <h2 className="font-heading text-4xl font-extrabold tracking-tight text-[#09111f]">
                  Reset Password
                </h2>
                <p className="mt-2 text-base font-medium text-[#5f6d84]">
                  Enter the code and your new password
                </p>
              </div>

              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label className="mb-2 block text-sm font-black text-[#09111f]">
                    Verification Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    className="h-14 w-full rounded-[1.2rem] border border-[#dcebf0] bg-white px-6 text-center text-2xl font-extrabold tracking-[0.5em] text-[#09111f] outline-none transition placeholder:text-[#9badbd] placeholder:tracking-normal focus:border-[#0aa9ad] focus:ring-4 focus:ring-[#0aa9ad]/10"
                    placeholder="000000"
                    value={code}
                    onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-[#09111f]">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8ba0b8]" />
                    <input
                      type={showPassword ? "text" : "password"}
                      className="h-14 w-full rounded-[1.2rem] border border-[#dcebf0] bg-white px-12 pr-12 text-sm font-bold text-[#09111f] outline-none transition placeholder:text-[#9badbd] focus:border-[#0aa9ad] focus:ring-4 focus:ring-[#0aa9ad]/10"
                      placeholder="At least 8 characters"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5f6d84] transition hover:text-[#07969a]"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-black text-[#09111f]">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8ba0b8]" />
                    <input
                      type={showPassword ? "text" : "password"}
                      className="h-14 w-full rounded-[1.2rem] border border-[#dcebf0] bg-white px-12 text-sm font-bold text-[#09111f] outline-none transition placeholder:text-[#9badbd] focus:border-[#0aa9ad] focus:ring-4 focus:ring-[#0aa9ad]/10"
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-14 w-full rounded-full bg-[#0aa9ad] text-base font-black text-white shadow-xl shadow-teal-500/20 hover:bg-[#07969a]"
                >
                  {loading ? (
                    <>
                      <Loader2 size={19} className="mr-2 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </Button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
