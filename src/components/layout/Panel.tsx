import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DemoTag } from "./PageHeader";

export function Panel({
  title,
  code,
  right,
  children,
  className,
  bodyClassName,
  interactive = true,
  demo,
}: {
  demo?: boolean;
  title: string;
  code?: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  interactive?: boolean;
}) {
  return (
    <section className={cn("panel corner-brackets flex flex-col", interactive && "panel-interactive", className)}>
      <header className="flex items-center gap-2 border-b border-border/70 px-4 py-2.5">
        {code && <span className="font-mono text-[10px] text-primary">{code}</span>}
        <h2 className="font-display text-sm font-semibold uppercase tracking-[0.14em] text-foreground">
          {title}
        </h2>
        <DemoTag {...(demo !== undefined && { demo })} />
        <div className="ml-auto">{right}</div>
      </header>
      <div className={cn("flex-1 p-4", bodyClassName)}>{children}</div>
    </section>
  );
}
