import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type PhaseState = "idle" | "running" | "done" | "error";

export interface PhaseView {
  key: string;
  label: string;
  state: PhaseState;
  ms?: number;
  note?: string;
}

export function ScanProgress({ phases, target }: { phases: PhaseView[]; target: string }) {
  const done = phases.filter((p) => p.state === "done" || p.state === "error").length;
  const running = phases.some((p) => p.state === "running");
  const pct = Math.round(((done + (running ? 0.5 : 0)) / phases.length) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between font-mono text-xs">
        <span className="truncate text-muted-foreground">
          target <span className="text-foreground">{target}</span>
        </span>
        <span className="tabular-nums text-primary text-glow">{pct}%</span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-primary glow transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
        {running && <div className="absolute inset-0 scanline" />}
      </div>
      <ol className="space-y-2">
        {phases.map((p, i) => (
          <li
            key={p.key}
            className={cn(
              "flex items-center gap-3 rounded-md border px-3 py-2 transition-colors",
              p.state === "running" ? "border-border-glow bg-accent/40 glow" : "border-border/60 bg-terminal/60",
            )}
          >
            <span className="font-mono text-[10px] text-muted-foreground">0{i + 1}</span>
            {p.state === "done" && <CheckCircle2 className="size-4 text-primary" />}
            {p.state === "error" && <XCircle className="size-4 text-sev-high" />}
            {p.state === "running" && <Loader2 className="size-4 animate-spin text-primary" />}
            {p.state === "idle" && <Circle className="size-4 text-muted-foreground/50" />}
            <span className={cn("flex-1 text-sm", p.state === "idle" ? "text-muted-foreground" : "text-foreground")}>
              {p.label}
              {p.note && <span className="ml-2 font-mono text-[11px] text-sev-high">{p.note}</span>}
            </span>
            {p.ms !== undefined && (
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{(p.ms / 1000).toFixed(1)}s</span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
