import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Eye,
  Filter,
  Globe,
  HelpCircle,
  Info,
  Laptop,
  Lightbulb,
  Lock,
  Monitor,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Terminal,
  Unlock,
  XCircle,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/layout/Panel";
import { ScoreGauge } from "@/components/dashboard/ScoreGauge";
import { SeverityCards } from "@/components/dashboard/SeverityCards";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  collectDeviceInfo,
  runDeviceSecurityAudit,
  type DeviceAuditReport,
  type SecurityCheckItem,
} from "@/lib/device-audit";
import { countBySeverity, SEVERITY_PENALTY } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/device-audit")({
  head: () => ({
    meta: [
      { title: "Device Security Audit — VULNSHIELD" },
      {
        name: "description",
        content: "Browser-visible device audit: secure context, hardware cryptography, storage isolation, and sandbox boundaries.",
      },
      { property: "og:title", content: "Device Security Audit — VULNSHIELD" },
      {
        property: "og:description",
        content: "Browser-visible device audit: secure context, hardware cryptography, storage isolation, and sandbox boundaries.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DeviceAuditPage,
});

type CategoryFilter = "all" | "Transport" | "Crypto" | "Isolation" | "Privacy" | "Environment";
type StatusFilter = "all" | "flagged" | "pass";

function DeviceAuditPage() {
  const [report, setReport] = useState<DeviceAuditReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [activeStatus, setActiveStatus] = useState<StatusFilter>("all");
  const [showSandboxDetails, setShowSandboxDetails] = useState(false);

  const runAudit = async () => {
    setLoading(true);
    try {
      const res = await runDeviceSecurityAudit();
      setReport(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runAudit();
  }, []);

  const filteredChecks = useMemo(() => {
    if (!report) return [];
    return report.checks.filter((check) => {
      if (activeCategory !== "all" && check.category !== activeCategory) return false;
      if (activeStatus === "flagged" && check.status === "pass") return false;
      if (activeStatus === "pass" && check.status !== "pass") return false;
      return true;
    });
  }, [report, activeCategory, activeStatus]);

  const counts = useMemo(() => {
    return report ? countBySeverity(report.findings) : { high: 0, medium: 0, low: 0 };
  }, [report]);

  return (
    <div className="space-y-6">
      <PageHeader
        code="DEV"
        title="Device Security Audit"
        description="Inspects client browser capabilities, secure context enforcement, cryptographic APIs, and privacy signals without intruding beyond the browser sandbox."
        actions={
          <Button
            variant="neon"
            onClick={runAudit}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            {loading ? "Auditing..." : "Re-run Audit"}
          </Button>
        }
      />

      {/* Main Score & Hardware Overview */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
        <Panel title="Client Security Score" code="01" className="scanline">
          {report ? (
            <>
              <ScoreGauge score={report.score} />
              <div className="mt-4 space-y-1.5 font-mono text-[11px] text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Laptop className="size-3.5 text-primary" />
                  <span className="truncate text-foreground">
                    {report.device.browserName} on {report.device.osFamily}
                  </span>
                </div>
                <p>
                  Audited {report.timestamp.slice(0, 16).replace("T", " ")} UTC · posture{" "}
                  <span className="text-foreground">{report.posture}</span>
                </p>
                <p className="text-muted-foreground/70">
                  Rule: 100 − {SEVERITY_PENALTY.high}×High − {SEVERITY_PENALTY.medium}×Med − {SEVERITY_PENALTY.low}×Low
                </p>
              </div>
            </>
          ) : (
            <div className="flex h-52 items-center justify-center font-mono text-xs text-muted-foreground">
              Collecting client telemetry...
            </div>
          )}
        </Panel>

        <div className="flex flex-col gap-4">
          <SeverityCards counts={counts} />

          <Panel title="Observed Client Environment" code="02">
            {report ? (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                <SpecItem
                  icon={<Globe className="size-4 text-primary" />}
                  label="Browser & Engine"
                  value={`${report.device.browserName} ${report.device.browserVersion || ""}`}
                  subtext={report.device.platform}
                />
                <SpecItem
                  icon={<Laptop className="size-4 text-primary" />}
                  label="Operating System"
                  value={report.device.osFamily}
                  subtext={report.device.online ? "Network Online" : "Offline Mode"}
                />
                <SpecItem
                  icon={<Monitor className="size-4 text-primary" />}
                  label="Display Specs"
                  value={report.device.screenResolution}
                  subtext={`${report.device.colorDepth}-bit depth · ${report.device.devicePixelRatio}x scaling`}
                />
                <SpecItem
                  icon={<Cpu className="size-4 text-primary" />}
                  label="Hardware Concurrency"
                  value={
                    report.device.hardwareConcurrency
                      ? `${report.device.hardwareConcurrency} Logical Cores`
                      : "Restricted by Browser"
                  }
                  subtext="CPU thread parallelism"
                />
                <SpecItem
                  icon={<Terminal className="size-4 text-primary" />}
                  label="Device Memory (RAM)"
                  value={
                    report.device.deviceMemoryGb
                      ? `~${report.device.deviceMemoryGb} GB Allocated`
                      : "Not Exposed (Privacy)"
                  }
                  subtext="Coarse memory tier"
                />
                <SpecItem
                  icon={<Smartphone className="size-4 text-primary" />}
                  label="Input Capabilities"
                  value={report.device.touchSupport ? "Touch Interface" : "Pointer / Keyboard"}
                  subtext={`Language: ${report.device.language}`}
                />
              </div>
            ) : null}
          </Panel>
        </div>
      </div>

      {/* Security Capability Probes */}
      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-3 rounded-md border border-border bg-terminal/70 p-3.5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <Filter className="mr-1 size-3.5 text-muted-foreground" />
            <FilterButton
              label="All Probes"
              active={activeCategory === "all"}
              onClick={() => setActiveCategory("all")}
            />
            <FilterButton
              label="Transport (HTTPS)"
              active={activeCategory === "Transport"}
              onClick={() => setActiveCategory("Transport")}
            />
            <FilterButton
              label="Crypto API"
              active={activeCategory === "Crypto"}
              onClick={() => setActiveCategory("Crypto")}
            />
            <FilterButton
              label="Isolation"
              active={activeCategory === "Isolation"}
              onClick={() => setActiveCategory("Isolation")}
            />
            <FilterButton
              label="Privacy Signals"
              active={activeCategory === "Privacy"}
              onClick={() => setActiveCategory("Privacy")}
            />
            <FilterButton
              label="Environment"
              active={activeCategory === "Environment"}
              onClick={() => setActiveCategory("Environment")}
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveStatus(activeStatus === "flagged" ? "all" : "flagged")}
              className={cn(
                "rounded border px-2.5 py-1 font-mono text-[11px] font-medium transition-colors",
                activeStatus === "flagged"
                  ? "border-sev-medium/70 bg-sev-medium/20 text-sev-medium"
                  : "border-border bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              Flagged Only ({report ? report.checks.filter((c) => c.status !== "pass").length : 0})
            </button>
          </div>
        </div>

        {/* Checks Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredChecks.map((check) => (
            <CheckCard key={check.id} check={check} />
          ))}
        </div>
      </div>

      {/* Security Hardening Recommendations */}
      <Panel title="Actionable Device & Browser Hardening" code="REC">
        <div className="grid gap-4 md:grid-cols-3">
          <RecommendationCard
            title="1. Enable Global Privacy Control"
            priority="Recommended"
            description="Broadcast the Sec-GPC header signal to legally require websites and ad brokers to refrain from selling or sharing your personal browsing footprint."
            action="Enable GPC in Brave, Firefox, DuckDuckGo, or via privacy extensions."
          />
          <RecommendationCard
            title="2. Enforce Strict HTTPS-First Mode"
            priority="High Priority"
            description="Configure your browser to automatically upgrade all HTTP navigation requests to encrypted HTTPS, preventing passive Wi-Fi eavesdropping."
            action="Turn on 'Always use secure connections' in browser settings."
          />
          <RecommendationCard
            title="3. Audit Site Permissions & WebRTC"
            priority="Good Practice"
            description="Regularly revoke unused camera, microphone, and location permissions. If using a VPN, ensure WebRTC mDNS masking prevents real IP leakage."
            action="Review permissions under chrome://settings/content or about:preferences."
          />
        </div>
      </Panel>

      {/* Critical Transparency & Sandbox Boundaries */}
      <section className="panel corner-brackets border-primary/40 bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded border border-primary/50 bg-primary/10 text-primary">
              <ShieldAlert className="size-4" />
            </span>
            <div>
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                Browser Sandbox Boundaries — What Web Applications Cannot Check
              </h3>
              <p className="font-mono text-[11px] text-muted-foreground">
                Honesty in cybersecurity: Modern web browsers strictly isolate web code from operating system internals.
              </p>
            </div>
          </div>
          <Button
            variant="terminal"
            size="sm"
            onClick={() => setShowSandboxDetails(!showSandboxDetails)}
            className="font-mono text-xs"
          >
            {showSandboxDetails ? "Hide Boundary Details" : "Inspect Sandbox Architecture"}
          </Button>
        </div>

        {showSandboxDetails && (
          <div className="mt-5 space-y-3 border-t border-border/70 pt-4">
            <div className="rounded-md border border-primary/20 bg-primary/5 p-3 font-mono text-xs text-muted-foreground leading-relaxed">
              <span className="font-bold text-primary">Security Architecture Note: </span>
              Any website that claims to "scan your PC for malware" or "check your Windows antivirus" from a regular browser tab is fraudulent. The browser security model purposefully isolates JavaScript in a sandboxed process with no access to local files, OS patch levels, or system registry.
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {report?.restrictions.map((r) => (
                <div key={r.title} className="rounded-md border border-border bg-terminal/70 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-primary">{r.category}</span>
                    <Badge variant="outline" className="border-border/80 font-mono text-[9px] text-muted-foreground">
                      {r.reason}
                    </Badge>
                  </div>
                  <h4 className="mt-1 font-semibold text-xs text-foreground">{r.title}</h4>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                    {r.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function SpecItem({
  icon,
  label,
  value,
  subtext,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
}) {
  return (
    <div className="rounded-md border border-border/70 bg-terminal/60 p-3">
      <div className="flex items-center gap-2 text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
        {icon}
        <span>{label}</span>
      </div>
      <p className="mt-1 font-semibold text-sm text-foreground truncate">{value}</p>
      <p className="mt-0.5 font-mono text-[10px] text-muted-foreground truncate">{subtext}</p>
    </div>
  );
}

function FilterButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md border px-2.5 py-1 font-mono text-[11px] font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
          : "border-border bg-background text-muted-foreground hover:border-border-glow hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}

function CheckCard({ check }: { check: SecurityCheckItem }) {
  const isPass = check.status === "pass";
  const isFail = check.status === "fail";
  const isWarn = check.status === "warn";

  return (
    <div
      className={cn(
        "panel corner-brackets flex flex-col justify-between p-4 transition-all",
        isFail && "border-sev-high/60 bg-sev-high/5",
        isWarn && "border-sev-medium/60 bg-sev-medium/5",
        isPass && "border-border/70 bg-card/50",
      )}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] text-muted-foreground uppercase">{check.category}</span>
          <span
            className={cn(
              "rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase",
              isPass && "border-primary/50 bg-primary/10 text-primary",
              isWarn && "border-sev-medium/60 bg-sev-medium/15 text-sev-medium",
              isFail && "border-sev-high/60 bg-sev-high/15 text-sev-high",
            )}
          >
            {check.status}
          </span>
        </div>

        <h4 className="mt-1.5 font-display text-sm font-bold text-foreground">{check.title}</h4>
        <div className="mt-1 font-mono text-xs font-semibold text-foreground/90">{check.value}</div>
        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{check.description}</p>
      </div>

      {check.remediation && (
        <div className="mt-3 flex items-start gap-1.5 border-t border-border/60 pt-2.5 font-mono text-[11px] text-primary">
          <Lightbulb className="size-3.5 shrink-0 mt-0.5" />
          <span className="leading-snug">{check.remediation}</span>
        </div>
      )}
    </div>
  );
}

function RecommendationCard({
  title,
  priority,
  description,
  action,
}: {
  title: string;
  priority: string;
  description: string;
  action: string;
}) {
  return (
    <div className="rounded-md border border-border/80 bg-terminal p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-primary font-bold">
            {priority}
          </span>
          <ShieldCheck className="size-3.5 text-primary" />
        </div>
        <h4 className="mt-2 font-display text-sm font-bold text-foreground">{title}</h4>
        <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <div className="mt-3 rounded border border-border/60 bg-background/50 p-2 font-mono text-[11px] text-foreground/80">
        <span className="text-primary font-bold">Action: </span>
        {action}
      </div>
    </div>
  );
}
