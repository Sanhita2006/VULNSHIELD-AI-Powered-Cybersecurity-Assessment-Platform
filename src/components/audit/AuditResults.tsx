import { Lightbulb, ShieldCheck, Target } from "lucide-react";
import { Panel } from "@/components/layout/Panel";
import { ScoreGauge } from "@/components/dashboard/ScoreGauge";
import { SeverityCards } from "@/components/dashboard/SeverityCards";
import { StatusOverview } from "@/components/dashboard/StatusOverview";
import { LiveLog } from "@/components/dashboard/LiveLog";
import { countBySeverity, SEVERITY_PENALTY } from "@/lib/scoring";
import type { Finding, ScanSummary, Severity } from "@/lib/types";
import { cn } from "@/lib/utils";

const SEV_ORDER: Severity[] = ["high", "medium", "low"];
const SEV_CLS: Record<Severity, string> = {
  high: "border-sev-high/50 bg-sev-high/10 text-sev-high",
  medium: "border-sev-medium/50 bg-sev-medium/10 text-sev-medium",
  low: "border-sev-low/50 bg-sev-low/10 text-sev-low",
};

export function AuditResults({ scan }: { scan: ScanSummary }) {
  const counts = countBySeverity(scan.findings);
  const sorted = [...scan.findings].sort((a, b) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity));
  const unavailable = scan.checks.filter((c) => c.status === "unavailable").length;
  const d = scan.details;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
        <Panel title="Security score" code="R1" demo={false}>
          <ScoreGauge score={scan.score} />
          <div className="mt-4 space-y-1.5 font-mono text-[11px] text-muted-foreground">
            <div className="flex items-center gap-2">
              <Target className="size-3.5 text-primary" />
              <span className="truncate text-foreground">{scan.target}</span>
            </div>
            <p>Scanned {scan.startedAt.slice(0, 19).replace("T", " ")} UTC</p>
            <p className="flex items-center gap-1.5 text-primary">
              <ShieldCheck className="size-3.5" /> Real scan result
            </p>
            <p className="text-muted-foreground/70">
              Rule: 100 − {SEVERITY_PENALTY.high}×High − {SEVERITY_PENALTY.medium}×Med − {SEVERITY_PENALTY.low}×Low.
              {unavailable > 0 && ` ${unavailable} unavailable check(s) are not scored.`}
            </p>
          </div>
        </Panel>
        <div className="flex flex-col gap-4">
          <SeverityCards counts={counts} demo={false} />
          <Panel title="Checks performed" code="R2" demo={false}>
            <StatusOverview checks={scan.checks} />
          </Panel>
        </div>
      </div>

      <Panel title="Findings & recommendations" code="R3" demo={false}>
        {sorted.length === 0 ? (
          <p className="font-mono text-sm text-primary">No issues found by the checks that could run.</p>
        ) : (
          <ul className="space-y-3">
            {sorted.map((f) => (
              <FindingRow key={f.id} f={f} />
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Response headers" code="R4" demo={false}>
          {d?.responseHeaders.length ? (
            <div className="max-h-80 overflow-auto rounded-md border border-border bg-terminal p-3 font-mono text-[11px] leading-relaxed">
              {d.finalUrl && (
                <p className="mb-2 text-muted-foreground">
                  {d.httpStatus} {d.finalUrl}
                  {d.redirectChain.length > 1 && ` (via ${d.redirectChain.length - 1} redirect(s))`}
                </p>
              )}
              {d.responseHeaders.map(([k, v], i) => (
                <p key={`${k}-${i}`} className="break-all">
                  <span className="text-primary">{k}</span>: <span className="text-foreground/80">{v}</span>
                </p>
              ))}
            </div>
          ) : (
            <Unavailable text="No HTTPS response was received, so headers could not be read." />
          )}
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="Certificate" code="R5" demo={false}>
            {d?.certificate ? (
              <dl className="grid grid-cols-[110px_1fr] gap-y-1.5 font-mono text-[12px]">
                <dt className="text-muted-foreground">Names</dt>
                <dd className="break-all text-foreground">{d.certificate.commonName}</dd>
                <dt className="text-muted-foreground">Issuer</dt>
                <dd className="text-foreground">{d.certificate.issuer}</dd>
                <dt className="text-muted-foreground">Valid from</dt>
                <dd className="text-foreground">{d.certificate.notBefore.slice(0, 10)}</dd>
                <dt className="text-muted-foreground">Expires</dt>
                <dd className="text-foreground">
                  {d.certificate.notAfter.slice(0, 10)} ({d.certificate.daysRemaining} days)
                </dd>
                <dt className="text-muted-foreground">Source</dt>
                <dd className="text-muted-foreground">Public CT logs — may differ from the served certificate</dd>
              </dl>
            ) : (
              <Unavailable text="Certificate details unavailable (no matching entry in Certificate Transparency logs, or the lookup failed)." />
            )}
          </Panel>
          <Panel title="DNS records" code="R6" demo={false}>
            {d?.dns.length ? (
              <div className="max-h-64 overflow-auto font-mono text-[11px]">
                {d.dns.map((r) => (
                  <div key={`${r.type}-${r.name}`} className="border-b border-border/50 py-1.5 last:border-0">
                    <span className="mr-2 inline-block w-12 text-primary">{r.type}</span>
                    <span className="text-muted-foreground">{r.name}</span>
                    {r.values.map((v) => (
                      <p key={v} className="ml-14 break-all text-foreground/80">
                        {v}
                      </p>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <Unavailable text="DNS lookup did not complete." />
            )}
          </Panel>
        </div>
      </div>

      <Panel title="Scan log" code="R7" demo={false}>
        <LiveLog isDemo={false} events={scan.log ?? []} />
      </Panel>
    </div>
  );
}

function FindingRow({ f }: { f: Finding }) {
  return (
    <li className="rounded-md border border-border/70 bg-terminal/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase", SEV_CLS[f.severity])}>
          {f.severity}
        </span>
        <span className="text-sm font-medium text-foreground">{f.title}</span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
          {f.category}
          {f.owasp && ` · ${f.owasp}`}
        </span>
      </div>
      <p className="mt-1.5 text-sm text-muted-foreground">{f.description}</p>
      {f.evidence && (
        <p className="mt-1.5 break-all font-mono text-[11px] text-foreground/70">evidence: {f.evidence}</p>
      )}
      <p className="mt-2 flex gap-2 font-mono text-[12px] text-primary">
        <Lightbulb className="mt-0.5 size-3.5 shrink-0" />
        <span>{f.remediation}</span>
      </p>
    </li>
  );
}

function Unavailable({ text }: { text: string }) {
  return (
    <p className="rounded-md border border-dashed border-border px-3 py-4 font-mono text-[12px] text-sev-info">
      UNAVAILABLE — {text}
    </p>
  );
}
