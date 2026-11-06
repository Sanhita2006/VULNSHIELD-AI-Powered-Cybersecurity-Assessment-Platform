import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import {
  Activity,
  Clock,
  Eye,
  FileText,
  FlaskConical,
  Shield,
  TrendingUp,
  Users,
  Wifi,
  X,
} from "lucide-react";
import { PageHeader, DemoBanner } from "@/components/layout/PageHeader";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/button";
import { useDataMode } from "@/hooks/use-data-mode";
import {
  useVisits,
  useAnalyticsConsent,
  grantConsent,
  revokeConsent,
  recordVisit,
} from "@/lib/analytics-store";
import {
  computeAnalytics,
  getDemoVisits,
  type AnalyticsSummary,
} from "@/lib/analytics-data";
import { cn } from "@/lib/utils";

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Visitor Analytics — VULNSHIELD" },
      {
        name: "description",
        content: "Traffic statistics from data this app legitimately collects.",
      },
      { property: "og:title", content: "Visitor Analytics — VULNSHIELD" },
      {
        property: "og:description",
        content: "Traffic statistics from data this app legitimately collects.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AnalyticsPage,
});

// ── Chart style constants ─────────────────────────────────────────────────────

const axis = {
  stroke: "var(--muted-foreground)",
  fontSize: 11,
  fontFamily: "var(--font-mono)",
};
const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  color: "var(--foreground)",
};

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-md border p-4",
        highlight
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-muted/10",
      )}
    >
      <div
        className={cn(
          "mt-0.5 rounded-md border p-1.5",
          highlight ? "border-primary/40 bg-primary/10" : "border-border",
        )}
      >
        {icon}
      </div>
      <div>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            "font-display text-2xl font-bold tabular-nums",
            highlight ? "text-primary text-glow" : "text-foreground",
          )}
        >
          {value}
        </p>
        {sub && (
          <p className="font-mono text-[10px] text-muted-foreground/70">{sub}</p>
        )}
      </div>
    </div>
  );
}

// ── Consent banner ────────────────────────────────────────────────────────────

function ConsentBanner({ onGrant }: { onGrant: () => void }) {
  return (
    <div className="rounded-md border border-primary/40 bg-primary/5 px-4 py-3">
      <div className="flex flex-wrap items-start gap-3">
        <Shield className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="flex-1 space-y-1">
          <p className="font-mono text-xs font-semibold text-foreground">
            Enable Local Analytics?
          </p>
          <p className="font-mono text-[11px] text-muted-foreground">
            VULNSHIELD can record which pages you visit (path + timestamp only) in your
            browser&apos;s local storage. No data leaves your device. No IP addresses, no
            fingerprinting, no third-party services.
          </p>
        </div>
        <Button
          size="sm"
          variant="neon"
          onClick={onGrant}
          className="shrink-0 font-mono text-xs"
        >
          Enable Tracking
        </Button>
      </div>
    </div>
  );
}

// ── Live consent status strip ─────────────────────────────────────────────────

function ConsentStatus({ onRevoke }: { onRevoke: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/10 px-3 py-2 font-mono text-[11px] text-muted-foreground">
      <Shield className="size-3.5 text-primary" />
      <span>
        Local analytics <span className="text-primary font-semibold">enabled</span> — only page
        path &amp; timestamp stored in your browser.
      </span>
      <button
        onClick={onRevoke}
        className="ml-auto flex items-center gap-1 text-muted-foreground/60 hover:text-sev-high"
        title="Revoke consent and delete stored data"
      >
        <X className="size-3" />
        Revoke &amp; clear
      </button>
    </div>
  );
}

// ── Date range selector ───────────────────────────────────────────────────────

type Range = 7 | 14 | 30;
const RANGES: { label: string; value: Range }[] = [
  { label: "7 days", value: 7 },
  { label: "14 days", value: 14 },
  { label: "30 days", value: 30 },
];

// ── Activity timeline row ─────────────────────────────────────────────────────

