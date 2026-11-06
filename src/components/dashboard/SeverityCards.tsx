import { AlertOctagon, AlertTriangle, Info } from "lucide-react";
import type { Severity } from "@/lib/types";
import { cn } from "@/lib/utils";
import { DemoTag } from "@/components/layout/PageHeader";

const META: Record<Severity, { label: string; icon: typeof Info; text: string; bar: string; border: string }> = {
  high: { label: "High", icon: AlertOctagon, text: "text-sev-high", bar: "bg-sev-high", border: "hover:border-sev-high/60" },
  medium: { label: "Medium", icon: AlertTriangle, text: "text-sev-medium", bar: "bg-sev-medium", border: "hover:border-sev-medium/60" },
  low: { label: "Low", icon: Info, text: "text-sev-low", bar: "bg-sev-low", border: "hover:border-sev-low/60" },
};

export function SeverityCards({ counts, demo }: { counts: Record<Severity, number>; demo?: boolean }) {
  const total = counts.high + counts.medium + counts.low || 1;
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {(Object.keys(META) as Severity[]).map((sev) => {
        const m = META[sev];
        const pct = Math.round((counts[sev] / total) * 100);
        return (
          <div key={sev} className={cn("panel panel-interactive p-4", m.border)}>
            <div className="flex items-center gap-2">
              <m.icon className={cn("size-4", m.text)} />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {m.label} risk
              </span>
              <span className="ml-auto">
                <DemoTag {...(demo !== undefined && { demo })} />
              </span>
            </div>
            <p className={cn("mt-3 font-display text-4xl font-bold tabular-nums", m.text)}>
              {counts[sev]}
            </p>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div className={cn("h-full rounded-full transition-all duration-700", m.bar)} style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1.5 font-mono text-[10px] text-muted-foreground">{pct}% of open findings</p>
          </div>
        );
      })}
    </div>
  );
}
