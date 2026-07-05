import { motion } from "framer-motion";
import {
  BarChart3,
  Building2,
  ClipboardCheck,
  Database,
  FlaskConical,
  HeartPulse,
  Pill,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import LandingNavbar from "@/components/landing/LandingNavbar";
import FooterSection from "@/components/landing/FooterSection";
import hospitalReception from "@/assets/hospital-reception.jpg";
import medicalTeam from "@/assets/medical-team.jpg";

const focusAreas = [
  { label: "Patient Administration", icon: Users },
  { label: "Clinical Operations", icon: Stethoscope },
  { label: "Pharmacy Management", icon: Pill },
  { label: "Diagnostics", icon: FlaskConical },
];

const principles = [
  {
    icon: ShieldCheck,
    title: "Governance by Design",
    desc: "Access control, audit trails and operational accountability are treated as core system requirements.",
  },
  {
    icon: ClipboardCheck,
    title: "Workflow Discipline",
    desc: "Modules are structured around real facility operations: registration, triage, consultation, dispensing, billing and reporting.",
  },
  {
    icon: Database,
    title: "Reliable Records",
    desc: "Structured clinical, administrative and financial records for long-term healthcare operations.",
  },
  {
    icon: BarChart3,
    title: "Operational Visibility",
    desc: "Clear reporting on patient flow, pharmacy stock, revenue cycle, bed occupancy and department workload.",
  },
];

const roadmap = [
  "Multi-facility healthcare organization management",
  "Patient registry and longitudinal medical records",
  "Appointments, triage, consultation and clinical documentation",
  "Pharmacy dispensing, inventory, batch and expiry control",
  "Laboratory orders, specimen tracking and results workflow",
  "Billing, insurance claims and revenue cycle management",
  "Audit trail, role-based access and security administration",
  "Executive reporting for hospital, clinic and pharmacy operations",
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#f5fbfb]">
      <LandingNavbar />

      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <img
            src={hospitalReception}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-14"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-[#f5fbfb]/95 to-[#f5fbfb]" />
          <div className="absolute -left-24 top-24 h-80 w-80 rounded-[5rem] bg-[#e4fafa]" />
          <div className="absolute right-[-120px] bottom-20 h-96 w-96 rounded-[5rem] bg-[#dff8f8]" />
        </div>

        <div className="medicare-container relative px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mx-auto max-w-4xl text-center"
          >
            <span className="inline-flex rounded-full border border-[#bceef0] bg-white px-5 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#07969a]">
              About MediCare ONE
            </span>

            <h1 className="mt-6 font-heading text-[36px] font-extrabold leading-[1.08] tracking-tight text-[#09111f] sm:text-[46px] lg:text-[54px]">
              Building a professional healthcare management platform for Rwanda and Africa.
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-base font-semibold leading-relaxed text-[#5f6d84] sm:text-lg">
              MediCare ONE is being developed as an enterprise healthcare operations system for hospitals, clinics, pharmacies, diagnostic centers and healthcare networks that need stronger control over patient care, facility operations, inventory, billing and governance.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="border-y border-[#dcebf0] bg-white py-14">
        <div className="medicare-container px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {focusAreas.map((area, index) => (
              <motion.div
                key={area.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06 }}
                className="rounded-[2rem] border border-[#dcebf0] bg-[#f6fbfb] p-6 transition hover:border-[#8ee4e7] hover:bg-[#e8fbfb]"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0aa9ad] text-white">
                  <area.icon className="h-6 w-6" />
                </div>

                <p className="mt-5 font-heading text-base font-extrabold text-[#09111f]">{area.label}</p>
                <p className="mt-2 text-sm font-medium leading-relaxed text-[#5f6d84]">
                  Designed for daily healthcare work, not generic office administration.
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20 sm:py-24">
        <div className="medicare-container px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <motion.div initial={{ opacity: 0, x: -18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <span className="text-xs font-black uppercase tracking-[0.2em] text-[#07969a]">
                Product Direction
              </span>

              <h2 className="mt-3 font-heading text-[30px] font-extrabold leading-[1.12] tracking-tight text-[#09111f] sm:text-[38px]">
                From patient registration to executive reporting, every module must support real facility operations.
              </h2>

              <p className="mt-5 text-base font-medium leading-relaxed text-[#5f6d84]">
                The objective is to replace fragmented tools and manual processes with one connected system that supports clinical care, pharmacy control, diagnostics, billing, insurance, workforce administration and operational reporting.
              </p>

              <p className="mt-4 text-base font-medium leading-relaxed text-[#5f6d84]">
                MediCare ONE is being shaped for healthcare providers that need structured workflows, secure records, strong administration and practical deployment across different facility sizes.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 18 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="relative overflow-hidden rounded-[2.8rem] bg-[#0aa9ad] p-4 shadow-2xl shadow-teal-900/10">
                <img
                  src={medicalTeam}
                  alt="Healthcare professionals coordinating care delivery"
                  loading="lazy"
                  width={1600}
                  height={1024}
                  className="h-[430px] w-full rounded-[2.3rem] object-cover"
                />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="bg-[#f5fbfb] py-20 sm:py-24">
        <div className="medicare-container px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <span className="inline-flex rounded-full border border-[#bceef0] bg-white px-5 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#07969a]">
              Engineering Principles
            </span>

            <h2 className="mt-6 font-heading text-[30px] font-extrabold leading-[1.12] tracking-tight text-[#09111f] sm:text-[38px]">
              Built around control, traceability and operational clarity.
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {principles.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06 }}
                className="rounded-[2rem] border border-[#dcebf0] bg-white p-6 shadow-sm transition hover:border-[#8ee4e7] hover:shadow-xl"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8fbfb] text-[#07969a]">
                  <item.icon className="h-6 w-6" />
                </div>

                <h3 className="mt-5 font-heading text-base font-extrabold text-[#09111f]">{item.title}</h3>
                <p className="mt-3 text-sm font-medium leading-relaxed text-[#5f6d84]">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20 sm:py-24">
        <div className="medicare-container px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-[#07969a]">
                Platform Roadmap
              </span>

              <h2 className="mt-3 font-heading text-[30px] font-extrabold leading-[1.12] tracking-tight text-[#09111f] sm:text-[38px]">
                The platform is being expanded into a complete healthcare ERP.
              </h2>

              <p className="mt-5 text-base font-medium leading-relaxed text-[#5f6d84]">
                The current system is moving from an MVP into a professional hospital, clinic and pharmacy management platform with stronger clinical, administrative, financial and operational depth.
              </p>
            </div>

            <div className="lg:col-span-7">
              <div className="grid gap-3 sm:grid-cols-2">
                {roadmap.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-[1.5rem] border border-[#dcebf0] bg-[#f6fbfb] p-4">
                    <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#0aa9ad] text-white">
                      <HeartPulse className="h-3.5 w-3.5" />
                    </div>
                    <p className="text-sm font-bold leading-relaxed text-[#4e5f78]">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#0aa9ad] py-20 text-white sm:py-24">
        <div className="medicare-container px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            <Building2 className="mx-auto h-10 w-10 text-white" />

            <h2 className="mt-6 font-heading text-[30px] font-extrabold leading-tight tracking-tight sm:text-[38px]">
              Designed for facilities that need more than basic record keeping.
            </h2>

            <p className="mt-5 text-base font-semibold leading-relaxed text-white/85">
              MediCare ONE is being developed for healthcare organizations that need reliable clinical workflows, strong administration, pharmacy control, revenue visibility and secure governance.
            </p>
          </div>
        </div>
      </section>

      <FooterSection />
    </div>
  );
}