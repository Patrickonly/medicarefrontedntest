import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle } from "lucide-react";

// ---------------------------------------------------------------------------
// Design tokens
// Categorical palette assigned in FIXED order (never cycled past its length -
// tail categories fold into "Other" upstream). Validated for CVD separation;
// low surface-contrast hues are always paired with direct value labels so
// identity never rests on the fill colour alone.
// ---------------------------------------------------------------------------
export const CHART_COLORS = ["#0aa9ad", "#6366f1", "#f59e0b", "#ef4444", "#10b981", "#8b5cf6", "#0ea5e9", "#ec4899"];
const GRID = "#eef2f6";
const AXIS_INK = "#64748b";
const LABEL_INK = "#475569";

export const formatNumber = (value: number) => new Intl.NumberFormat("en-US").format(value || 0);

export type ChartDatum = { name: string; value: number };

// ---------------------------------------------------------------------------
// Shared chart chrome
// ---------------------------------------------------------------------------
function ChartTooltip({ active, payload, label, formatValue, swatch }: any) {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0];
  const color = swatch ?? row?.payload?.fill ?? row?.color;
  const name = label ?? row?.payload?.name ?? row?.name;
  const value = row?.value;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <div className="flex items-center gap-2">
        {color && <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />}
        <span className="text-xs font-semibold text-slate-600">{name}</span>
      </div>
      <p className="mt-0.5 text-sm font-black text-slate-900 tabular-nums">
        {formatValue ? formatValue(value) : formatNumber(value)}
      </p>
    </div>
  );
}

// Legend as a chip row so identity is never colour-only and label text stays in
// ink (never the series hue). Shows the value alongside each key.
function LegendChips({ data, colors }: { data: ChartDatum[]; colors: string[] }) {
  return (
    <div className="mt-1 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
      {data.map((d, idx) => (
        <div key={d.name} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: colors[idx % colors.length] }} />
          <span className="text-xs font-medium text-slate-600">{d.name}</span>
          <span className="text-xs font-bold text-slate-900 tabular-nums">{formatNumber(d.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function ChartCard({
  title,
  subtitle,
  children,
  className = "",
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className={`border-slate-200/80 bg-white shadow-sm transition-shadow hover:shadow-md ${className}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 border-b border-slate-100 pb-3">
        <div>
          <CardTitle className="text-[15px] font-black text-slate-900">{title}</CardTitle>
          {subtitle && <p className="mt-0.5 text-xs font-medium text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </CardHeader>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

// Honest empty state - no demo data is ever substituted.
export function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-[280px] flex-col items-center justify-center gap-2 text-center">
      <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3">
        <AlertTriangle className="h-5 w-5 text-slate-300" />
      </div>
      <p className="max-w-[220px] text-sm text-slate-400">{message}</p>
    </div>
  );
}

// Vertical columns. Bars capped thin (maxBarSize), 4px rounded caps, direct
// value labels on every cap (required relief for low-contrast fills).
export function CategoryColumn({ data, formatValue }: { data: ChartDatum[]; formatValue?: (v: number) => string }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 24, right: 8, left: -12, bottom: 4 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: AXIS_INK }}
          axisLine={false}
          tickLine={false}
          interval={0}
          angle={data.length > 4 ? -18 : 0}
          textAnchor={data.length > 4 ? "end" : "middle"}
          height={data.length > 4 ? 54 : 24}
        />
        <YAxis tick={{ fontSize: 11, fill: AXIS_INK }} axisLine={false} tickLine={false} allowDecimals={false} width={40} />
        <Tooltip cursor={{ fill: "rgba(148,163,184,0.08)" }} content={<ChartTooltip formatValue={formatValue} />} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={40}>
          <LabelList
            dataKey="value"
            position="top"
            formatter={(v: number) => (formatValue ? formatValue(v) : formatNumber(v))}
            style={{ fill: LABEL_INK, fontSize: 11, fontWeight: 700 }}
          />
          {data.map((_, idx) => (
            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Horizontal bars for long category names. Value labels ride the bar tips in ink.
export function CategoryBarH({ data, formatValue }: { data: ChartDatum[]; formatValue?: (v: number) => string }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 46)}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 64, left: 8, bottom: 4 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: AXIS_INK }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => (formatValue ? formatValue(v) : formatNumber(v))}
        />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#334155" }} axisLine={false} tickLine={false} width={158} />
        <Tooltip cursor={{ fill: "rgba(148,163,184,0.08)" }} content={<ChartTooltip formatValue={formatValue} />} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={26}>
          <LabelList
            dataKey="value"
            position="right"
            formatter={(v: number) => (formatValue ? formatValue(v) : formatNumber(v))}
            style={{ fill: LABEL_INK, fontSize: 11, fontWeight: 700 }}
          />
          {data.map((_, idx) => (
            <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Donut with a center total and a chip legend below. 2px surface gap + surface
// ring between slices (identity/value never rest on slice colour alone).
export function CategoryDonut({
  data,
  colors,
  centerLabel,
}: {
  data: ChartDatum[];
  colors?: string[];
  centerLabel: string;
}) {
  const palette = colors || CHART_COLORS;
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div>
      <div className="relative">
        <ResponsiveContainer width="100%" height={232}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={64}
              outerRadius={96}
              paddingAngle={2}
              stroke="#ffffff"
              strokeWidth={2}
            >
              {data.map((_, idx) => (
                <Cell key={idx} fill={palette[idx % palette.length]} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-black text-slate-900 tabular-nums">{formatNumber(total)}</span>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{centerLabel}</span>
        </div>
      </div>
      <LegendChips data={data} colors={palette} />
    </div>
  );
}
