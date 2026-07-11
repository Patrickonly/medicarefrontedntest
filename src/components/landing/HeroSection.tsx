import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  ClipboardCheck,
  CreditCard,
  MapPin,
  MessageSquare,
} from "lucide-react";
import hospitalHero from "@/assets/hospital-hero.jpg";
import medicalTeam from "@/assets/medical-team.jpg";

const workflowCards = [
  {
    icon: CalendarCheck,
    title: "Demand forecasting",
    desc: "Track patient appointments, queues and department workload.",
  },
  {
    icon: CreditCard,
    title: "Finance & billing",
    desc: "Control invoices, claims, receipts and facility revenue.",
  },
  {
    icon: MessageSquare,
    title: "Clinical communication",
    desc: "Coordinate patient follow-up, teams and service requests.",
  },
  {
    icon: BarChart3,
    title: "Operational reporting",
    desc: "Monitor performance across facilities and departments.",
  },
];

const mapStats = [
  "Multi-facility control for hospitals and clinics",
  "Patient administration, pharmacy and billing in one system",
  "Implementation support for Rwanda and African healthcare teams",
];

export default function HeroSection() {
  return (
    <section className="medicare-aqua-bg relative overflow-hidden pt-28 pb-20">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-28 top-28 h-72 w-72 rounded-[4rem] bg-[#dff8f8]" />
        <div className="absolute -right-20 top-[34rem] h-56 w-56 rounded-[4rem] bg-[#ecf5f5]" />
        <div className="absolute bottom-16 left-10 h-28 w-28 rounded-[2rem] bg-[#e1f7f8]" />
      </div>

      <div className="medicare-container relative px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="relative overflow-hidden rounded-[2.8rem] bg-[#0aa9ad] px-6 py-10 text-white shadow-2xl shadow-teal-900/10 sm:px-10 lg:px-12"
        >
          <img
            src={hospitalHero}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-12 mix-blend-soft-light"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-[#07969a] via-[#0aa9ad]/95 to-[#0aa9ad]" />

          <div className="relative grid min-h-[470px] items-center gap-8 lg:grid-cols-[0.92fr_1.08fr]">
            <div className="z-10 max-w-lg">
              <div className="mb-5 inline-flex rounded-full bg-card/15 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-white/90 backdrop-blur">
                Enterprise Healthcare Platform
              </div>

              <h1 className="font-heading text-[36px] font-extrabold leading-[1.07] tracking-tight sm:text-[44px] lg:text-[52px]">
                Healthcare management without operational gaps.
              </h1>

              <p className="mt-5 max-w-md text-[15px] font-semibold leading-relaxed text-white/90 sm:text-base">
                MediCare ONE helps hospitals, clinics, pharmacies and diagnostic centers manage patient records, pharmacy stock, billing and service reporting in one secure workspace.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/contact">
                  <Button className="h-12 rounded-full bg-card px-7 text-sm font-black text-[#078b90] shadow-xl shadow-teal-950/10 hover:bg-card/90">
                    View Plans
                    <ArrowRight size={17} className="ml-2" />
                  </Button>
                </Link>

                <Link to="/register">
                  <Button
                    variant="outline"
                    className="h-12 rounded-full border-white/40 bg-card/10 px-7 text-sm font-black text-white backdrop-blur hover:bg-card/20"
                  >
                    Start Implementation
                  </Button>
                </Link>
              </div>
            </div>

            <div className="relative z-10 hidden min-h-[430px] overflow-hidden rounded-[2.2rem] lg:block">
              <img
                src={medicalTeam}
                alt="Healthcare team using MediCare ONE"
                className="h-[430px] w-full rounded-[2.2rem] object-cover object-center shadow-2xl shadow-teal-950/10"
              />

              <div className="absolute right-8 top-12 flex w-64 items-center gap-3 rounded-full bg-card px-4 py-3 shadow-xl">
                <span className="h-4 w-4 rounded-full bg-[#10bfc2]" />
                <span className="h-2 flex-1 rounded-full bg-slate-200" />
              </div>

              <div className="absolute right-12 top-28 flex w-72 items-center gap-3 rounded-full bg-card px-4 py-3 shadow-xl">
                <span className="h-4 w-4 rounded-full bg-[#10bfc2]" />
                <span className="h-2 flex-1 rounded-full bg-slate-200" />
              </div>

              <div className="absolute right-20 top-44 flex w-60 items-center gap-3 rounded-full bg-card px-4 py-3 shadow-xl">
                <span className="h-4 w-4 rounded-full bg-[#10bfc2]" />
                <span className="h-2 flex-1 rounded-full bg-slate-200" />
              </div>
            </div>
          </div>
        </motion.div>

        <section id="benefits" className="mt-16 grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <motion.div
            initial={{ opacity: 0, x: -18 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative min-h-[500px]"
          >
            <div className="absolute left-0 top-12 h-[360px] w-[78%] rounded-[2.8rem] bg-[#10bfc2]" />
            <div className="absolute bottom-12 left-0 h-28 w-28 rounded-[2.3rem] bg-black" />

            <img
              src={medicalTeam}
              alt="Healthcare worker reviewing clinical operations"
              className="absolute left-8 top-0 h-[470px] w-[72%] rounded-[2.8rem] object-cover shadow-2xl shadow-teal-900/10"
            />

            <div className="absolute right-0 top-24 w-[48%] rounded-[2rem] border border-border bg-card p-4 shadow-xl">
              <div className="mb-3 h-4 w-24 rounded-full bg-[#09111f]" />
              <div className="space-y-2">
                {[90, 76, 62, 82, 54].map((width) => (
                  <div key={width} className="h-3 rounded-full bg-muted">
                    <div className="h-3 rounded-full bg-[#10bfc2]" style={{ width: `${width}%` }} />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 18 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:pl-6"
          >
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#07969a]">
              Healthcare Workflow Control
            </p>

            <h2 className="mt-3 font-heading text-[30px] font-extrabold leading-[1.12] tracking-tight text-[#09111f] sm:text-[38px]">
              Run clinical, pharmacy and financial operations from one connected workspace.
            </h2>

            <p className="mt-4 max-w-2xl text-base font-medium leading-relaxed text-[#5e6b84]">
              Replace fragmented tools with structured patient flow, team coordination, billing visibility and pharmacy control built for daily healthcare operations.
            </p>

            <div className="mt-8 space-y-4">
              {workflowCards.map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-4 rounded-[1.7rem] border border-border bg-card p-5 shadow-sm"
                >
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-[#10bfc2] text-white">
                    <item.icon size={21} />
                  </div>
                  <div>
                    <p className="font-heading text-base font-extrabold text-[#09111f]">{item.title}</p>
                    <p className="mt-1 text-sm font-medium leading-relaxed text-[#5e6b84]">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </section>

        <section className="mt-16 grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#07969a]">
              Rwanda & Africa Ready
            </p>
            <h2 className="mt-3 max-w-lg font-heading text-[30px] font-extrabold leading-[1.12] tracking-tight text-[#09111f] sm:text-[38px]">
              Built for healthcare teams working across branches, districts and service lines.
            </h2>

            <div className="mt-7 space-y-4">
              {mapStats.map((item, index) => (
                <div
                  key={item}
                  className="flex items-center gap-4 rounded-[1.7rem] border border-[#bfecef] bg-card p-4 shadow-sm"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e8fbfb] text-lg font-black text-[#07969a]">
                    {index + 1}
                  </div>
                  <p className="text-sm font-extrabold leading-relaxed text-[#4e5f78]">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[430px] overflow-hidden rounded-[2.8rem] bg-[#e8fbfb] p-8">
            <div className="absolute right-10 top-8 h-72 w-72 rounded-full bg-[#10bfc2]/20 blur-3xl" />
            <div className="relative mx-auto h-[330px] max-w-[460px] rounded-[45%] bg-[#10bfc2] shadow-2xl shadow-teal-900/10">
              <div className="absolute left-14 top-12 h-3 w-3 rounded-full bg-card shadow-[0_0_22px_rgba(255,255,255,0.9)]" />
              <div className="absolute right-20 top-20 h-3 w-3 rounded-full bg-card shadow-[0_0_22px_rgba(255,255,255,0.9)]" />
              <div className="absolute bottom-20 left-24 h-3 w-3 rounded-full bg-card shadow-[0_0_22px_rgba(255,255,255,0.9)]" />
              <div className="absolute bottom-12 right-28 h-3 w-3 rounded-full bg-card shadow-[0_0_22px_rgba(255,255,255,0.9)]" />
              <MapPin className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 text-white/80" />
            </div>
          </div>
        </section>

        <section className="mt-16 overflow-hidden rounded-[2.8rem] bg-[#10bfc2] px-6 py-12 text-center text-white shadow-2xl shadow-teal-900/10 sm:px-10">
          <h2 className="font-heading text-[28px] font-extrabold leading-tight sm:text-[38px]">
            Fill your facility schedule, manage services and control operations with fewer steps.
          </h2>

          <div className="relative mt-12 grid gap-6 lg:grid-cols-3">
            {[
              "Set up your facility",
              "Configure departments and services",
              "Start patient and pharmacy operations",
            ].map((item, index) => (
              <div key={item} className="relative rounded-[2rem] border border-white/20 bg-card/10 p-6 backdrop-blur">
                <div className="absolute -top-5 left-1/2 flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full bg-[#056e72] text-sm font-black text-white">
                  {index + 1}
                </div>
                <ClipboardCheck className="mx-auto mt-4 h-9 w-9 text-white" />
                <p className="mt-4 text-sm font-black">{item}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}