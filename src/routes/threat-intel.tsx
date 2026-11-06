import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";
import {
  checkIPReputation,
  checkDomainReputation,
  type ThreatDetail,
} from "@/lib/threat-intel";

export const Route = createFileRoute("/threat-intel")({
  head: () => ({
    meta: [
      { title: "Threat Intelligence — VULNSHIELD" },
      { name: "description", content: "Live IP & domain reputation lookup using free threat‑intel sources." },
      { property: "og:title", content: "Threat Intelligence — VULNSHIELD" },
      { property: "og:description", content: "Live IP & domain reputation lookup using free threat‑intel sources." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ThreatIntelPage,
});

function ThreatIntelPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ThreatDetail[]>([]);
  const [filter, setFilter] = useState<"all" | "malicious" | "suspicious" | "clean">("all");

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const isIP = /^\d{1,3}(?:\.\d{1,3}){3}$/.test(query.trim());
      const detail = isIP
        ? await checkIPReputation(query.trim())
        : await checkDomainReputation(query.trim());
      setResults((prev) => [detail, ...prev]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = results.filter((r) => filter === "all" || r.reputation === filter);

  const getBadge = (rep: ThreatDetail["reputation"]) => {
    const map = {
      malicious: { color: "bg-sev-high/20 border-sev-high text-sev-high", label: "Malicious" },
      suspicious: { color: "bg-sev-medium/20 border-sev-medium text-sev-medium", label: "Suspicious" },
      clean: { color: "bg-sev-low/20 border-sev-low text-sev-low", label: "Clean" },
    } as const;
    return (
      <Badge variant="outline" className={cn("rounded-md px-2 py-0.5 text-xs font-medium", map[rep].color)}>
        {map[rep].label}
      </Badge>
    );
  };

  const getRecommendation = (rep: ThreatDetail["reputation"]) => {
    switch (rep) {
      case "malicious":
        return "Block the address/domain and investigate the source of traffic.";
      case "suspicious":
        return "Monitor closely and consider additional verification before trusting.";
      default:
        return "No immediate action needed – continue normal monitoring.";
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        code="TIN"
        title="Threat Intelligence"
        description="Live IP & domain reputation lookup using free threat‑intel sources."
        actions={
          <Button variant="neon" onClick={handleSearch} disabled={loading} className="flex items-center gap-2">
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            {loading ? "Scanning…" : "Run Scan"}
          </Button>
        }
      />

      <Panel title="Lookup" code="01" className="scanline">
        <div className="flex gap-2 max-w-md">
          <Input
            placeholder="Enter IP address or domain"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={loading}>Search</Button>
        </div>
      </Panel>

      <Panel title="Filters" code="02" className="scanline">
        <div className="flex gap-2 mb-4">
          {(["all", "malicious", "suspicious", "clean"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "neon" : "secondary"}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>
      </Panel>

      <Panel title="Results" code="03" className="scanline">
        {filtered.length === 0 ? (
          <p className="text-muted-foreground">No results yet.</p>
        ) : (
          <div className="space-y-4">
            {filtered.map((r, idx) => (
              <div key={idx} className="border border-border rounded p-4 bg-card">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground">
                    {r.source === "Demo" ? "Demo Data" : "Live Data"}
                  </h3>
                  {getBadge(r.reputation)}
                </div>
                <p className="text-sm text-muted-foreground mb-1">{r.description}</p>
                <p className="text-xs text-muted-foreground">Confidence: {r.confidence}%</p>
                <p className="text-xs text-muted-foreground">Last updated: {new Date(r.lastUpdated).toLocaleString()}</p>
                <p className="mt-2 text-sm">Recommendation: {getRecommendation(r.reputation)}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
