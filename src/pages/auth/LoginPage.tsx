import doctorPortrait from "@/assets/doctor-portrait.jpg";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import {
    ArrowLeft,
    BarChart3,
    Building2,
    Eye,
    EyeOff,
    HeartPulse,
    Loader2,
    Lock,
    Mail,
    ShieldCheck,
    Users
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function LoginPage() {
  const { success, error } = useToast();
  const [showPass, setShowPass] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { signIn, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const redirectedRef = useRef(false);

  useEffect(() => {
    if (redirectedRef.current) return;
    if (user && !authLoading) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, authLoading, navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email || !password) {
      error("Error", "Enter your email address and password.");
      return;
    }

    if (isLoading) return;

    setIsLoading(true);
    const { error: signInError, requiresOtp, userId } = await signIn(email, password);
    
    if (signInError) {
      setIsLoading(false);
      error("Error", signInError.message || "Invalid credentials");
      return;
    }

    setIsLoading(false);

    if (requiresOtp && userId) {
      success("Success", "Check OTP sent to your email/phone!");
      // No userId in the URL - OTPPage derives it from the signed flow
      // session useAuth already stored in sessionStorage during signIn().
      navigate("/otp");
      return;
    }

    success("Success", "Signed in successfully.");
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
            alt="Healthcare professional"
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-overlay"
          />

          <div className="absolute inset-0 bg-gradient-to-tr from-[#057d82]/95 via-[#079ba0]/90 to-[#0aa9ad]/80" />
          
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

          <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-12 xl:px-16 text-center">
            
            <div className="relative mb-12 flex items-center justify-center">
              <div className="absolute h-64 w-64 animate-pulse rounded-full bg-white/5 blur-3xl" />
              <div className="absolute h-48 w-48 rounded-full bg-white/10 blur-2xl" />
              
              <div className="relative grid grid-cols-2 gap-6 p-8">
                <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-white/10 shadow-2xl backdrop-blur-md border border-white/20 transform hover:scale-105 transition-transform">
                  <ShieldCheck className="h-10 w-10 text-white" />
                </div>
                <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-white/10 shadow-2xl backdrop-blur-md border border-white/20 transform hover:scale-105 transition-transform mt-12">
                  <Users className="h-10 w-10 text-white" />
                </div>
                <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-white/10 shadow-2xl backdrop-blur-md border border-white/20 transform hover:scale-105 transition-transform -mt-12">
                  <BarChart3 className="h-10 w-10 text-white" />
                </div>
                <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] bg-white/10 shadow-2xl backdrop-blur-md border border-white/20 transform hover:scale-105 transition-transform">
                  <Building2 className="h-10 w-10 text-white" />
                </div>
              </div>
            </div>

            <div className="max-w-md mx-auto">
              <h1 className="font-heading text-5xl font-extrabold leading-tight tracking-tight text-white mb-6">
                Welcome Back
              </h1>
              <p className="text-lg font-medium leading-relaxed text-teal-50/90">
                Sign in to manage patient records, inventory, and facility workflows from your unified secure workspace.
              </p>
            </div>
          </div>
        </section>

        <section className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <div className="w-full max-w-xl">
            <Link
              to="/"
              className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-[#5f6d84] transition hover:text-[#07969a]"
            >
              <ArrowLeft size={16} />
              Back to home
            </Link>

            <div className="rounded-[2.5rem] border border-[#dcebf0] bg-white/95 p-7 shadow-2xl shadow-teal-900/10 backdrop-blur sm:p-9 lg:p-10">
              <div className="text-center">
                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.6rem] bg-[#0aa9ad] text-white shadow-xl shadow-teal-500/20">
                  <HeartPulse className="h-8 w-8" />
                </div>

                <h2 className="font-heading text-4xl font-extrabold tracking-tight text-[#09111f]">
                  Sign in to your account
                </h2>
                <p className="mt-2 text-base font-medium text-[#5f6d84]">
                  Access your healthcare or agrovet workspace
                </p>
              </div>

              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label className="mb-2 block text-sm font-black text-[#09111f]">
                    Email address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8ba0b8]" />
                    <input
                      type="email"
                      className="h-14 w-full rounded-[1.2rem] border border-[#dcebf0] bg-white px-12 text-sm font-bold text-[#09111f] outline-none transition placeholder:text-[#9badbd] focus:border-[#0aa9ad] focus:ring-4 focus:ring-[#0aa9ad]/10"
                      placeholder="name@facility.rw"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-black text-[#09111f]">
                      Password
                    </label>
                    <Link to="/forgot-password" className="text-sm font-bold text-[#0aa9ad] hover:text-[#07969a] transition">
                      Forgot Password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#8ba0b8]" />
                    <input
                      type={showPass ? "text" : "password"}
                      className="h-14 w-full rounded-[1.2rem] border border-[#dcebf0] bg-white px-12 pr-12 text-sm font-bold text-[#09111f] outline-none transition placeholder:text-[#9badbd] focus:border-[#0aa9ad] focus:ring-4 focus:ring-[#0aa9ad]/10"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#5f6d84] transition hover:text-[#07969a]"
                      onClick={() => setShowPass(!showPass)}
                    >
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="h-14 w-full rounded-full bg-[#0aa9ad] text-base font-black text-white shadow-xl shadow-teal-500/20 hover:bg-[#07969a]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={19} className="mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      <Lock size={18} className="mr-2" />
                      Sign in securely
                    </>
                  )}
                </Button>
              </form>

              <p className="mt-7 text-center text-sm font-semibold text-[#5f6d84]">
                Don&apos;t have an account?{" "}
                <Link to="/register" className="font-black text-[#07969a] hover:text-[#056e72]">
                  Create account
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
