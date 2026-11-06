import type { ReactNode } from "react";
import { FlaskConical } from "lucide-react";
import { useDataMode } from "@/hooks/use-data-mode";

export function PageHeader({
  code,
  title,
  description,
  actions,
}: {
  code: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-primary">
          [{code}] <span className="text-muted-foreground">module</span>
        </p>
        <h1 className="mt-1 text-2xl font-bold text-foreground md:text-3xl">{title}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {actions}
    </div>
  );
}

/** Persistent banner shown on every screen while simulated data is displayed. */
export function DemoBanner() {
  const { isDemo, setMode } = useDataMode();
  if (!isDemo) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-md border border-demo/50 bg-demo/10 px-4 py-2.5 text-sm">
      <FlaskConical className="size-4 shrink-0 text-demo" />
      <p className="flex-1 text-foreground">
        <span className="font-mono font-semibold uppercase tracking-wider text-demo">
          Simulated data
        </span>{" "}
        — figures below are sample values for demonstration, not results of a real scan.
      </p>
      <button
        onClick={() => setMode("live")}
        className="font-mono text-xs uppercase tracking-wider text-demo underline-offset-4 hover:underline"
      >
        Switch to live →
      </button>
    </div>
  );
}

/** `demo` overrides the global mode — real-scan screens pass demo={false}. */
export function DemoTag({ demo }: { demo?: boolean }) {
  const { isDemo } = useDataMode();
  if (!(demo ?? isDemo)) return null;
  return (
    <span className="rounded border border-demo/50 bg-demo/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-demo">
      Demo
    </span>
  );
}
