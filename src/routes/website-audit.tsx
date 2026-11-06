import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, type FormEvent } from "react";
import { Globe, LayoutDashboard, Lock, RotateCcw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/layout/Panel";
import { LiveLog } from "@/components/dashboard/LiveLog";
import { ScanProgress, type PhaseView } from "@/components/audit/ScanProgress";
import { AuditResults } from "@/components/audit/AuditResults";
import { auditDns, auditHttp, auditPrecheck, auditTls } from "@/lib/audit.functions";
import { normalizeTarget } from "@/lib/audit/url";
import { computeScore } from "@/lib/scoring";
import { saveScan } from "@/lib/scan-store";
import { useDataMode } from "@/hooks/use-data-mode";
import type { AuditDetails, CheckResult, Finding, LogEvent, PhaseResult, ScanSummary } from "@/lib/types";

export const Route = createFileRoute("/website-audit")({
  head: () => ({
    meta: [
      { title: "Website Security Audit — VULNSHIELD" },
      { name: "description", content: "Passive HTTPS, header, certificate and DNS assessment for websites you own." },
      { property: "og:title", content: "Website Security Audit — VULNSHIELD" },
      { property: "og:description", content: "Passive HTTPS, header, certificate and DNS assessment for websites you own." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WebsiteAudit,
});

const PHASES = [
  { key: "pre", label: "Validate target & resolve DNS (SSRF guard)" },
  { key: "http", label: "HTTPS, redirects, security headers & cookies" },
  { key: "tls", label: "Certificate (CT logs) & TLS configuration" },
  { key: "dns", label: "DNS, DNSSEC, CAA, SPF, DKIM & DMARC" },
] as const;

let logSeq = 0;

function WebsiteAudit() {
  const { setMode } = useDataMode();
  const pre = useServerFn(auditPrecheck);
  const http = useServerFn(auditHttp);
  const tls = useServerFn(auditTls);
  const dns = useServerFn(auditDns);

  const [url, setUrl] = useState("");
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState(false);
  const [running, setRunning] = useState(false);
  const [target, setTarget] = useState("");
  const [phases, setPhases] = useState<PhaseView[]>([]);
  const [logs, setLogs] = useState<LogEvent[]>([]);
  const [result, setResult] = useState<ScanSummary | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);

  const validation = normalizeTarget(url);
  const showError = touched && url.length > 0 && !validation.ok;

  const pushLogs = (entries: PhaseResult["log"]) =>
    setLogs((prev) => [...prev, ...entries.map((e) => ({ ...e, id: `l${++logSeq}` }))]);
  const clientLog = (level: LogEvent["level"], message: string) =>
    pushLogs([{ at: new Date().toISOString(), level, source: "client", message }]);
  const setPhase = (key: string, patch: Partial<PhaseView>) =>
    setPhases((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  async function run(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!validation.ok || !consent || running) return;

    const host = validation.host;
    const startedAt = new Date().toISOString();
    setRunning(true);
    setResult(null);
    setFatal(null);
    setLogs([]);
    setTarget(host);
    setPhases(PHASES.map((p) => ({ ...p, state: "idle" })));
    clientLog("info", `Passive audit started for ${host} · ownership confirmed by user`);

    const payload = { data: { url: validation.url, consent: true as const } };
    const fns = { pre, http, tls, dns };
    const checks: CheckResult[] = [];
    const findings: Finding[] = [];
    const allLogs: PhaseResult["log"] = [];
    let details: Partial<AuditDetails> = {};

    for (const p of PHASES) {
      setPhase(p.key, { state: "running" });
      const t0 = performance.now();
      try {
        const r = await fns[p.key](payload);
        checks.push(...r.checks);
        findings.push(...r.findings);
        allLogs.push(...r.log);
        details = { ...details, ...r.details };
        pushLogs(r.log);
        setPhase(p.key, { state: "done", ms: performance.now() - t0 });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Request failed";
        setPhase(p.key, { state: "error", ms: performance.now() - t0, note: msg.slice(0, 80) });
        const entry = { at: new Date().toISOString(), level: "alert" as const, source: p.key, message: msg };
        allLogs.push(entry);
        pushLogs([entry]);
        if (p.key === "pre") {
          setFatal(msg);
          setRunning(false);
          return;
        }
        checks.push({ id: `phase-${p.key}`, label: p.label, category: "Config", status: "unavailable", detail: `Phase failed: ${msg}` });
      }
    }

    // De-duplicate findings by id (a rule can only fire once per scan).
    const unique = [...new Map(findings.map((f) => [f.id, f])).values()];
    const scan: ScanSummary = {
      id: crypto.randomUUID(),
      target: host,
      startedAt,
      score: computeScore(unique),
      findings: unique,
      checks,
      log: allLogs.map((l, i) => ({ ...l, id: `s${i}` })),
      details: {
        host,
        resolvedIps: details.resolvedIps ?? [],
        redirectChain: details.redirectChain ?? [],
        responseHeaders: details.responseHeaders ?? [],
        dns: details.dns ?? [],
        ...(details.finalUrl !== undefined && { finalUrl: details.finalUrl }),
        ...(details.httpStatus !== undefined && { httpStatus: details.httpStatus }),
        ...(details.certificate !== undefined && { certificate: details.certificate }),
        ...(details.dnssecValidated !== undefined && { dnssecValidated: details.dnssecValidated }),
      },
      real: true,
    };
    clientLog("ok", `Scan complete · ${unique.length} finding(s) · score ${scan.score}/100`);
    saveScan(scan);
    setMode("live");
    setResult(scan);
    setRunning(false);
    toast.success("Scan saved", { description: "The dashboard now shows this real result (Live mode)." });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        code="WEB"
        title="Website Security Audit"
        description="Passive, rate-limited assessment of a website you own or are authorised to test."
      />

      <Panel title="Target" code="T1" demo={false} interactive={false}>
        <form onSubmit={run} className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Globe className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={() => setTouched(true)}
                placeholder="https://your-website.com"
                aria-label="Website URL"
                aria-invalid={showError}
                disabled={running}
                className="h-11 border-border bg-terminal pl-9 font-mono text-sm focus-visible:ring-primary"
                autoComplete="off"
                spellCheck={false}
              />
            </div>
            <Button type="submit" variant="neon" className="h-11 px-6" disabled={running || !validation.ok || !consent}>
              {running ? "Scanning…" : "Start passive scan"}
            </Button>
          </div>
          {showError && !validation.ok && <p className="font-mono text-xs text-sev-high">✗ {validation.error}</p>}
          {validation.ok && url && (
            <p className="font-mono text-xs text-muted-foreground">
              will assess <span className="text-primary">{validation.host}</span>
            </p>
          )}

          <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-terminal/60 p-3">
            <Checkbox
              checked={consent}
              onCheckedChange={(v) => setConsent(v === true)}
              disabled={running}
              className="mt-0.5 border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
            />
            <span className="text-sm text-foreground">
              I own this website or have explicit permission from its owner to run a security assessment.
              <span className="mt-1 block font-mono text-[11px] text-muted-foreground">
                Scanning sites without permission may be illegal. VULNSHIELD only makes ordinary page and DNS requests.
              </span>
            </span>
          </label>

          <div className="grid gap-2 font-mono text-[11px] text-muted-foreground sm:grid-cols-3">
            <p className="flex gap-1.5"><Lock className="size-3.5 shrink-0 text-primary" /> Passive only: 2 page requests + DNS lookups</p>
            <p className="flex gap-1.5"><ShieldAlert className="size-3.5 shrink-0 text-primary" /> No payloads, crawling, fuzzing or login attempts</p>
            <p className="flex gap-1.5"><RotateCcw className="size-3.5 shrink-0 text-primary" /> Rate-limited: 1 scan / 15 s per site</p>
          </div>
        </form>
      </Panel>

      {fatal && (
        <div className="rounded-md border border-sev-high/50 bg-sev-high/10 px-4 py-3 text-sm text-foreground">
          <span className="font-mono font-semibold uppercase text-sev-high">Scan blocked</span> — {fatal}
        </div>
      )}

      {phases.length > 0 && (running || !result) && (
        <div className="grid gap-4 xl:grid-cols-5">
          <Panel title="Scan progress" code="P1" demo={false} className="xl:col-span-2" interactive={false}>
            <ScanProgress phases={phases} target={target} />
          </Panel>
          <Panel title="Live scan log" code="P2" demo={false} className="xl:col-span-3" interactive={false}>
            <LiveLog isDemo={false} events={logs} />
          </Panel>
        </div>
      )}

      {result && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold text-foreground">
              Results for <span className="text-primary">{result.target}</span>
            </h2>
            <Button asChild variant="terminal" size="sm">
              <Link to="/">
                <LayoutDashboard /> View on dashboard
              </Link>
            </Button>
          </div>
          <AuditResults scan={result} />
        </>
      )}
    </div>
  );
}
