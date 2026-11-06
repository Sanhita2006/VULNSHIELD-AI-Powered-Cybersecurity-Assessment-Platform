import { Construction } from "lucide-react";
import { PageHeader } from "./PageHeader";

/** Temporary module shell until the module is built in its roadmap step. */
export function ModulePlaceholder({
  code,
  title,
  description,
  step,
  features,
}: {
  code: string;
  title: string;
  description: string;
  step: string;
  features: string[];
}) {
  return (
    <div className="space-y-6">
      <PageHeader code={code} title={title} description={description} />
      <div className="panel corner-brackets scanline p-6 md:p-8">
        <div className="flex items-center gap-3">
          <Construction className="size-5 text-primary" />
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-primary">
            Scheduled · {step}
          </p>
        </div>
        <h2 className="mt-4 text-lg font-semibold text-foreground">What this module will do</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {features.map((f) => (
            <li key={f} className="flex gap-2 font-mono text-sm text-muted-foreground">
              <span className="text-primary">▸</span> {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
