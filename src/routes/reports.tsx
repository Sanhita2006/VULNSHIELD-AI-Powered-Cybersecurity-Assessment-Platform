import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  Download,
  FileText,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";
import { PageHeader, DemoBanner } from "@/components/layout/PageHeader";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScoreGauge } from "@/components/dashboard/ScoreGauge";
import { useScans } from "@/hooks/use-scans";
import { computeScore, countBySeverity, postureFor, SEVERITY_PENALTY } from "@/lib/scoring";
import { cn } from "@/lib/utils";
import type { Finding, Severity, ScanSummary } from "@/lib/types";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Audit Reports — VULNSHIELD" },
      { name: "description", content: "Scan history and exportable security reports." },
      { property: "og:title", content: "Audit Reports — VULNSHIELD" },
      { property: "og:description", content: "Scan history and exportable security reports." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

// ── Severity badge ────────────────────────────────────────────────────────────
const SEV_STYLE: Record<Severity, string> = {
  high: "bg-sev-high/15 text-sev-high border-sev-high/40",
  medium: "bg-sev-medium/15 text-sev-medium border-sev-medium/40",
  low: "bg-sev-low/15 text-sev-low border-sev-low/40",
};

function SevBadge({ sev }: { sev: Severity }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider",
        SEV_STYLE[sev],
      )}
    >
      {sev}
    </span>
  );
}

