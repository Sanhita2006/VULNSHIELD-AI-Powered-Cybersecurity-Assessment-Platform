import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Filter,
  Globe,
  Info,
  Lightbulb,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Target,
} from "lucide-react";
import { DemoBanner, PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyScans } from "@/components/dashboard/EmptyScans";
import { useScans } from "@/hooks/use-scans";
import { evaluateOwaspPosture, type OwaspCategoryStatus, type OwaspRisk } from "@/lib/owasp-data";
import type { Finding, Severity } from "@/lib/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/owasp")({
  head: () => ({
    meta: [
      { title: "OWASP Top 10 Assessment — VULNSHIELD" },
      {
        name: "description",
        content: "Detailed correlation of website security audit findings to the OWASP Top 10:2021 framework.",
      },
      { property: "og:title", content: "OWASP Top 10 Assessment — VULNSHIELD" },
      {
        property: "og:description",
        content: "Detailed correlation of website security audit findings to the OWASP Top 10:2021 framework.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OwaspPage,
});

type FilterSeverity = "all" | "affected" | "high" | "medium" | "low" | "clean";

const RISK_BADGE: Record<OwaspRisk, string> = {
  Critical: "border-sev-critical/60 bg-sev-critical/10 text-sev-critical",
  High: "border-sev-high/60 bg-sev-high/10 text-sev-high",
  Medium: "border-sev-medium/60 bg-sev-medium/10 text-sev-medium",
};

const SEV_CLS: Record<Severity, string> = {
  high: "border-sev-high/60 bg-sev-high/10 text-sev-high",
  medium: "border-sev-medium/60 bg-sev-medium/10 text-sev-medium",
  low: "border-sev-low/60 bg-sev-low/10 text-sev-low",
};

function OwaspPage() {
  const { scans, latest, isDemo } = useScans();

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterSeverity>("all");
  const [expandedCodes, setExpandedCodes] = useState<Record<string, boolean>>({});

  const header = (
    <PageHeader
      code="OWA"
      title="OWASP Top 10 Assessment"
      description="Mapping observed website audit findings to the official OWASP Top 10:2021 web application security standard."
      actions={
        <Button asChild variant="neon">
          <Link to="/website-audit">
            <Globe /> New scan
          </Link>
        </Button>
      }
    />
  );

  // If live mode has no scans, show the data honesty empty state
  if (!latest) {
    return (
      <div className="space-y-6">
        {header}
        <EmptyScans />
      </div>
    );
  }

  const findings = latest.findings;
  const posture = useMemo(() => evaluateOwaspPosture(findings), [findings]);

  // Summary statistics
  const affectedCategories = posture.filter((c) => c.status === "affected").length;
  const totalFindingsCount = findings.length;
  const highCount = findings.filter((f) => f.severity === "high").length;
  const medCount = findings.filter((f) => f.severity === "medium").length;
  const lowCount = findings.filter((f) => f.severity === "low").length;

  // Filtered categories
  const filteredPosture = useMemo(() => {
    return posture.filter((item) => {
      // 1. Severity/status filter
      if (activeFilter === "affected" && item.status !== "affected") return false;
      if (activeFilter === "clean" && item.status !== "clean") return false;
      if (activeFilter === "high" && item.counts.high === 0) return false;
      if (activeFilter === "medium" && item.counts.medium === 0) return false;
      if (activeFilter === "low" && item.counts.low === 0) return false;

      // 2. Search query filter
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const matchCat =
        item.category.code.toLowerCase().includes(q) ||
        item.category.id.toLowerCase().includes(q) ||
        item.category.title.toLowerCase().includes(q) ||
        item.category.summary.toLowerCase().includes(q) ||
        item.category.beginnerExplanation.toLowerCase().includes(q);

      const matchFindings = item.findings.some(
        (f) =>
          f.title.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          f.remediation.toLowerCase().includes(q),
      );

      return matchCat || matchFindings;
    });
  }, [posture, activeFilter, search]);

  const toggleExpand = (code: string) => {
    setExpandedCodes((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const expandAll = () => {
    const next: Record<string, boolean> = {};
    for (const p of posture) next[p.category.code] = true;
    setExpandedCodes(next);
  };

  const collapseAll = () => {
    setExpandedCodes({});
  };

  return (
    <div className="space-y-6">
      {header}
      <DemoBanner />

      {/* Target & Metric Summary Bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Panel title="Audit Target" code="TGT" interactive={false}>
          <div className="flex items-center gap-2 font-mono text-sm text-foreground">
            <Target className="size-4 shrink-0 text-primary" />
            <span className="truncate font-semibold">{latest.target}</span>
          </div>
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">
            Scanned {latest.startedAt.slice(0, 16).replace("T", " ")} UTC
          </p>
          <div className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-primary">
            <ShieldCheck className="size-3.5" />
            {isDemo ? "Simulated Baseline" : "Live Scan Verified"}
          </div>
        </Panel>

        <Panel title="OWASP Posture" code="COV" interactive={false}>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-foreground">
              {affectedCategories > 0 ? `${affectedCategories} / 10` : "Clean (0/10)"}
            </span>
            <span className="font-mono text-xs text-muted-foreground">categories flagged</span>
          </div>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className={cn(
                "h-full transition-all",
                affectedCategories > 3 ? "bg-sev-high" : affectedCategories > 0 ? "bg-sev-medium" : "bg-primary",
              )}
              style={{ width: `${(affectedCategories / 10) * 100}%` }}
            />
          </div>
          <p className="mt-2 font-mono text-[11px] text-muted-foreground">
            {10 - affectedCategories} categories passed passive checks
          </p>
        </Panel>

        <Panel title="Weakness Tally" code="FLG" interactive={false}>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-2xl font-bold text-foreground">{totalFindingsCount}</span>
            <span className="font-mono text-xs text-muted-foreground">total findings mapped</span>
          </div>
          <div className="mt-2 flex items-center gap-2 font-mono text-[11px]">
            <span className="flex items-center gap-1 text-sev-high">
              <span className="size-1.5 rounded-full bg-sev-high" /> {highCount} High
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1 text-sev-medium">
              <span className="size-1.5 rounded-full bg-sev-medium" /> {medCount} Med
            </span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1 text-sev-low">
              <span className="size-1.5 rounded-full bg-sev-low" /> {lowCount} Low
            </span>
          </div>
          <p className="mt-1.5 font-mono text-[11px] text-muted-foreground">Across all assessed layers</p>
        </Panel>

        <Panel title="Standard Framework" code="STD" interactive={false}>
          <div className="flex items-center gap-2">
            <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-bold text-primary">
              OWASP Top 10
            </span>
            <span className="font-mono text-xs text-muted-foreground">2021 Release</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            The standard security awareness document for web developers and security professionals.
          </p>
          <a
            href="https://owasp.org/Top10/"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 font-mono text-[11px] text-primary hover:underline"
          >
            Official Standard Docs <ExternalLink className="size-3" />
          </a>
        </Panel>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col gap-3 rounded-md border border-border bg-terminal/70 p-3.5 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search categories or vulnerabilities..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 border-border bg-background/80 pl-9 font-mono text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Filter className="mr-1 size-3.5 text-muted-foreground" />
          <FilterPill
            label="All (10)"
            active={activeFilter === "all"}
            onClick={() => setActiveFilter("all")}
          />
          <FilterPill
            label={`Affected (${affectedCategories})`}
            active={activeFilter === "affected"}
            onClick={() => setActiveFilter("affected")}
            highlight={affectedCategories > 0}
          />
          <FilterPill
            label={`High (${highCount})`}
            active={activeFilter === "high"}
            onClick={() => setActiveFilter("high")}
          />
          <FilterPill
            label={`Medium (${medCount})`}
            active={activeFilter === "medium"}
            onClick={() => setActiveFilter("medium")}
          />
          <FilterPill
            label={`Clean (${10 - affectedCategories})`}
            active={activeFilter === "clean"}
            onClick={() => setActiveFilter("clean")}
          />

          <div className="ml-auto flex items-center gap-2 pl-2">
            <button
              onClick={expandAll}
              className="font-mono text-[11px] text-muted-foreground hover:text-primary transition-colors"
            >
              Expand all
            </button>
            <span className="text-border">|</span>
            <button
              onClick={collapseAll}
              className="font-mono text-[11px] text-muted-foreground hover:text-primary transition-colors"
            >
              Collapse all
            </button>
          </div>
        </div>
      </div>

      {/* Category List */}
      <div className="space-y-4">
        {filteredPosture.length === 0 ? (
          <div className="panel corner-brackets p-8 text-center">
            <ShieldCheck className="mx-auto size-10 text-primary" />
            <h3 className="mt-3 text-base font-semibold text-foreground">No matching categories found</h3>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              Try adjusting your search query or severity filters.
            </p>
            <Button variant="terminal" className="mt-4" onClick={() => { setSearch(""); setActiveFilter("all"); }}>
              Reset Filters
            </Button>
          </div>
        ) : (
          filteredPosture.map((item) => {
            const isExpanded = expandedCodes[item.category.code] ?? item.status === "affected";
            return (
              <OwaspCategoryCard
                key={item.category.code}
                item={item}
                isExpanded={isExpanded}
                onToggle={() => toggleExpand(item.category.code)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
  highlight,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md border px-2.5 py-1 font-mono text-[11px] font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-[var(--shadow-glow)]"
          : "border-border bg-background text-muted-foreground hover:border-border-glow hover:text-foreground",
        !active && highlight && "border-sev-medium/40 text-sev-medium",
      )}
    >
      {label}
    </button>
  );
}

function OwaspCategoryCard({
  item,
  isExpanded,
  onToggle,
}: {
  item: OwaspCategoryStatus;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { category, findings, counts, status } = item;
  const isAffected = status === "affected";

  return (
    <div
      className={cn(
        "panel corner-brackets transition-all",
        isAffected
          ? "border-border/90 bg-card/70 hover:border-primary/50"
          : "border-border/50 bg-card/40 opacity-90",
      )}
    >
      {/* Clickable Header Bar */}
      <div
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className="flex cursor-pointer flex-wrap items-center justify-between gap-3 p-4 sm:p-5"
      >
        <div className="flex flex-1 items-start gap-3 sm:items-center">
          <span
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-md font-mono text-xs font-bold",
              isAffected
                ? "border border-primary/60 bg-primary/10 text-primary glow"
                : "border border-border bg-muted/40 text-muted-foreground",
            )}
          >
            {category.code}
          </span>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display text-base font-bold text-foreground">
                {category.title}
              </h2>
              <span className="font-mono text-[10px] text-muted-foreground">
                Rank #{category.rank}
              </span>
              <span
                className={cn(
                  "rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase",
                  RISK_BADGE[category.riskLevel],
                )}
              >
                {category.riskLevel} Risk
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {category.summary}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Finding Badges */}
          {isAffected ? (
            <div className="flex items-center gap-1.5">
              {counts.high > 0 && (
                <span className="rounded border border-sev-high/60 bg-sev-high/15 px-2 py-0.5 font-mono text-[10px] font-bold text-sev-high">
                  {counts.high} High
                </span>
              )}
              {counts.medium > 0 && (
                <span className="rounded border border-sev-medium/60 bg-sev-medium/15 px-2 py-0.5 font-mono text-[10px] font-bold text-sev-medium">
                  {counts.medium} Med
                </span>
              )}
              {counts.low > 0 && (
                <span className="rounded border border-sev-low/60 bg-sev-low/15 px-2 py-0.5 font-mono text-[10px] font-bold text-sev-low">
                  {counts.low} Low
                </span>
              )}
            </div>
          ) : (
            <span className="flex items-center gap-1 font-mono text-[11px] text-primary">
              <CheckCircle2 className="size-3.5" />
              Clean
            </span>
          )}

          <div className="text-muted-foreground hover:text-foreground">
            {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
          </div>
        </div>
      </div>

      {/* Expanded Accordion Body */}
      {isExpanded && (
        <div className="border-t border-border/70 p-4 sm:p-5 space-y-4">
          {/* Plain English Beginner Explanation */}
          <div className="rounded-md border border-primary/20 bg-primary/5 p-3.5">
            <div className="flex items-center gap-2 font-display text-xs font-semibold uppercase tracking-wider text-primary">
              <Info className="size-3.5" />
              Beginner-Friendly Explanation
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-foreground/90">
              {category.beginnerExplanation}
            </p>
          </div>

          {/* Observed Scan Findings */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Observed Findings from Scan ({findings.length})
              </h3>
              {findings.length > 0 && (
                <span className="font-mono text-[10px] text-muted-foreground">
                  Directly correlated from passive audit probes
                </span>
              )}
            </div>

            {findings.length === 0 ? (
              <div className="flex items-center gap-2 rounded-md border border-dashed border-border bg-terminal/40 p-3 font-mono text-xs text-muted-foreground">
                <CheckCircle2 className="size-4 text-primary shrink-0" />
                <span>No weaknesses identified for this category by the passive audit checks that ran.</span>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {findings.map((f) => (
                  <OwaspFindingItem key={f.id} finding={f} />
                ))}
              </ul>
            )}
          </div>

          {/* Assessment Scope & Technical Prevention Details */}
          <div className="grid gap-3 pt-2 md:grid-cols-2">
            <div className="rounded-md border border-border/70 bg-terminal/60 p-3.5">
              <div className="flex items-center gap-1.5 font-display text-xs font-semibold uppercase tracking-wider text-foreground">
                <Shield className="size-3.5 text-primary" />
                Passive Audit Scope
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {category.passiveAssessmentScope}
              </p>
            </div>

            <div className="rounded-md border border-border/70 bg-terminal/60 p-3.5">
              <div className="flex items-center gap-1.5 font-display text-xs font-semibold uppercase tracking-wider text-foreground">
                <Lightbulb className="size-3.5 text-primary" />
                Remediation Checklist
              </div>
              <ul className="mt-1.5 space-y-1">
                {category.prevention.map((tip, i) => (
                  <li key={i} className="flex gap-2 text-xs text-muted-foreground">
                    <span className="text-primary font-bold">✓</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Common CWEs */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 font-mono text-[10px] text-muted-foreground">
            <span className="text-primary">Related CWEs:</span>
            {category.cwes.map((cwe) => (
              <span
                key={cwe}
                className="rounded border border-border/70 bg-terminal px-1.5 py-0.5 text-muted-foreground"
              >
                {cwe}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OwaspFindingItem({ finding }: { finding: Finding }) {
  return (
    <li className="rounded-md border border-border/80 bg-terminal p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase",
            SEV_CLS[finding.severity],
          )}
        >
          {finding.severity}
        </span>
        <span className="font-semibold text-sm text-foreground">{finding.title}</span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground">
          Category: <span className="text-foreground/80">{finding.category}</span>
        </span>
      </div>

      <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">
        {finding.description}
      </p>

      {finding.evidence && (
        <div className="mt-1.5 rounded bg-background/60 p-1.5 font-mono text-[11px] text-muted-foreground break-all">
          <span className="text-primary">evidence:</span> {finding.evidence}
        </div>
      )}

      <div className="mt-2.5 flex items-start gap-2 rounded bg-primary/5 p-2 font-mono text-[11px] text-primary">
        <Lightbulb className="size-3.5 shrink-0 mt-0.5" />
        <span className="leading-relaxed">
          <strong className="uppercase">Remediation:</strong> {finding.remediation}
        </span>
      </div>
    </li>
  );
}
