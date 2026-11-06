// Browser-side history of REAL scans (kept in localStorage until the
// database is connected in Step 8). Demo data is never written here.

import { useSyncExternalStore } from "react";
import type { ScanSummary } from "./types";

const KEY = "vulnshield:scans:v1";
const MAX = 25;
const EMPTY: ScanSummary[] = [];
const listeners = new Set<() => void>();
let cache: ScanSummary[] | null = null;

function read(): ScanSummary[] {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as ScanSummary[];
    cache = Array.isArray(parsed) ? parsed.filter((s) => s.real) : [];
  } catch {
    cache = [];
  }
  return cache;
}

export function saveScan(scan: ScanSummary) {
  const next = [...read(), { ...scan, real: true }].slice(-MAX);
  cache = next;
  window.localStorage.setItem(KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

export function clearScans() {
  cache = [];
  window.localStorage.removeItem(KEY);
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Real scans, oldest first. Empty during server render. */
export function useRealScans(): ScanSummary[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
