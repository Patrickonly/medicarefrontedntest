import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const items = [
  {
    icon: ClipboardCheck,
    title: "Structured Implementation",
    desc: "Deployment planning, facility setup and guided onboarding.",
  },
  {
    icon: ShieldCheck,
    title: "Governance & Security",
    desc: "Role-based access, controlled records and audit-ready workflows.",
  },
  {
    icon: Building2,
    title: "Multi-Facility Ready",
    desc: "Hospitals, clinics, pharmacies and healthcare groups.",
  },
];

export default function CTASection() {
  return (
    <section className="relative overflow-hidden bg-background py-20 sm:py-24">
      <div className="medicare-container px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-[2.8rem] bg-[#0aa9ad] px-6 py-12 text-white shadow-2xl shadow-teal-900/10 sm:px-10 lg:px-14"
        >
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-[5rem] bg-card/10" />
          <div className="absolute -bottom-24 right-10 h-80 w-80 rounded-[5rem] bg-card/10" />

          <div className="relative z-10 mx-auto max-w-5xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-card/15 px-4 py-1.5 backdrop-blur">
              <Building2 size={14} />
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-white/90">
                Implementation & Deployment
              </span>
            </div>

            <h2 className="mx-auto mt-6 max-w-4xl font-heading text-[32px] font-extrabold leading-[1.08] tracking-tight sm:text-[44px]">
              Build a stronger healthcare operation with MediCare ONE.
            </h2>

            <p className="mx-auto mt-5 max-w-3xl text-base font-semibold leading-relaxed text-white/85 sm:text-lg">
              Deploy patient administration, clinical workflows, diagnostics,
              pharmacy operations, billing and executive reporting in one
              connected healthcare platform.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {items.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[2rem] border border-white/20 bg-card/12 p-5 backdrop-blur"
                >
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-card text-[#07969a]">
                    <item.icon className="h-6 w-6" />
                  </div>

                  <p className="mt-4 text-sm font-black text-white">
                    {item.title}
                  </p>
                  <p className="mt-2 text-xs font-medium leading-relaxed text-white/75">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/contact">
                <Button
                  size="lg"
                  className="h-12 rounded-full bg-card px-8 text-sm font-black text-[#078b90] shadow-xl shadow-teal-950/10 hover:bg-card/90"
                >
                  Request Consultation
                  <ArrowRight size={17} className="ml-2" />
                </Button>
              </Link>

              <Link to="/pricing">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-full border-white/40 bg-card/10 px-8 text-sm font-black text-white backdrop-blur hover:bg-card/20"
                >
                  Review Pricing
                </Button>
              </Link>
            </div>

            <p className="mt-6 text-xs font-bold text-white/65">
              Hospitals • Clinics • Pharmacies • Diagnostic Centers • Healthcare Networks
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}