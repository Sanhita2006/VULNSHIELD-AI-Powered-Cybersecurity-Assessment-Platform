import { createFileRoute, Link } from "@tanstack/react-router";
import { Globe, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DemoBanner, PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/layout/Panel";
import { ScoreGauge } from "@/components/dashboard/ScoreGauge";
import { SeverityCards } from "@/components/dashboard/SeverityCards";
import { CategoryBreakdown, ScoreTrend } from "@/components/dashboard/PostureCharts";
import { LiveLog } from "@/components/dashboard/LiveLog";
import { StatusOverview } from "@/components/dashboard/StatusOverview";
import { EmptyScans } from "@/components/dashboard/EmptyScans";
import { useScans } from "@/hooks/use-scans";
import { countBySeverity, postureFor, SEVERITY_PENALTY } from "@/lib/scoring";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Security Dashboard — VULNSHIELD" },
      {
        name: "description",
        content: "Overall security score, vulnerability counts, posture trend and live risk activity.",
      },
      { property: "og:title", content: "Security Dashboard — VULNSHIELD" },
      {
        property: "og:description",
        content: "Overall security score, vulnerability counts, posture trend and live risk activity.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { scans, latest, isDemo } = useScans();

  const header = (
    <PageHeader
      code="SOC"
      title="Security Operations Dashboard"
      description="Posture of your most recent assessment, derived only from its findings."
      actions={
        <Button asChild variant="neon">
          <Link to="/website-audit">
            <Globe /> New scan
          </Link>
        </Button>
      }
    />
  );

  if (!latest) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyScans />
        <Panel title="Live risk activity" code="LOG">
          <LiveLog isDemo={false} />
        </Panel>
      </div>
    );
  }

  const counts = countBySeverity(latest.findings);
  const posture = postureFor(latest.score);

  return (
    <div className="space-y-6">
      {header}
      <DemoBanner />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,320px)_1fr]">
        <Panel title="Security score" code="01" className="scanline">
          <ScoreGauge score={latest.score} />
          <div className="mt-4 space-y-1.5 font-mono text-[11px] text-muted-foreground">
            <div className="flex items-center gap-2">
              <Target className="size-3.5 text-primary" />
              <span className="truncate text-foreground">{latest.target}</span>
            </div>
            <p>
              Scanned {latest.startedAt.slice(0, 16).replace("T", " ")} UTC · posture{" "}
              <span className="text-foreground">{posture}</span>
            </p>
            <p className="text-muted-foreground/70">
              Rule: 100 − {SEVERITY_PENALTY.high}×High − {SEVERITY_PENALTY.medium}×Med − {SEVERITY_PENALTY.low}×Low
            </p>
          </div>
        </Panel>

        <div className="flex flex-col gap-4">
          <SeverityCards counts={counts} />
          <Panel title="Posture trend" code="02" right={<Legend items={[["Score", "bg-primary"]]} />}>
            <ScoreTrend scans={scans} />
          </Panel>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Panel title="Live risk activity" code="03" className="xl:col-span-3" right={<LiveDot />}>
          <LiveLog isDemo={isDemo} events={latest.log ?? []} />
        </Panel>
        <Panel title="Findings by category" code="04" className="xl:col-span-2"
          right={<Legend items={[["High", "bg-sev-high"], ["Med", "bg-sev-medium"], ["Low", "bg-sev-low"]]} />}
        >
          <CategoryBreakdown findings={latest.findings} />
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Panel title="Security status overview" code="05" className="xl:col-span-3">
          <StatusOverview checks={latest.checks} />
        </Panel>
        <Panel title="Top findings" code="06" className="xl:col-span-2">
          <ul className="space-y-3">
            {latest.findings.slice(0, 5).map((f) => (
              <li key={f.id} className="rounded-md border border-border/70 bg-terminal/60 p-3">
                <div className="flex items-center gap-2">
                  <SevPill sev={f.severity} />
                  <span className="text-sm font-medium text-foreground">{f.title}</span>
                </div>
                <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">↳ {f.remediation}</p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function SevPill({ sev }: { sev: "high" | "medium" | "low" }) {
  const cls = {
    high: "border-sev-high/50 bg-sev-high/10 text-sev-high",
    medium: "border-sev-medium/50 bg-sev-medium/10 text-sev-medium",
    low: "border-sev-low/50 bg-sev-low/10 text-sev-low",
  }[sev];
  return (
    <span className={`rounded border px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase ${cls}`}>{sev}</span>
  );
}

function Legend({ items }: { items: [string, string][] }) {
  return (
    <div className="flex gap-3 font-mono text-[10px] text-muted-foreground">
      {items.map(([label, cls]) => (
        <span key={label} className="flex items-center gap-1">
          <span className={`size-2 rounded-sm ${cls}`} /> {label}
        </span>
      ))}
    </div>
  );
}

function LiveDot() {
  return (
    <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-primary">
      <span className="size-1.5 rounded-full bg-primary animate-pulse-glow" /> streaming
    </span>
  );
}
