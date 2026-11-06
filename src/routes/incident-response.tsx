
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Plus,
  Search,
  Trash2,
  ShieldAlert,
  Clock,
  CheckCircle2,
  Activity,
} from "lucide-react";

import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  type IncidentCategory,
  type IncidentSeverity,
  type IncidentStatus,
  summarizeIncidents,
} from "@/lib/incident-data";

import {
  useIncidents,
  createNewIncident,
  changeIncidentStatus,
  deleteIncident,
} from "@/lib/incident-store";

export const Route = createFileRoute("/incident-response")({
  head: () => ({ meta: [{ title: "Incident Response | VULNSHIELD" }] }),
  component: IncidentResponsePage,
});

const categories: IncidentCategory[] = [
  "Malware",
  "Phishing",
  "Unauthorized Access",
  "Data Breach",
  "Network Attack",
  "Suspicious Activity",
  "Other",
];

const severityColors: Record<IncidentSeverity, string> = {
  critical: "bg-sev-high/20 text-sev-high",
  high: "bg-sev-high/15 text-sev-high",
  medium: "bg-sev-medium/15 text-sev-medium",
  low: "bg-sev-low/15 text-sev-low",
};

const statusColors: Record<IncidentStatus, string> = {
  open: "bg-sev-high/15 text-sev-high",
  investigating: "bg-sev-medium/15 text-sev-medium",
  contained: "bg-primary/15 text-primary",
  resolved: "bg-sev-low/15 text-sev-low",
};

function IncidentResponsePage() {
  const incidents = useIncidents();

  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<IncidentCategory>("Suspicious Activity");
  const [severity, setSeverity] = useState<IncidentSeverity>("medium");
  const [asset, setAsset] = useState("");

  const summary = summarizeIncidents(incidents);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();

    return incidents.filter((incident) => {
      const matchesSearch =
        !query ||
        incident.title.toLowerCase().includes(query) ||
        incident.description.toLowerCase().includes(query) ||
        incident.affectedAsset.toLowerCase().includes(query);

      const matchesSeverity =
        severityFilter === "all" || incident.severity === severityFilter;

      const matchesStatus =
        statusFilter === "all" || incident.status === statusFilter;

      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [incidents, search, severityFilter, statusFilter]);

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim() || !description.trim() || !asset.trim()) return;

    createNewIncident({
      title: title.trim(),
      description: description.trim(),
      category,
      severity,
      affectedAsset: asset.trim(),
      status: "open",
    });

    setTitle("");
    setDescription("");
    setAsset("");
    setCategory("Suspicious Activity");
    setSeverity("medium");
    setShowForm(false);
  }

  const stats = [
    { label: "Total Incidents", value: summary.total, icon: Activity },
    { label: "Critical", value: summary.critical, icon: AlertTriangle },
    { label: "High", value: summary.high, icon: ShieldAlert },
    { label: "Open", value: summary.open, icon: Clock },
    { label: "Resolved", value: summary.resolved, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
   <PageHeader
  code="IR-01"
  title="Incident Response Center"
  description="Track, investigate and manage security incidents."
/>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Incidents are stored locally in this browser.
        </p>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          {showForm ? "Close Form" : "Create Incident"}
        </Button>
      </div>

      {showForm && (
        <Panel title="Create New Incident">
          <form onSubmit={handleCreate} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm">Incident Title</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Suspicious login attempt"
                className="w-full rounded-md border border-border bg-background p-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm">Affected Asset</label>
              <input
                required
                value={asset}
                onChange={(e) => setAsset(e.target.value)}
                placeholder="e.g. Web server"
                className="w-full rounded-md border border-border bg-background p-2 text-sm"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as IncidentCategory)}
                className="w-full rounded-md border border-border bg-background p-2 text-sm"
              >
                {categories.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as IncidentSeverity)}
                className="w-full rounded-md border border-border bg-background p-2 text-sm"
              >
                {(["critical", "high", "medium", "low"] as const).map((item) => (
                  <option key={item} value={item}>{item.toUpperCase()}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-sm">Description</label>
              <textarea
                required
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what happened..."
                className="w-full rounded-md border border-border bg-background p-2 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <Button type="submit">Save Incident</Button>
            </div>
          </form>
        </Panel>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((stat) => (
          <Panel key={stat.label} title={stat.label} className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="mt-2 font-mono text-2xl font-bold">{stat.value}</p>
          </Panel>
        ))}
      </div>

      <Panel title="Incident Management">
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search incidents..."
              className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm"
            />
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-md border border-border bg-background p-2 text-sm"
          >
            <option value="all">All Severities</option>
            {["critical", "high", "medium", "low"].map((item) => (
              <option key={item} value={item}>{item.toUpperCase()}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-border bg-background p-2 text-sm"
          >
            <option value="all">All Statuses</option>
            {["open", "investigating", "contained", "resolved"].map((item) => (
              <option key={item} value={item}>{item.toUpperCase()}</option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-8 text-center">
              <ShieldAlert className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="font-medium">No incidents found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Create an incident or change your filters.
              </p>
            </div>
          ) : (
            filtered.map((incident) => (
              <div
                key={incident.id}
                className="rounded-lg border border-border p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold">{incident.title}</h3>
                      <Badge className={severityColors[incident.severity]}>
                        {incident.severity.toUpperCase()}
                      </Badge>
                      <Badge className={statusColors[incident.status]}>
                        {incident.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {incident.description}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {incident.category} · Asset: {incident.affectedAsset}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Updated: {new Date(incident.updatedAt).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      aria-label={`Status for ${incident.title}`}
                      value={incident.status}
                      onChange={(e) =>
                        changeIncidentStatus(
                          incident.id,
                          e.target.value as IncidentStatus
                        )
                      }
                      className="rounded-md border border-border bg-background p-2 text-xs"
                    >
                      {["open", "investigating", "contained", "resolved"].map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>

                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Delete ${incident.title}`}
                      onClick={() => {
                        if (window.confirm("Delete this incident?")) {
                          deleteIncident(incident.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Panel>
    </div>
  );
}
