import { CheckCircle2, CircleSlash, XCircle, AlertTriangle, CircleHelp } from "lucide-react";
import type { CheckResult, CheckStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS: Record<CheckStatus, { icon: typeof CheckCircle2; cls: string; label: string }> = {
  pass: { icon: CheckCircle2, cls: "text-primary", label: "PASS" },
  warn: { icon: AlertTriangle, cls: "text-sev-medium", label: "WARN" },
  fail: { icon: XCircle, cls: "text-sev-high", label: "FAIL" },
  unsupported: { icon: CircleSlash, cls: "text-muted-foreground", label: "N/A" },
  unavailable: { icon: CircleHelp, cls: "text-sev-info", label: "UNAVAIL" },
};

export function StatusOverview({ checks }: { checks: CheckResult[] }) {
  return (
    <ul className="divide-y divide-border/60">
      {checks.map((c) => {
        const s = STATUS[c.status];
        return (
          <li key={c.id} className="flex items-center gap-3 py-2.5">
            <s.icon className={cn("size-4 shrink-0", s.cls)} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-foreground">{c.label}</p>
              <p className="truncate font-mono text-[11px] text-muted-foreground">{c.detail}</p>
            </div>
            <span className="hidden font-mono text-[10px] text-muted-foreground sm:inline">{c.category}</span>
            <span className={cn("w-14 text-right font-mono text-[11px] font-semibold", s.cls)}>{s.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
