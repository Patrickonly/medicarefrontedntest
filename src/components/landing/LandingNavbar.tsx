import { useState } from "react";
import { Link } from "react-router-dom";
import { HeartPulse, Menu, X, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const navLinks = [
  { label: "Home", href: "/" },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#benefits" },
  { label: "Modules", href: "#modules" },
  { label: "Pricing", href: "#pricing" },
];

export default function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-card/95 backdrop-blur-xl">
      <div className="medicare-container flex h-[72px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#10c4c7] to-[#07969a] text-white shadow-lg shadow-cyan-500/25">
            <HeartPulse size={22} strokeWidth={2.6} />
          </div>

          <div className="leading-none">
            <p className="font-heading text-[19px] font-extrabold tracking-tight text-[#09111f]">
              MEDICARE ONE
            </p>
            <p className="mt-1 hidden text-[10px] font-extrabold uppercase tracking-[0.22em] text-[#8ba0b8] sm:block">
              Healthcare Operations
            </p>
          </div>
        </Link>

        <div className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="rounded-full px-4 py-2 text-[13px] font-extrabold text-[#4e5f78] transition hover:bg-[#e8fbfb] hover:text-[#078b90]"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-3 lg:flex">
          <Link to="/login">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full px-5 text-[13px] font-extrabold text-[#4e5f78] hover:bg-[#e8fbfb] hover:text-[#078b90]"
            >
              Sign In
            </Button>
          </Link>

          <Link to="/register">
            <Button
              size="sm"
              className="h-11 rounded-full bg-gradient-to-r from-[#10bfc2] to-[#078f94] px-7 text-[13px] font-extrabold text-white shadow-lg shadow-cyan-500/20 hover:from-[#0aaeb1] hover:to-[#067f83]"
            >
              Sign Up
            </Button>
          </Link>
        </div>

        <button
          className="rounded-2xl p-2 text-[#4e5f78] hover:bg-[#e8fbfb] hover:text-[#078b90] lg:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-b border-border bg-card lg:hidden"
          >
            <div className="space-y-1 px-4 py-4">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="block rounded-2xl px-4 py-3 text-sm font-extrabold text-[#4e5f78] hover:bg-[#e8fbfb] hover:text-[#078b90]"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </a>
              ))}

              <div className="grid gap-2 pt-3">
                <Link to="/login">
                  <Button variant="outline" className="w-full rounded-full font-extrabold">
                    Sign In
                  </Button>
                </Link>

                <Link to="/register">
                  <Button className="w-full rounded-full bg-gradient-to-r from-[#10bfc2] to-[#078f94] font-extrabold text-white">
                    Sign Up
                  </Button>
                </Link>
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-3xl border border-border bg-muted p-4">
                <Building2 className="h-5 w-5 text-[#078b90]" />
                <p className="text-xs font-bold leading-relaxed text-[#5e6b84]">
                  Hospitals, clinics, pharmacies, laboratories and healthcare networks.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}