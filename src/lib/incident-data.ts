export type IncidentSeverity = "critical" | "high" | "medium" | "low";

export type IncidentStatus =
  | "open"
  | "investigating"
  | "contained"
  | "resolved";

export type IncidentCategory =
  | "Malware"
  | "Phishing"
  | "Unauthorized Access"
  | "Data Breach"
  | "Network Attack"
  | "Suspicious Activity"
  | "Other";

export interface IncidentActivity {
  id: string;
  type: "created" | "status_changed" | "note_added";
  message: string;
  timestamp: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  affectedAsset: string;
  status: IncidentStatus;
  createdAt: string;
  updatedAt: string;
  notes: string[];
  timeline: IncidentActivity[];
}

export type NewIncident = Omit<
  Incident,
  "id" | "createdAt" | "updatedAt" | "notes" | "timeline"
>;

export function createIncident(input: NewIncident): Incident {
  const now = new Date().toISOString();

  return {
    ...input,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    notes: [],
    timeline: [
      {
        id: crypto.randomUUID(),
        type: "created",
        message: "Incident created",
        timestamp: now,
      },
    ],
  };
}

export function updateIncidentStatus(
  incident: Incident,
  status: IncidentStatus,
): Incident {
  if (incident.status === status) return incident;

  const now = new Date().toISOString();

  return {
    ...incident,
    status,
    updatedAt: now,
    timeline: [
      ...incident.timeline,
      {
        id: crypto.randomUUID(),
        type: "status_changed",
        message: `Status changed from ${incident.status} to ${status}`,
        timestamp: now,
      },
    ],
  };
}

export function addIncidentNote(
  incident: Incident,
  note: string,
): Incident {
  const cleanNote = note.trim();

  if (!cleanNote) return incident;

  const now = new Date().toISOString();

  return {
    ...incident,
    updatedAt: now,
    notes: [...incident.notes, cleanNote],
    timeline: [
      ...incident.timeline,
      {
        id: crypto.randomUUID(),
        type: "note_added",
        message: cleanNote,
        timestamp: now,
      },
    ],
  };
}

export function filterIncidents(
  incidents: Incident[],
  filters: {
    severity?: IncidentSeverity | "all";
    status?: IncidentStatus | "all";
    category?: IncidentCategory | "all";
    search?: string;
  },
): Incident[] {
  const query = filters.search?.trim().toLowerCase() ?? "";

  return incidents.filter((incident) => {
    const matchesSeverity =
      !filters.severity ||
      filters.severity === "all" ||
      incident.severity === filters.severity;

    const matchesStatus =
      !filters.status ||
      filters.status === "all" ||
      incident.status === filters.status;

    const matchesCategory =
      !filters.category ||
      filters.category === "all" ||
      incident.category === filters.category;

    const matchesSearch =
      !query ||
      incident.title.toLowerCase().includes(query) ||
      incident.description.toLowerCase().includes(query) ||
      incident.affectedAsset.toLowerCase().includes(query);

    return (
      matchesSeverity &&
      matchesStatus &&
      matchesCategory &&
      matchesSearch
    );
  });
}

export function summarizeIncidents(incidents: Incident[]) {
  return {
    total: incidents.length,
    critical: incidents.filter((i) => i.severity === "critical").length,
    high: incidents.filter((i) => i.severity === "high").length,
    medium: incidents.filter((i) => i.severity === "medium").length,
    low: incidents.filter((i) => i.severity === "low").length,
    open: incidents.filter((i) => i.status === "open").length,
    investigating: incidents.filter((i) => i.status === "investigating").length,
    contained: incidents.filter((i) => i.status === "contained").length,
    resolved: incidents.filter((i) => i.status === "resolved").length,
  };
}