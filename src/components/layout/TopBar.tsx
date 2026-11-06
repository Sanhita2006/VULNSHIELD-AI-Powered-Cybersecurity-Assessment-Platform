import { useEffect, useState } from "react";
import { FlaskConical, Radio } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useDataMode } from "@/hooks/use-data-mode";
import { cn } from "@/lib/utils";

function Clock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="hidden font-mono text-xs tabular-nums text-muted-foreground md:inline">
      {now ? now.toISOString().replace("T", " ").slice(0, 19) + " UTC" : "—"}
    </span>
  );
}

export function TopBar() {
  const { mode, setMode } = useDataMode();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md">
      <SidebarTrigger className="text-muted-foreground hover:text-primary" />
      <div className="h-5 w-px bg-border" />
      <span className="font-mono text-xs text-muted-foreground">
        <span className="text-primary">root@vulnshield</span>:~$
        <span className="ml-1 inline-block h-3.5 w-1.5 translate-y-0.5 bg-primary animate-blink" />
      </span>

      <div className="ml-auto flex items-center gap-4">
        <Clock />
        <div
          role="radiogroup"
          aria-label="Data source"
          className="flex rounded-md border border-border bg-terminal p-0.5 font-mono text-[11px] uppercase tracking-wider"
        >
          <button
            role="radio"
            aria-checked={mode === "demo"}
            onClick={() => setMode("demo")}
            className={cn(
              "flex items-center gap-1.5 rounded px-2.5 py-1 transition-colors",
              mode === "demo"
                ? "bg-demo text-demo-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <FlaskConical className="size-3" /> Demo
          </button>
          <button
            role="radio"
            aria-checked={mode === "live"}
            onClick={() => setMode("live")}
            className={cn(
              "flex items-center gap-1.5 rounded px-2.5 py-1 transition-colors",
              mode === "live"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Radio className="size-3" /> Live
          </button>
        </div>
      </div>
    </header>
  );
}
