import { useEffect, useRef, useState } from "react";
import { demoLogTemplates } from "@/lib/demo-data";
import type { LogEvent, LogLevel } from "@/lib/types";
import { cn } from "@/lib/utils";

const LEVEL_STYLE: Record<LogLevel, string> = {
  info: "text-muted-foreground",
  ok: "text-primary",
  warn: "text-sev-medium",
  alert: "text-sev-high",
};

let seq = 0; // globally unique ids for rendered rows

const LEVEL_TAG: Record<LogLevel, string> = { info: "INFO", ok: " OK ", warn: "WARN", alert: "ALRT" };

/**
 * Terminal-style activity stream. In demo mode it replays simulated events;
 * in live mode it renders whatever real events are passed in (Step 6 will
 * stream actual scan progress here).
 */
export function LiveLog({ isDemo, events = [] }: { isDemo: boolean; events?: LogEvent[] }) {
  const [demoEvents, setDemoEvents] = useState<LogEvent[]>([]);
  const counter = useRef(0);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDemo) return;
    counter.current = 0;
    setDemoEvents([]);
    const push = () => {
      const tpl = demoLogTemplates[counter.current % demoLogTemplates.length];
      counter.current += 1;
      if (!tpl) return;
      const event: LogEvent = { ...tpl, id: `e${++seq}`, at: new Date().toISOString() };
      setDemoEvents((prev) => [...prev, event].slice(-60));
    };
    for (let i = 0; i < 6; i++) push();
    const t = setInterval(push, 1800);
    return () => clearInterval(t);
  }, [isDemo]);

  const rows = isDemo ? demoEvents : events;

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [rows.length]);

  return (
    <div
      ref={scroller}
      className="relative h-72 overflow-y-auto rounded-md border border-border bg-terminal p-3 font-mono text-[12px] leading-relaxed"
    >
      {rows.length === 0 ? (
        <p className="text-muted-foreground">
          <span className="text-primary">$</span> awaiting events — run a Website Audit to stream real scan activity
          <span className="ml-1 inline-block h-3 w-1.5 bg-primary align-middle animate-blink" />
        </p>
      ) : (
        rows.map((e) => (
          <div key={e.id} className="flex gap-2 animate-log-in">
            <span className="shrink-0 tabular-nums text-muted-foreground/70">{e.at.slice(11, 19)}</span>
            <span className={cn("shrink-0 font-semibold", LEVEL_STYLE[e.level])}>[{LEVEL_TAG[e.level]}]</span>
            <span className="shrink-0 text-accent-foreground/80">{e.source}</span>
            <span className={cn("min-w-0", e.level === "info" ? "text-foreground/80" : LEVEL_STYLE[e.level])}>
              {e.message}
            </span>
          </div>
        ))
      )}
    </div>
  );
}
