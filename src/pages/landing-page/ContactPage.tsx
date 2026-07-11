import { useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  ClipboardCheck,
  Mail,
  MapPin,
  Phone,
  Send,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import LandingNavbar from "@/components/landing/LandingNavbar";
import FooterSection from "@/components/landing/FooterSection";
import { useToast } from "@/hooks/use-toast";
import doctorTablet from "@/assets/doctor-tablet.jpg";

const contactInfo = [
  {
    icon: Mail,
    label: "Email",
    value: "info@medicareone.rw",
    href: "mailto:info@medicareone.rw",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "+250 XXX XXX XXX",
    href: "tel:+250000000000",
  },
  {
    icon: MapPin,
    label: "Location",
    value: "Kigali, Rwanda",
  },
  {
    icon: ShieldCheck,
    label: "Focus",
    value: "Hospitals, clinics, pharmacies and diagnostic centers",
  },
];

const inquiryTypes = [
  "Implementation Consultation",
  "Hospital Deployment",
  "Clinic Deployment",
  "Pharmacy Deployment",
  "Diagnostic Center Deployment",
  "Partnership",
  "Technical Support",
];

export default function ContactPage() {
  const { success } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    organization: "",
    phone: "",
    facilityType: "Hospital",
    type: "Implementation Consultation",
    message: "",
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    success("Success", "Request received. The MediCare ONE team will review your message and respond with the next steps."
    );

    setFormData({
      name: "",
      email: "",
      organization: "",
      phone: "",
      facilityType: "Hospital",
      type: "Implementation Consultation",
      message: "",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <LandingNavbar />

      <section className="relative overflow-hidden pt-32 pb-16">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <img
            src={doctorTablet}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-14"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/90 via-[#f5fbfb]/95 to-[#f5fbfb]" />
          <div className="absolute -left-24 top-24 h-80 w-80 rounded-[5rem] bg-[#e4fafa]" />
          <div className="absolute right-[-120px] bottom-20 h-96 w-96 rounded-[5rem] bg-[#dff8f8]" />
        </div>

        <div className="medicare-container relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <span className="inline-flex rounded-full border border-[#bceef0] bg-card px-5 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#07969a]">
              Contact MediCare ONE
            </span>

            <h1 className="mt-6 font-heading text-[36px] font-extrabold leading-[1.08] tracking-tight text-[#09111f] sm:text-[46px] lg:text-[54px]">
              Plan your healthcare system deployment with a structured implementation team.
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-base font-semibold leading-relaxed text-[#5f6d84] sm:text-lg">
              Share your facility type, operational needs and implementation goals.
              We will help you map the right MediCare ONE setup for your hospital,
              clinic, pharmacy or diagnostic center.
            </p>
          </motion.div>
        </div>
      </section>

      <section className="border-y border-border bg-card py-12">
        <div className="medicare-container px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {contactInfo.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.06 }}
                className="rounded-[2rem] border border-border bg-muted p-5 transition hover:border-[#8ee4e7] hover:bg-[#e8fbfb]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0aa9ad] text-white">
                  <item.icon size={20} />
                </div>

                <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-[#8ba0b8]">
                  {item.label}
                </p>

                {item.href ? (
                  <a
                    href={item.href}
                    className="mt-1 block text-sm font-black text-[#09111f] transition hover:text-[#07969a]"
                  >
                    {item.value}
                  </a>
                ) : (
                  <p className="mt-1 text-sm font-black leading-relaxed text-[#09111f]">
                    {item.value}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-card py-20 sm:py-24">
        <div className="medicare-container px-4 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-5">
            <motion.div
              initial={{ opacity: 0, x: -18 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="lg:col-span-3"
            >
              <div className="mb-7">
                <span className="text-xs font-black uppercase tracking-[0.2em] text-[#07969a]">
                  Implementation Request
                </span>

                <h2 className="mt-3 font-heading text-[30px] font-extrabold leading-tight text-[#09111f] sm:text-[38px]">
                  Tell us about your facility.
                </h2>

                <p className="mt-2 text-sm font-medium leading-relaxed text-[#5f6d84]">
                  The more details you provide, the easier it is to recommend the
                  correct deployment path, modules and implementation scope.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-black text-[#09111f]">
                      Full Name *
                    </label>
                    <input
                      className="medicare-input"
                      placeholder="Your full name"
                      required
                      value={formData.name}
                      onChange={(event) =>
                        setFormData({ ...formData, name: event.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-black text-[#09111f]">
                      Email *
                    </label>
                    <input
                      type="email"
                      className="medicare-input"
                      placeholder="name@facility.com"
                      required
                      value={formData.email}
                      onChange={(event) =>
                        setFormData({ ...formData, email: event.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-black text-[#09111f]">
                      Organization
                    </label>
                    <input
                      className="medicare-input"
                      placeholder="Hospital, clinic, pharmacy or group name"
                      value={formData.organization}
                      onChange={(event) =>
                        setFormData({ ...formData, organization: event.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-black text-[#09111f]">
                      Phone
                    </label>
                    <input
                      className="medicare-input"
                      placeholder="+250 ..."
                      value={formData.phone}
                      onChange={(event) =>
                        setFormData({ ...formData, phone: event.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-black text-[#09111f]">
                      Facility Type
                    </label>
                    <select
                      className="medicare-input"
                      value={formData.facilityType}
                      onChange={(event) =>
                        setFormData({ ...formData, facilityType: event.target.value })
                      }
                    >
                      <option>Hospital</option>
                      <option>Clinic</option>
                      <option>Pharmacy</option>
                      <option>Diagnostic Center</option>
                      <option>Healthcare Network</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-black text-[#09111f]">
                      Request Type
                    </label>
                    <select
                      className="medicare-input"
                      value={formData.type}
                      onChange={(event) =>
                        setFormData({ ...formData, type: event.target.value })
                      }
                    >
                      {inquiryTypes.map((type) => (
                        <option key={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-black text-[#09111f]">
                    Message *
                  </label>
                  <textarea
                    className="medicare-input min-h-[150px] resize-y py-4"
                    placeholder="Describe your current workflow, facility size, modules needed, branches, pharmacy/lab/billing requirements and deployment timeline."
                    required
                    value={formData.message}
                    onChange={(event) =>
                      setFormData({ ...formData, message: event.target.value })
                    }
                  />
                </div>

                <Button
                  type="submit"
                  className="h-12 rounded-full bg-[#0aa9ad] px-8 font-black text-white shadow-xl shadow-teal-500/20 hover:bg-[#07969a]"
                >
                  <Send size={16} className="mr-2" />
                  Submit Implementation Request
                </Button>
              </form>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 18 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-5 lg:col-span-2"
            >
              <div className="rounded-[2rem] border border-border bg-muted p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#0aa9ad] text-white">
                    <ClipboardCheck size={20} />
                  </div>
                  <h3 className="font-heading text-base font-extrabold text-[#09111f]">
                    Deployment Review
                  </h3>
                </div>

                <p className="mt-4 text-sm font-medium leading-relaxed text-[#5f6d84]">
                  We review your facility structure, patient flow, departments,
                  pharmacy stock needs, laboratory workflow, billing process and
                  reporting expectations.
                </p>
              </div>

              <div className="rounded-[2rem] border border-border bg-card p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#e8fbfb] text-[#07969a]">
                    <Stethoscope size={20} />
                  </div>
                  <h3 className="font-heading text-base font-extrabold text-[#09111f]">
                    Workflow Mapping
                  </h3>
                </div>

                <p className="mt-4 text-sm font-medium leading-relaxed text-[#5f6d84]">
                  We identify which modules are needed first: patient registry,
                  appointments, OPD, IPD, pharmacy, laboratory, billing,
                  insurance, HR, reporting or governance.
                </p>
              </div>

              <div className="rounded-[2rem] bg-[#0aa9ad] p-6 text-white shadow-xl shadow-teal-500/20">
                <Building2 className="h-8 w-8 text-white" />

                <h3 className="mt-5 font-heading text-lg font-extrabold">
                  Recommended for serious healthcare operations
                </h3>

                <p className="mt-3 text-sm font-medium leading-relaxed text-white/82">
                  Hospitals, clinics, pharmacies and diagnostic centers planning
                  to improve control, reporting, data quality and patient service
                  delivery.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <FooterSection />
    </div>
  );
}
