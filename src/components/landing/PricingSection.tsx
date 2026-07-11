import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  ArrowRight,
  Building2,
  Check,
  CreditCard,
  Hospital,
  Pill,
  ShieldCheck,
  Stethoscope,
  Zap,
  Star,
  Shield,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

type CurrencyCode = "RWF" | "USD";

const currencies: Record<CurrencyCode, { rate: number }> = {
  RWF: { rate: 1 },
  USD: { rate: 0.00072 },
};

interface SubscriptionPlan {
  id: string;
  name: string;
  price: string | number;
  features: Record<string, unknown>;
}

interface DiscountRule {
  id: string;
  months: number;
  discount_percentage: string | number;
}

const addOns = [
  { id: "insurance", label: "Insurance Claims", priceRwf: 18000 },
  { id: "hr", label: "HR & Payroll", priceRwf: 16000 },
  { id: "multi_branch", label: "Multi-Branch Control", priceRwf: 22000 },
  { id: "migration", label: "Data Migration", priceRwf: 30000 },
];

const visualMapping = [
  {
    icon: Stethoscope,
    capacity: "Single facility · up to 25 staff",
    desc: "For outpatient clinics, specialist practices and medical offices.",
  },
  {
    icon: Hospital,
    capacity: "Multi-department · branch-ready",
    desc: "For hospitals, medical centers and healthcare groups.",
  },
  {
    icon: Pill,
    capacity: "Single outlet · up to 20 staff",
    desc: "For retail pharmacies, clinic pharmacies and pharmacy chains.",
  }
];

