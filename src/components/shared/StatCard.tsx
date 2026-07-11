import { motion } from "framer-motion";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { useAnimatedCounter, formatNumber, formatCurrency } from "@/hooks/use-data";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  format?: "number" | "currency" | "percent";
  change?: number;
  changeLabel?: string;
  colorClass?: string;
  delay?: number;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  format = "number",
  change,
  changeLabel,
  colorClass = "bg-[#0aa9ad] text-white", // Default to main teal color
  delay = 0,
}: StatCardProps) {
  const animatedValue = useAnimatedCounter(typeof value === 'number' ? value : 0, 800);

  const displayValue = (() => {
    if (typeof value === "string") return value;
    switch (format) {
      case "currency":
        return formatCurrency(animatedValue);
      case "percent":
        return `${animatedValue}%`;
      default:
        return formatNumber(animatedValue);
    }
  })();

  const isPositive = change !== undefined && change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`relative overflow-hidden rounded-xl p-5 shadow-sm transition-transform hover:-translate-y-1 ${colorClass}`}
    >
      <div className="flex flex-col relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center p-2.5 rounded-lg bg-white/20 backdrop-blur-sm shrink-0">
            <Icon size={18} className="text-current" />
          </div>
          <div>
            <p className="text-sm font-semibold text-current opacity-90">{label}</p>
            <p className="text-2xl font-bold mt-0.5 text-current tracking-tight">{displayValue}</p>
          </div>
          
          {change !== undefined && (
            <span className={`ml-auto flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full bg-white/20 backdrop-blur-sm`}>
              {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {isPositive ? "+" : ""}{change}%
            </span>
          )}
        </div>
      </div>
      
      {/* Decorative background shape */}
      <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10 blur-2xl z-0 pointer-events-none" />
      <div className="absolute -left-6 -top-6 w-16 h-16 rounded-full bg-white/10 blur-xl z-0 pointer-events-none" />
    </motion.div>
  );
}