// ── Finding row ───────────────────────────────────────────────────────────────
function FindingRow({ finding }: { finding: Finding }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-border/40 last:border-0">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <SevBadge sev={finding.severity} />
        <span className="flex-1 font-mono text-xs text-foreground">{finding.title}</span>
        <span className="font-mono text-[10px] text-muted-foreground">{finding.category}</span>
      </button>
      {open && (
        <div className="bg-muted/20 px-4 pb-3 pt-1 space-y-1.5 font-mono text-[11px] text-muted-foreground">
          <p>{finding.description}</p>
          <p className="text-primary/80">
            <span className="font-semibold text-foreground">Remediation:</span>{" "}
            {finding.remediation}
          </p>
          {finding.owasp && (
            <p>
              <span className="font-semibold text-foreground">OWASP:</span> {finding.owasp}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── CSV / JSON / plain-text helpers ──────────────────────────────────────────
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportJSON(scan: ScanSummary, isDemo: boolean) {
  const payload = {
    generated: new Date().toISOString(),
    dataMode: isDemo ? "demo" : "live",
    target: scan.target,
    startedAt: scan.startedAt,
    score: scan.score,
    posture: postureFor(scan.score),
    findings: scan.findings,
  };
  downloadBlob(
    new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
    `vulnshield-report-${scan.id}.json`,
  );
}

function exportCSV(scan: ScanSummary, isDemo: boolean) {
  const header = "id,title,severity,category,owasp,description,remediation";
  const rows = scan.findings.map((f) =>
    [f.id, f.title, f.severity, f.category, f.owasp ?? "", f.description, f.remediation]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  const csv = [
    `# VULNSHIELD Audit Report — ${isDemo ? "DEMO DATA" : "LIVE SCAN"}`,
    `# Target: ${scan.target}`,
    `# Score: ${scan.score}/100`,
    `# Generated: ${new Date().toISOString()}`,
    "",
    header,
    ...rows,
  ].join("\n");
  downloadBlob(
    new Blob([csv], { type: "text/csv" }),
    `vulnshield-report-${scan.id}.csv`,
  );
}

function exportPDF(scan: ScanSummary, isDemo: boolean) {
  // Build a printable HTML page and open it in a new tab so the user can
  // Print → Save as PDF via the native browser dialog. This avoids any
  // third-party PDF library dependency.
  const counts = countBySeverity(scan.findings);
  const rows = scan.findings
    .map(
      (f) =>
        `<tr>
          <td style="padding:4px 8px;border:1px solid #334155;font-weight:600;color:${
            f.severity === "high" ? "#f87171" : f.severity === "medium" ? "#fb923c" : "#a3e635"
          }">${f.severity.toUpperCase()}</td>
          <td style="padding:4px 8px;border:1px solid #334155">${f.title}</td>
          <td style="padding:4px 8px;border:1px solid #334155">${f.category}</td>
          <td style="padding:4px 8px;border:1px solid #334155">${f.remediation}</td>
        </tr>`,
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>VULNSHIELD Audit Report – ${scan.target}</title>
  <style>
    body{font-family:monospace;background:#0f172a;color:#e2e8f0;margin:32px;font-size:12px}
    h1{color:#22d3ee;font-size:20px;margin:0 0 4px}
    h2{color:#94a3b8;font-size:13px;margin:24px 0 8px;text-transform:uppercase;letter-spacing:.1em}
    table{width:100%;border-collapse:collapse;margin-top:8px}
    th{background:#1e293b;padding:6px 8px;border:1px solid #334155;text-align:left}
    td{vertical-align:top}
    .badge{display:inline-block;padding:2px 6px;border-radius:4px;font-size:10px;font-weight:700}
    .hi{background:#7f1d1d;color:#fca5a5} .md{background:#7c2d12;color:#fdba74} .lo{background:#1a2e05;color:#a3e635}
    .meta{color:#94a3b8;margin:4px 0}
    .demo{background:#78350f;color:#fcd34d;padding:4px 10px;border-radius:4px;display:inline-block;margin-bottom:12px}
  </style>
</head>
<body>
  <h1>VULNSHIELD — Audit Report</h1>
  ${isDemo ? '<div class="demo">⚠ DEMO DATA — Simulated, not a real scan</div>' : ""}
  <p class="meta">Target: <strong>${scan.target}</strong></p>
  <p class="meta">Scanned: ${new Date(scan.startedAt).toUTCString()}</p>
  <p class="meta">Generated: ${new Date().toUTCString()}</p>
  <p class="meta">Score: <strong>${scan.score}/100</strong> — ${postureFor(scan.score)}</p>

  <h2>Severity Summary</h2>
  <span class="badge hi">${counts.high} High</span>&nbsp;
  <span class="badge md">${counts.medium} Medium</span>&nbsp;
  <span class="badge lo">${counts.low} Low</span>

  <h2>Findings (${scan.findings.length})</h2>
  <table>
    <thead><tr><th>Severity</th><th>Title</th><th>Category</th><th>Remediation</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>

  <p style="margin-top:32px;color:#475569;font-size:10px">
    Score formula: 100 − ${SEVERITY_PENALTY.high}×High − ${SEVERITY_PENALTY.medium}×Medium − ${SEVERITY_PENALTY.low}×Low · clamped 0–100
  </p>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    win.print();
  }
}

// ── History row ───────────────────────────────────────────────────────────────
function HistoryRow({
  scan,
  isDemo,
  onSelect,
  selected,
}: {
  scan: ScanSummary;
  isDemo: boolean;
  onSelect: () => void;
  selected: boolean;
}) {
  const counts = countBySeverity(scan.findings);
  return (
    <button
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-3 border-b border-border/40 px-4 py-3 text-left last:border-0 transition-colors hover:bg-muted/30",
        selected && "bg-primary/10",
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="font-mono text-xs text-foreground truncate">{scan.target}</p>
        <p className="font-mono text-[10px] text-muted-foreground">
          {new Date(scan.startedAt).toLocaleString()}
          {isDemo && (
            <span className="ml-2 rounded border border-demo/50 bg-demo/10 px-1 py-0.5 text-[9px] text-demo">
              DEMO
            </span>
          )}
        </p>
      </div>
      <span className="font-mono text-sm font-bold text-foreground">{scan.score}</span>
      <div className="flex gap-1 text-[10px]">
        {counts.high > 0 && <span className="text-sev-high">{counts.high}H</span>}
        {counts.medium > 0 && <span className="text-sev-medium">{counts.medium}M</span>}
        {counts.low > 0 && <span className="text-sev-low">{counts.low}L</span>}
      </div>
    </button>
  );
}

// ── Main page component ───────────────────────────────────────────────────────
function ReportsPage() {
  const { scans, isDemo } = useScans();

  // Default to the most recent scan
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const scan: ScanSummary | null = useMemo(() => {
    if (!scans.length) return null;
    return scans.find((s) => s.id === selectedId) ?? scans[scans.length - 1];
  }, [scans, selectedId]);

  const counts = useMemo(
    () => (scan ? countBySeverity(scan.findings) : { high: 0, medium: 0, low: 0 }),
    [scan],
  );

  const score = scan?.score ?? 0;
  const posture = postureFor(score);

  // Sort findings: high → medium → low
  const sortedFindings = useMemo(() => {
    if (!scan) return [];
    const order: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
    return [...scan.findings].sort((a, b) => order[a.severity] - order[b.severity]);
  }, [scan]);

  const noScans = scans.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        code="RPT"
        title="Audit Reports"
        description="Aggregated security findings from all VULNSHIELD modules. Export PDF, JSON, or CSV reports for any scan."
        actions={
          scan ? (
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportJSON(scan, isDemo)}
                className="flex items-center gap-1.5 font-mono text-xs"
              >
                <Download className="size-3" />
                JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportCSV(scan, isDemo)}
                className="flex items-center gap-1.5 font-mono text-xs"
              >
                <Download className="size-3" />
                CSV
              </Button>
              <Button
                variant="neon"
                size="sm"
                onClick={() => exportPDF(scan, isDemo)}
                className="flex items-center gap-1.5 font-mono text-xs"
              >
                <FileText className="size-3" />
                PDF
              </Button>
            </div>
          ) : undefined
        }
      />

      <DemoBanner />

      {noScans ? (
        <Panel title="No Reports Yet" code="RPT-00">
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <ShieldAlert className="size-10 text-muted-foreground/50" />
            <p className="font-mono text-sm text-muted-foreground">
              No scan data found. Run a Website Audit to generate your first report.
            </p>
          </div>
        </Panel>
      ) : (
        <>
          {/* Score + Summary row */}
          <div className="grid gap-4 lg:grid-cols-[minmax(0,300px)_1fr]">
            <Panel title="Security Score" code="01" className="scanline">
              <ScoreGauge score={score} />
              <div className="mt-4 space-y-1 font-mono text-[11px] text-muted-foreground">
                <p>
                  Posture:{" "}
                  <span
                    className={cn(
                      "font-semibold",
                      posture === "Strong"
                        ? "text-primary"
                        : posture === "Fair"
                          ? "text-sev-low"
                          : posture === "Weak"
                            ? "text-sev-medium"
                            : "text-sev-high",
                    )}
                  >
                    {posture}
                  </span>
                </p>
                <p>Target: {scan?.target}</p>
                <p>Scanned: {scan ? new Date(scan.startedAt).toLocaleString() : "—"}</p>
                <p className="text-muted-foreground/60">
                  Rule: 100 − {SEVERITY_PENALTY.high}×H − {SEVERITY_PENALTY.medium}×M −{" "}
                  {SEVERITY_PENALTY.low}×L
                </p>
              </div>
            </Panel>

            <div className="flex flex-col gap-4">
              {/* Severity breakdown */}
              <Panel title="Severity Breakdown" code="02">
                <div className="grid grid-cols-3 gap-4">
                  {(["high", "medium", "low"] as Severity[]).map((sev) => (
                    <div
                      key={sev}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-md border p-4",
                        sev === "high"
                          ? "border-sev-high/30 bg-sev-high/5"
                          : sev === "medium"
                            ? "border-sev-medium/30 bg-sev-medium/5"
                            : "border-sev-low/30 bg-sev-low/5",
                      )}
                    >
                      {sev === "high" ? (
                        <XCircle className="size-5 text-sev-high" />
                      ) : sev === "medium" ? (
                        <AlertTriangle className="size-5 text-sev-medium" />
                      ) : (
                        <Info className="size-5 text-sev-low" />
                      )}
                      <span
                        className={cn(
                          "mt-2 font-display text-3xl font-bold tabular-nums",
                          sev === "high"
                            ? "text-sev-high"
                            : sev === "medium"
                              ? "text-sev-medium"
                              : "text-sev-low",
                        )}
                      >
                        {counts[sev]}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                        {sev}
                      </span>
                    </div>
                  ))}
                </div>
              </Panel>

              {/* Quick stats */}
              <Panel title="Report Summary" code="03">
                <div className="grid gap-2 sm:grid-cols-2 font-mono text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-primary" />
                    <span>
                      Total findings:{" "}
                      <span className="text-foreground font-semibold">{scan?.findings.length ?? 0}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-primary" />
                    <span>
                      Checks run:{" "}
                      <span className="text-foreground font-semibold">{scan?.checks.length ?? 0}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-primary" />
                    <span>
                      Data mode:{" "}
                      <span className={cn("font-semibold", isDemo ? "text-demo" : "text-primary")}>
                        {isDemo ? "Demo (Simulated)" : "Live Scan"}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RefreshCw className="size-4 text-primary" />
                    <span>
                      History:{" "}
                      <span className="text-foreground font-semibold">{scans.length} scan{scans.length !== 1 ? "s" : ""}</span>
                    </span>
                  </div>
                </div>
              </Panel>
            </div>
          </div>

          {/* Findings list + History side by side */}
          <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,340px)]">
            {/* Findings */}
            <Panel
              title={`Findings — ${scan?.target ?? ""}`}
              code="04"
              demo={isDemo}
              bodyClassName="p-0"
            >
              {sortedFindings.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                  <ShieldCheck className="size-8 text-primary" />
                  <p className="font-mono text-xs text-muted-foreground">No findings for this scan.</p>
                </div>
              ) : (
                <div>
                  {sortedFindings.map((f) => (
                    <FindingRow key={f.id} finding={f} />
                  ))}
                </div>
              )}
            </Panel>

            {/* Scan history */}
            <Panel title="Scan History" code="05" bodyClassName="p-0">
              {scans.length === 0 ? (
                <p className="px-4 py-8 text-center font-mono text-xs text-muted-foreground">
                  No history yet.
                </p>
              ) : (
                <div>
                  {[...scans].reverse().map((s) => (
                    <HistoryRow
                      key={s.id}
                      scan={s}
                      isDemo={isDemo}
                      selected={s.id === (scan?.id ?? null)}
                      onSelect={() => setSelectedId(s.id)}
                    />
                  ))}
                </div>
              )}
            </Panel>
          </div>

          {/* Remediation recommendations */}
          {sortedFindings.filter((f) => f.severity === "high").length > 0 && (
            <Panel title="Priority Remediation Recommendations" code="06">
              <div className="space-y-3">
                {sortedFindings
                  .filter((f) => f.severity === "high")
                  .slice(0, 5)
                  .map((f) => (
                    <div
                      key={f.id}
                      className="rounded-md border border-sev-high/30 bg-sev-high/5 p-3 font-mono text-xs"
                    >
                      <p className="font-semibold text-sev-high">{f.title}</p>
                      <p className="mt-1 text-muted-foreground">{f.remediation}</p>
                    </div>
                  ))}
              </div>
            </Panel>
          )}
        </>
      )}
    </div>
  );
}
