import { Construction } from "lucide-react";

/** Placeholder shown for agrovet pages not yet wired up - purely a stopgap
 * so routes/imports resolve while each feature is built out in turn; not a
 * final UI state for any of them. */
export default function AgrovetComingSoon({ title }: { title: string }) {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-12 flex flex-col items-center text-center gap-3">
        <div className="rounded-2xl bg-slate-50 p-4 text-slate-400">
          <Construction className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        <p className="text-slate-500 max-w-md">This section is being built out and will be available shortly.</p>
      </div>
    </div>
  );
}
