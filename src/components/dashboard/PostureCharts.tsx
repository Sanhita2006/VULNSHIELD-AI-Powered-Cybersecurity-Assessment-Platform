import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Finding, ScanSummary } from "@/lib/types";

const axis = { stroke: "var(--muted-foreground)", fontSize: 11, fontFamily: "var(--font-mono)" };
const tooltipStyle = {
  background: "var(--popover)",
  border: "1px solid var(--border-glow)",
  borderRadius: 6,
  fontFamily: "var(--font-mono)",
  fontSize: 12,
  color: "var(--foreground)",
};

export function ScoreTrend({ scans }: { scans: ScanSummary[] }) {
  const data = scans.map((s) => ({
    date: new Date(s.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
    score: s.score,
  }));
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.45} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} {...axis} />
        <YAxis domain={[0, 100]} tickLine={false} axisLine={false} {...axis} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--primary)", strokeOpacity: 0.4 }} />
        <Area
          type="monotone"
          dataKey="score"
          stroke="var(--primary)"
          strokeWidth={2}
          fill="url(#scoreFill)"
          dot={{ r: 3, fill: "var(--primary)", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function CategoryBreakdown({ findings }: { findings: Finding[] }) {
  const cats = ["TLS", "Headers", "DNS", "Email", "Cookies", "Config"] as const;
  const data = cats.map((cat) => {
    const inCat = findings.filter((f) => f.category === cat);
    return {
      cat,
      high: inCat.filter((f) => f.severity === "high").length,
      medium: inCat.filter((f) => f.severity === "medium").length,
      low: inCat.filter((f) => f.severity === "low").length,
    };
  });
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 4" vertical={false} />
        <XAxis dataKey="cat" tickLine={false} axisLine={false} {...axis} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} {...axis} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--accent)", opacity: 0.4 }} />
        <Bar dataKey="high" stackId="a" fill="var(--sev-high)" />
        <Bar dataKey="medium" stackId="a" fill="var(--sev-medium)" />
        <Bar dataKey="low" stackId="a" fill="var(--sev-low)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