function ActivityRow({ path, at }: { path: string; at: string }) {
  const time = new Date(at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const date = new Date(at).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
  return (
    <div className="flex items-center gap-3 border-b border-border/30 py-1.5 last:border-0">
      <div className="size-1.5 shrink-0 rounded-full bg-primary" />
      <span className="flex-1 font-mono text-[11px] text-foreground">{path}</span>
      <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
        {date} {time}
      </span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

function AnalyticsPage() {
  const { isDemo } = useDataMode();
  const consent = useAnalyticsConsent();
  const liveVisits = useVisits();
  const [range, setRange] = useState<Range>(7);

  // Record a visit to /analytics itself (live mode + consent only)
  useEffect(() => {
    if (!isDemo && consent) {
      recordVisit("/analytics");
    }
  }, [isDemo, consent]);

  // Choose data source: demo → synthetic set, live → real visits from store
  const visits = useMemo(
    () => (isDemo ? getDemoVisits() : liveVisits),
    [isDemo, liveVisits],
  );

  const summary: AnalyticsSummary = useMemo(
    () => computeAnalytics(visits, range),
    [visits, range],
  );

  const showConsent = !isDemo && !consent;

  return (
    <div className="space-y-6">
      <PageHeader
        code="ANA"
        title="Visitor Analytics"
        description="Privacy-respecting page-view statistics stored locally in your browser. No data leaves your device."
        actions={
          !isDemo && consent ? (
            <span className="flex items-center gap-1.5 rounded-md border border-primary/40 bg-primary/5 px-2.5 py-1 font-mono text-[10px] text-primary">
              <Wifi className="size-3" />
              Live Tracking Active
            </span>
          ) : undefined
        }
      />

      <DemoBanner />

      {/* Demo notice */}
      {isDemo && (
        <div className="flex items-center gap-2 rounded-md border border-demo/40 bg-demo/5 px-4 py-2.5 font-mono text-[11px] text-muted-foreground">
          <FlaskConical className="size-4 shrink-0 text-demo" />
          <span>
            <span className="font-semibold text-demo">Simulated analytics data</span> — figures
            below are sample values, not real visitor counts. Switch to Live mode and grant
            consent to track actual page views.
          </span>
        </div>
      )}

      {/* Consent banner (live mode, not yet consented) */}
      {showConsent && <ConsentBanner onGrant={grantConsent} />}

      {/* Consent status strip (live mode, consented) */}
      {!isDemo && consent && <ConsentStatus onRevoke={revokeConsent} />}

      {/* Date range filter */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Range:
        </span>
        {RANGES.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => setRange(value)}
            className={cn(
              "rounded border px-2.5 py-1 font-mono text-[11px] transition-colors",
              range === value
                ? "border-primary/50 bg-primary/10 text-primary"
                : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Eye className="size-4 text-primary" />}
          label="Total Page Views"
          value={summary.totalViews.toLocaleString()}
          sub={`last ${range} days`}
          highlight
        />
        <StatCard
          icon={<Users className="size-4 text-muted-foreground" />}
          label="Est. Sessions"
          value={summary.estimatedSessions.toLocaleString()}
          sub="30-min gap = new session"
        />
        <StatCard
          icon={<FileText className="size-4 text-muted-foreground" />}
          label="Unique Pages"
          value={summary.uniquePages}
          sub="distinct paths visited"
        />
        <StatCard
          icon={<Activity className="size-4 text-muted-foreground" />}
          label="Active (5 min)"
          value={summary.activeLast5Min}
          sub={isDemo ? "simulated" : "real visits"}
        />
      </div>

      {/* Daily traffic chart + Top pages */}
      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,340px)]">
        <Panel
          title="Daily Traffic"
          code="01"
          demo={isDemo}
          right={
            <span className="font-mono text-[10px] text-muted-foreground">
              views · unique pages
            </span>
          }
        >
          {summary.daily.some((d) => d.views > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={summary.daily}
                margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="uniqueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--sev-low)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--sev-low)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="3 4"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  {...axis}
                  interval="preserveStartEnd"
                />
                <YAxis tickLine={false} axisLine={false} {...axis} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="views"
                  name="Page Views"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#viewsFill)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Area
                  type="monotone"
                  dataKey="unique"
                  name="Unique Pages"
                  stroke="var(--sev-low)"
                  strokeWidth={1.5}
                  fill="url(#uniqueFill)"
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-center">
              <TrendingUp className="size-8 text-muted-foreground/40" />
              <p className="font-mono text-xs text-muted-foreground">
                {isDemo
                  ? "No demo data for this range."
                  : consent
                    ? "No visits recorded yet. Browse around to generate data."
                    : "Enable analytics tracking above to see live data."}
              </p>
            </div>
          )}
        </Panel>

        {/* Top pages */}
        <Panel title="Top Pages" code="02" demo={isDemo} bodyClassName="p-0">
          {summary.topPages.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <FileText className="size-8 text-muted-foreground/40" />
              <p className="font-mono text-xs text-muted-foreground">No page data yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {summary.topPages.map((p) => (
                <div key={p.path} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="flex-1 truncate font-mono text-[11px] text-foreground">
                    {p.path}
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted/50">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${Math.round(p.share * 100)}%` }}
                      />
                    </div>
                    <span className="w-10 text-right font-mono text-[10px] text-muted-foreground">
                      {p.views}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Page views bar chart + Activity timeline */}
      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,360px)]">
        <Panel title="Page Views by Path" code="03" demo={isDemo}>
          {summary.topPages.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center">
              <p className="font-mono text-xs text-muted-foreground">No data yet.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={summary.topPages}
                margin={{ top: 8, right: 8, left: -20, bottom: 40 }}
              >
                <CartesianGrid
                  stroke="var(--border)"
                  strokeDasharray="3 4"
                  vertical={false}
                />
                <XAxis
                  dataKey="path"
                  tickLine={false}
                  axisLine={false}
                  {...axis}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tickLine={false} axisLine={false} {...axis} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="views" name="Views" radius={[3, 3, 0, 0]}>
                  {summary.topPages.map((_, i) => (
                    <Cell
                      key={i}
                      fill={
                        i === 0
                          ? "var(--primary)"
                          : i === 1
                            ? "var(--sev-low)"
                            : "var(--muted-foreground)"
                      }
                      fillOpacity={i === 0 ? 1 : 0.6}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Panel>

        {/* Activity timeline */}
        <Panel
          title="Recent Activity"
          code="04"
          demo={isDemo}
          bodyClassName="p-0"
          right={
            <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground">
              <Clock className="size-3" />
              last 20 events
            </span>
          }
        >
          {summary.recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Activity className="size-8 text-muted-foreground/40" />
              <p className="font-mono text-xs text-muted-foreground">
                {consent || isDemo
                  ? "No activity recorded yet."
                  : "Enable analytics to see activity."}
              </p>
            </div>
          ) : (
            <div className="px-4 py-2">
              {summary.recentActivity.map((ev, i) => (
                <ActivityRow key={i} path={ev.path} at={ev.at} />
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Privacy note */}
      <Panel title="Privacy Notice" code="05" interactive={false}>
        <div className="grid gap-3 sm:grid-cols-2 font-mono text-[11px] text-muted-foreground">
          <div className="space-y-1">
            <p className="font-semibold text-foreground">What is tracked</p>
            <ul className="list-inside list-disc space-y-0.5">
              <li>Page path (e.g. /website-audit)</li>
              <li>Timestamp of visit</li>
            </ul>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-foreground">What is NOT tracked</p>
            <ul className="list-inside list-disc space-y-0.5">
              <li>IP address</li>
              <li>Browser fingerprint</li>
              <li>Personal information</li>
              <li>External services or cookies</li>
            </ul>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-foreground">Storage</p>
            <p>Browser localStorage only. Data never leaves your device.</p>
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-foreground">Consent</p>
            <p>
              Tracking is opt-in. Click &quot;Revoke &amp; clear&quot; above to delete all data.
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
