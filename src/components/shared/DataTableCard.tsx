import React from "react";
import { ArrowUpRight, Trash2, CheckCircle2 } from "lucide-react";

interface DataTableCardProps {
  title: string;
  subtitle?: string;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function DataTableCard({ title, subtitle, headerAction, children, footer }: DataTableCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden relative" style={{ boxShadow: "var(--shadow-card)" }}>
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {headerAction}
      </div>
      {children}
      {footer}
    </div>
  );
}

interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  onDelete?: () => void;
  onApprove?: () => void;
}

export function BulkActionBar({ selectedCount, onClear, onDelete, onApprove }: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="absolute top-0 left-0 right-0 h-[73px] bg-[#0aa9ad] text-white px-6 flex items-center justify-between animate-in fade-in slide-in-from-top-2 z-10">
      <div className="flex items-center gap-4">
        <span className="font-bold bg-card/20 px-3 py-1 rounded-lg text-sm">{selectedCount} Selected</span>
        <button onClick={onClear} className="text-sm font-semibold text-white/80 hover:text-white transition-colors">
          Clear Selection
        </button>
      </div>
      <div className="flex items-center gap-3">
        {onApprove && (
          <button 
            onClick={onApprove}
            className="flex items-center gap-2 bg-card text-[#0aa9ad] px-4 py-2 rounded-xl text-sm font-bold hover:bg-emerald-50 transition-colors shadow-sm"
          >
            <CheckCircle2 size={16} />
            Approve
          </button>
        )}
        {onDelete && (
          <button 
            onClick={onDelete}
            className="flex items-center gap-2 bg-rose-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-rose-600 transition-colors shadow-sm"
          >
            <Trash2 size={16} />
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

interface TableHeaderCellProps {
  children: React.ReactNode;
  className?: string;
}

export function Th({ children, className = "" }: TableHeaderCellProps) {
  return (
    <th className={`text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-3 ${className}`}>
      {children}
    </th>
  );
}

export function ThCheckbox({ checked, onChange }: { checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <th className="w-12 px-5 py-3 text-left">
      <input 
        type="checkbox" 
        checked={checked} 
        onChange={onChange}
        className="w-4 h-4 rounded border-border text-[#0aa9ad] focus:ring-[#0aa9ad] transition-all cursor-pointer"
      />
    </th>
  );
}

export function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={`px-5 py-3.5 text-sm ${className}`}>
      {children}
    </td>
  );
}

export function TdCheckbox({ checked, onChange }: { checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <td className="w-12 px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
      <input 
        type="checkbox" 
        checked={checked} 
        onChange={onChange}
        className="w-4 h-4 rounded border-border text-[#0aa9ad] focus:ring-[#0aa9ad] transition-all cursor-pointer"
      />
    </td>
  );
}

export function ViewAllLink({ href = "#", label = "View All" }: { href?: string; label?: string }) {
  return (
    <a href={href} className="text-xs text-primary font-medium flex items-center gap-1 hover:underline transition-colors">
      {label} <ArrowUpRight size={12} />
    </a>
  );
}
