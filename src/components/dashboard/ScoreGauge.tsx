import { postureFor } from "@/lib/scoring";
import { cn } from "@/lib/utils";

const POSTURE_COLOR = {
  Strong: "text-primary",
  Fair: "text-sev-low",
  Weak: "text-sev-medium",
  Critical: "text-sev-high",
} as const;

export function ScoreGauge({ score }: { score: number }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const arc = c * 0.75; // 270° gauge
  const filled = (arc * score) / 100;
  const posture = postureFor(score);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[220px]">
      <svg viewBox="0 0 180 180" className="size-full -rotate-[225deg]">
        <circle
          cx="90"
          cy="90"
          r={r}
          fill="none"
          stroke="var(--muted)"
          strokeWidth="10"
          strokeDasharray={`${arc} ${c}`}
          strokeLinecap="round"
        />
        <circle
          cx="90"
          cy="90"
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="10"
          strokeDasharray={`${filled} ${c}`}
          strokeLinecap="round"
          style={{
            filter: "drop-shadow(0 0 6px var(--primary))",
            transition: "stroke-dasharray 1s ease-out",
          }}
        />
        {Array.from({ length: 28 }).map((_, i) => {
          const a = (i / 27) * 270 * (Math.PI / 180);
          // Round so server and browser produce identical SVG attributes.
          const p = (n: number) => Math.round(n * 100) / 100;
          return (
            <line
              key={i}
              x1={p(90 + Math.cos(a) * 82)}
              y1={p(90 + Math.sin(a) * 82)}
              x2={p(90 + Math.cos(a) * 86)}
              y2={p(90 + Math.sin(a) * 86)}
              stroke="var(--border)"
              strokeWidth="1.5"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-5xl font-bold tabular-nums text-foreground text-glow">
          {score}
        </span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          / 100
        </span>
        <span className={cn("mt-2 font-mono text-xs font-semibold uppercase tracking-widest", POSTURE_COLOR[posture])}>
          {posture}
        </span>
      </div>
    </div>
  );
}
