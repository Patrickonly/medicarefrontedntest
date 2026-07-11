import { motion } from "framer-motion";
import {
  Ambulance,
  BarChart3,
  Building2,
  CalendarCheck,
  CreditCard,
  FlaskConical,
  Heart,
  MessageSquare,
  Pill,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";

const modules = [
  {
    icon: Users,
    title: "Patient Administration",
    desc: "Registration, admissions, transfers, appointments and longitudinal patient records.",
  },
  {
    icon: Stethoscope,
    title: "Clinical Operations",
    desc: "Consultations, nursing workflows, treatment plans and multidisciplinary care.",
  },
  {
    icon: FlaskConical,
    title: "Diagnostics",
    desc: "Laboratory requests, specimen tracking, imaging and reporting.",
  },
  {
    icon: Pill,
    title: "Pharmacy Management",
    desc: "Medication dispensing, stock control, procurement and batch monitoring.",
  },
  {
    icon: CreditCard,
    title: "Billing & Insurance",
    desc: "Patient billing, insurance claims and revenue cycle management.",
  },
  {
    icon: Building2,
    title: "Hospital Operations",
    desc: "Facility administration, departments, wards and bed management.",
  },
  {
    icon: Ambulance,
    title: "Emergency Services",
    desc: "Emergency intake, referrals, ambulance coordination and triage.",
  },
  {
    icon: ShieldCheck,
    title: "Governance & Compliance",
    desc: "Audit trails, access control, security and regulatory compliance.",
  },
];

const benefits = [
  {
    icon: CalendarCheck,
    title: "Demand Forecasting",
    desc: "Plan staffing and resources using appointment and patient volume trends.",
  },
  {
    icon: MessageSquare,
    title: "Connected Teams",
    desc: "Coordinate doctors, nurses, laboratories and pharmacy operations.",
  },
  {
    icon: BarChart3,
    title: "Executive Visibility",
    desc: "Monitor clinical and financial performance from one dashboard.",
  },
  {
    icon: Heart,
    title: "Patient Experience",
    desc: "Deliver faster service and improve continuity of care.",
  },
];

export default function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative overflow-hidden bg-card py-24"
    >
      {/* Background Shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute left-[-120px] top-40 h-72 w-72 rounded-[4rem] bg-[#e8fbfb]" />
        <div className="absolute right-[-80px] bottom-20 h-64 w-64 rounded-[4rem] bg-[#eff9fa]" />
      </div>

      <div className="medicare-container relative px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex rounded-full border border-[#bceef0] bg-[#eefdfd] px-5 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#07969a]">
            Platform Capabilities
          </span>

          <h2 className="mt-6 font-heading text-4xl font-extrabold leading-[1.05] tracking-tight text-[#09111f] sm:text-5xl lg:text-6xl">
            Healthcare Operations Built Around Real Clinical Workflows
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-lg font-medium leading-relaxed text-[#5f6d84]">
            A unified healthcare platform connecting patient care,
            diagnostics, pharmacy operations, billing, workforce management
            and executive oversight.
          </p>
        </div>

        {/* Main Grid */}
        <div className="mt-20 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {modules.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.35,
                delay: index * 0.05,
              }}
              className="group rounded-[2rem] border border-border bg-card p-7 shadow-sm transition-all hover:-translate-y-1 hover:border-[#8ee4e7] hover:shadow-xl"
            >
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eefdfd] text-[#07969a]">
                <item.icon size={24} />
              </div>

              <h3 className="font-heading text-xl font-extrabold text-[#09111f]">
                {item.title}
              </h3>

              <p className="mt-4 text-sm font-medium leading-relaxed text-[#5f6d84]">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Large Feature Banner */}
        <div className="mt-24 overflow-hidden rounded-[3rem] bg-[#0aa9ad] p-10 text-white lg:p-16">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <span className="inline-flex rounded-full bg-card/15 px-4 py-2 text-xs font-black uppercase tracking-[0.18em]">
                Operational Excellence
              </span>

              <h3 className="mt-6 font-heading text-3xl font-extrabold leading-tight sm:text-5xl">
                One Platform. Every Department. Complete Visibility.
              </h3>

              <p className="mt-6 text-lg font-medium leading-relaxed text-white/90">
                Manage patient administration, pharmacy, laboratory,
                diagnostics, billing, insurance and executive reporting from
                one secure healthcare ecosystem.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {benefits.map((item) => (
                <div
                  key={item.title}
                  className="rounded-3xl bg-card/10 p-5 backdrop-blur"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-card text-[#0aa9ad]">
                    <item.icon size={20} />
                  </div>

                  <h4 className="font-heading text-lg font-extrabold">
                    {item.title}
                  </h4>

                  <p className="mt-2 text-sm leading-relaxed text-white/80">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Statistics Section */}
        <div className="mt-24 grid gap-6 md:grid-cols-4">
          {[
            {
              value: "500+",
              label: "Healthcare Facilities",
            },
            {
              value: "2M+",
              label: "Patient Records",
            },
            {
              value: "99.9%",
              label: "Platform Availability",
            },
            {
              value: "24/7",
              label: "Operational Monitoring",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-[2rem] border border-border bg-card p-8 text-center shadow-sm"
            >
              <p className="font-heading text-4xl font-extrabold text-[#07969a]">
                {stat.value}
              </p>

              <p className="mt-3 text-sm font-bold uppercase tracking-[0.14em] text-[#6a7890]">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}