const formatMoney = (amountRwf: number, currency: CurrencyCode) => {
  const amount = amountRwf * currencies[currency].rate;

  if (currency === "RWF") {
    return `RWF ${Math.round(amount).toLocaleString("en-RW")}`;
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function PricingSection() {
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [currency, setCurrency] = useState<CurrencyCode>("RWF");
  const [annual, setAnnual] = useState(true);
  const [selectedAddOns, setSelectedAddOns] = useState<Record<string, boolean>>({});

  const { data, isLoading } = useQuery({
    queryKey: ["public-subscription-plans"],
    queryFn: async () => {
      return api.get<{ plans: SubscriptionPlan[]; discounts: DiscountRule[] }>("/api/subscriptions/plans");
    },
  });

  const tierPlans = useMemo(() => {
    const plans = data?.plans || [];
    return [...plans].sort((a, b) => Number(a.price) - Number(b.price)).slice(0, 3);
  }, [data]);

  useEffect(() => {
    if (!activePlanId && tierPlans.length > 0) {
      setActivePlanId(tierPlans[0].id);
    }
  }, [tierPlans, activePlanId]);

  const currentPlan = tierPlans.find(p => p.id === activePlanId) || tierPlans[0];
  const currentIndex = tierPlans.findIndex(p => p.id === activePlanId);
  const visual = visualMapping[Math.max(0, currentIndex)] || visualMapping[0];
  const CurrentIcon = visual?.icon || Building2;

  const discountForMonths = (data?.discounts || []).find((d) => d.months === (annual ? 12 : 1));
  const discountPct = discountForMonths ? Number(discountForMonths.discount_percentage) : (annual ? 15 : 0);

  const monthlyRwf = useMemo(() => {
    if (!currentPlan) return 0;
    const base = Number(currentPlan.price);
    const addOnTotal = addOns
      .filter((item) => selectedAddOns[item.id])
      .reduce((total, item) => total + item.priceRwf, 0);

    return base + addOnTotal;
  }, [currentPlan, selectedAddOns]);

  const billingTotalRwf = annual ? Math.round(monthlyRwf * 12 * (1 - discountPct / 100)) : monthlyRwf;

  const featureList = currentPlan
    ? Object.entries(currentPlan.features || {})
        .filter(([, v]) => v === true)
        .map(([k]) => k.replace(/_/g, " "))
    : [];

  return (
    <section id="pricing" className="relative overflow-hidden bg-background py-24">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-140px] top-20 h-80 w-80 rounded-[5rem] bg-[#e4fafa]" />
        <div className="absolute right-[-110px] bottom-20 h-72 w-72 rounded-[5rem] bg-[#e9f7f8]" />
      </div>

      <div className="medicare-container relative px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex rounded-full border border-[#bceef0] bg-card px-5 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#07969a]">
            Pricing & Deployment
          </span>

          <h2 className="mt-6 font-heading text-4xl font-extrabold leading-[1.05] tracking-tight text-[#09111f] sm:text-5xl lg:text-6xl">
            Choose the setup that fits your healthcare operation.
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-lg font-medium leading-relaxed text-[#5f6d84]">
            Select your facility type, currency, billing period and optional
            modules. Pricing is shown in RWF by default for the Rwandan market.
          </p>
        </div>

        {isLoading ? (
          <div className="mt-20 text-center text-muted-foreground">Loading plans...</div>
        ) : !currentPlan ? (
          <div className="mt-20 text-center text-muted-foreground">No plans available at the moment.</div>
        ) : (
          <>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
              {tierPlans.map((plan, idx) => {
                const Icon = visualMapping[idx]?.icon || Building2;
                const active = activePlanId === plan.id;

                return (
                  <button
                    key={plan.id}
                    onClick={() => setActivePlanId(plan.id)}
                    className={`flex items-center gap-3 rounded-full border px-5 py-3 text-sm font-black transition ${
                      active
                        ? "border-[#07969a] bg-[#0aa9ad] text-white shadow-lg shadow-teal-500/20"
                        : "border-border bg-card text-[#5f6d84] hover:border-[#8ee4e7] hover:text-[#07969a]"
                    }`}
                  >
                    <Icon size={18} />
                    {plan.name}
                  </button>
                );
              })}

              <div className="flex rounded-full border border-border bg-card p-1">
                {(["RWF", "USD"] as CurrencyCode[]).map((code) => (
                  <button
                    key={code}
                    onClick={() => setCurrency(code)}
                    className={`rounded-full px-4 py-2 text-sm font-black transition ${
                      currency === code ? "bg-[#0aa9ad] text-white" : "text-[#5f6d84] hover:bg-[#e8fbfb]"
                    }`}
                  >
                    {code}
                  </button>
                ))}
              </div>

              <div className="flex rounded-full border border-border bg-card p-1">
                <button
                  onClick={() => setAnnual(false)}
                  className={`rounded-full px-4 py-2 text-sm font-black transition ${
                    !annual ? "bg-[#0aa9ad] text-white" : "text-[#5f6d84] hover:bg-[#e8fbfb]"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setAnnual(true)}
                  className={`rounded-full px-4 py-2 text-sm font-black transition ${
                    annual ? "bg-[#0aa9ad] text-white" : "text-[#5f6d84] hover:bg-[#e8fbfb]"
                  }`}
                >
                  Annual {discountPct > 0 ? `-${discountPct}%` : ""}
                </button>
              </div>
            </div>

            <motion.div
              key={activePlanId}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="mx-auto mt-14 max-w-6xl"
            >
              <div className="grid overflow-hidden rounded-[3rem] border border-border bg-card shadow-2xl shadow-teal-900/10 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="relative overflow-hidden bg-[#0aa9ad] p-8 text-white sm:p-10 lg:p-12">
                  <div className="absolute -right-16 -top-16 h-56 w-56 rounded-[4rem] bg-card/10" />
                  <div className="absolute -bottom-20 left-10 h-52 w-52 rounded-[4rem] bg-card/10" />

                  <div className="relative">
                    <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-card text-[#0aa9ad]">
                      <CurrentIcon size={30} />
                    </div>

                    <h3 className="mt-8 font-heading text-4xl font-extrabold leading-tight">
                      {currentPlan.name}
                    </h3>

                    <p className="mt-3 text-sm font-black uppercase tracking-[0.18em] text-white/70">
                      {visual.capacity}
                    </p>

                    <p className="mt-6 max-w-md text-lg font-medium leading-relaxed text-white/90">
                      {visual.desc}
                    </p>

                    <div className="mt-10 rounded-[2rem] bg-card/12 p-6 backdrop-blur">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-white/70">
                        Total {annual ? "billed yearly" : "billed monthly"}
                      </p>

                      <div className="mt-3 flex items-end gap-2">
                        <span className="font-heading text-4xl font-extrabold sm:text-5xl">
                          {formatMoney(billingTotalRwf, currency)}
                        </span>
                        <span className="pb-2 text-sm font-bold text-white/70">
                          /{annual ? "year" : "month"}
                        </span>
                      </div>

                      {annual && (
                        <p className="mt-3 text-sm font-bold text-white/80">
                          Effective monthly cost: {formatMoney(Math.round(billingTotalRwf / 12), currency)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="p-8 sm:p-10 lg:p-12">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {featureList.length > 0 ? (
                      featureList.map((item) => (
                        <div
                          key={item}
                          className="flex items-start gap-3 rounded-2xl border border-border bg-muted p-4"
                        >
                          <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[#0aa9ad] text-white">
                            <Check size={14} />
                          </div>
                          <p className="text-sm font-bold leading-relaxed text-[#4e5f78] capitalize">{item}</p>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-sm col-span-2">No features listed for this plan.</p>
                    )}
                  </div>

                  <div className="mt-8">
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-[#07969a]">
                      Optional modules
                    </p>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {addOns.map((item) => {
                        const selected = !!selectedAddOns[item.id];

                        return (
                          <button
                            key={item.id}
                            onClick={() =>
                              setSelectedAddOns((previous) => ({
                                ...previous,
                                [item.id]: !previous[item.id],
                              }))
                            }
                            className={`rounded-2xl border p-4 text-left transition ${
                              selected
                                ? "border-[#0aa9ad] bg-[#e8fbfb]"
                                : "border-border bg-card hover:border-[#8ee4e7]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-sm font-black text-[#09111f]">{item.label}</p>
                                <p className="mt-2 text-xs font-black text-[#07969a]">
                                  + {formatMoney(item.priceRwf, currency)} / month
                                </p>
                              </div>

                              <div
                                className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                                  selected ? "border-[#0aa9ad] bg-[#0aa9ad] text-white" : "border-[#b8ccd6]"
                                }`}
                              >
                                {selected && <Check size={14} />}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-8 flex flex-col gap-4 rounded-[2rem] bg-muted p-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <ShieldCheck className="mt-1 h-5 w-5 text-[#07969a]" />
                      <p className="text-sm font-bold leading-relaxed text-[#5f6d84]">
                        Includes role-based access, audit trail foundation and
                        healthcare records structure.
                      </p>
                    </div>

                    <Link to="/contact">
                      <Button className="h-12 rounded-full bg-[#0aa9ad] px-7 font-black text-white shadow-lg shadow-teal-500/20 hover:bg-[#07969a]">
                        Request Proposal
                        <ArrowRight size={16} className="ml-2" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </div>
    </section>
  );
}