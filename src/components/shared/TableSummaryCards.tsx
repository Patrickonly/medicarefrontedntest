import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: "blue" | "emerald" | "amber" | "rose" | "purple" | "slate";
}

export function TableSummaryCards({ cards }: { cards: SummaryCardProps[] }) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-200",
    amber: "bg-amber-50 text-amber-600 border-amber-200",
    rose: "bg-rose-50 text-rose-600 border-rose-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    slate: "bg-slate-100 text-slate-600 border-slate-200",
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      {cards.map((card, i) => (
        <Card key={i} className="rounded-2xl border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">{card.title}</p>
              <h3 className="text-2xl font-black text-slate-900">{card.value}</h3>
            </div>
            <div className={`p-3 rounded-xl border shadow-sm ${colorMap[card.color]}`}>
              <card.icon size={22} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
