import { Link } from "react-router-dom";
import {
  HeartPulse,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";

const footerLinks = {
  Platform: [
    "Patient Administration",
    "Clinical Operations",
    "Diagnostics",
    "Pharmacy Management",
    "Billing & Insurance",
  ],
  Healthcare: [
    "Hospitals",
    "Clinics",
    "Pharmacies",
    "Diagnostic Centers",
    "Healthcare Networks",
  ],
  Governance: [
    "Audit Trail",
    "Access Control",
    "Security",
    "Compliance",
    "Data Protection",
  ],
  Company: [
    "About",
    "Contact",
    "Partners",
    "Implementation Services",
    "Support",
  ],
};

export default function FooterSection() {
  return (
    <footer className="border-t border-[#102030] bg-gradient-to-b from-[#09111f] to-[#040811] text-white">
      <div className="medicare-container px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#10c4c7] to-[#07969a] shadow-lg shadow-cyan-500/20">
                <HeartPulse className="h-6 w-6 text-white" />
              </div>

              <div>
                <p className="font-heading text-[20px] font-extrabold tracking-tight">
                  MEDICARE ONE
                </p>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                  Healthcare Operations Platform
                </p>
              </div>
            </div>

            <p className="mt-5 max-w-md text-sm font-medium leading-relaxed text-muted-foreground">
              Enterprise healthcare management platform connecting patient
              administration, clinical services, diagnostics, pharmacy
              operations, billing, insurance workflows and executive reporting.
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-card/[0.03] px-4 py-3 text-sm text-slate-300">
                <MapPin className="h-4 w-4 text-[#10bfc2]" />
                <span>Kigali, Rwanda</span>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-card/[0.03] px-4 py-3 text-sm text-slate-300">
                <Mail className="h-4 w-4 text-[#10bfc2]" />
                <span>info@medicareone.rw</span>
              </div>

              <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-card/[0.03] px-4 py-3 text-sm text-slate-300">
                <Phone className="h-4 w-4 text-[#10bfc2]" />
                <span>+250 XXX XXX XXX</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {Object.entries(footerLinks).map(([title, links]) => (
                <div key={title}>
                  <h4 className="mb-4 text-sm font-black uppercase tracking-[0.14em] text-white">
                    {title}
                  </h4>

                  <ul className="space-y-3">
                    {links.map((link) => (
                      <li key={link}>
                        <a
                          href="#"
                          className="text-sm font-medium text-muted-foreground transition hover:text-[#7fe8ea]"
                        >
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 rounded-3xl border border-white/10 bg-card/[0.03] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-xl border border-[#10bfc2]/20 bg-[#10bfc2]/10 p-2">
                <ShieldCheck className="h-4 w-4 text-[#7fe8ea]" />
              </div>

              <div>
                <p className="text-sm font-bold text-white">
                  Security & Governance
                </p>
                <p className="text-xs font-medium text-muted-foreground">
                  Audit-ready workflows, role-based access control and healthcare
                  data protection architecture.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-xl border border-[#10bfc2]/20 bg-[#10bfc2]/10 px-3 py-2 text-xs font-bold text-[#7fe8ea]">
                Multi-Facility Ready
              </div>

              <div className="rounded-xl border border-white/10 bg-card/[0.04] px-3 py-2 text-xs font-bold text-slate-300">
                Rwanda & Africa Ready
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-card/[0.03] p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#7fe8ea]">
              Availability
            </p>
            <p className="mt-2 text-lg font-extrabold">
              24/7 Operations
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-card/[0.03] p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#7fe8ea]">
              Deployment
            </p>
            <p className="mt-2 text-lg font-extrabold">
              Cloud & On-Premise
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-card/[0.03] p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#7fe8ea]">
              Coverage
            </p>
            <p className="mt-2 text-lg font-extrabold">
              Multi-Facility Healthcare
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-medium text-muted-foreground">
            © 2026 MediCare ONE. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center gap-5">
            <Link to="/about" className="text-xs font-medium text-muted-foreground transition hover:text-[#7fe8ea]">
              About
            </Link>

            <Link to="/contact" className="text-xs font-medium text-muted-foreground transition hover:text-[#7fe8ea]">
              Contact
            </Link>

            <Link to="/privacy" className="text-xs font-medium text-muted-foreground transition hover:text-[#7fe8ea]">
              Privacy
            </Link>

            <Link to="/terms" className="text-xs font-medium text-muted-foreground transition hover:text-[#7fe8ea]">
              Terms
            </Link>

            <Link to="/security" className="text-xs font-medium text-muted-foreground transition hover:text-[#7fe8ea]">
              Security
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}