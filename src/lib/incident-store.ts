
import { useSyncExternalStore } from "react";
import {
  type Incident,
  type NewIncident,
  type IncidentStatus,
  createIncident,
  updateIncidentStatus,
  addIncidentNote,
} from "./incident-data";

const STORAGE_KEY = "vulnshield-incidents";

let cachedIncidents: Incident[] | null = null;
const listeners = new Set<() => void>();

function readIncidents(): Incident[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Incident[]) : [];
  } catch {
    return [];
  }
}

function getSnapshot(): Incident[] {
  if (typeof window === "undefined") return [];
  if (cachedIncidents === null) {
    cachedIncidents = readIncidents();
  }
  return cachedIncidents;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function saveIncidents(incidents: Incident[]) {
  cachedIncidents = incidents;

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(incidents));
    } catch (error) {
      console.error("Could not save incidents:", error);
    }
  }

  listeners.forEach((listener) => listener());
}

export function useIncidents() {
  return useSyncExternalStore(subscribe, getSnapshot, () => []);
}

export function createNewIncident(input: NewIncident) {
  const incident = createIncident(input);
  saveIncidents([...getSnapshot(), incident]);
  return incident;
}

export function changeIncidentStatus(id: string, status: IncidentStatus) {
  const updated = getSnapshot().map((incident) =>
    incident.id === id ? updateIncidentStatus(incident, status) : incident
  );
  saveIncidents(updated);
}

export function addNoteToIncident(id: string, note: string) {
  const updated = getSnapshot().map((incident) =>
    incident.id === id ? addIncidentNote(incident, note) : incident
  );
  saveIncidents(updated);
}

export function deleteIncident(id: string) {
  saveIncidents(getSnapshot().filter((incident) => incident.id !== id));
}

export function clearAllIncidents() {
  saveIncidents([]);
}
