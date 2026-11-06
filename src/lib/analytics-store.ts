/**
 * VULNSHIELD — Privacy-Respecting Analytics Store
 *
 * What is stored (localStorage only, never sent anywhere):
 *   - page path (e.g. "/website-audit")
 *   - ISO timestamp of the visit
 *
 * What is NOT stored:
 *   - IP addresses
 *   - User-agent strings
 *   - Device fingerprints
 *   - Any personal information
 *
 * Tracking is entirely opt-in. The consent flag is checked before every write.
 * Clearing consent removes all stored data.
 */

import { useSyncExternalStore } from "react";

const CONSENT_KEY = "vulnshield:analytics:consent:v1";
const DATA_KEY = "vulnshield:analytics:visits:v1";
const MAX_VISITS = 2000; // cap to avoid unbounded growth

export interface PageVisit {
  /** Normalised page path, e.g. "/website-audit" */
  path: string;
  /** ISO 8601 timestamp */
  at: string;
}

// ── Consent ──────────────────────────────────────────────────────────────────

export function getConsent(): boolean {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === "true";
  } catch {
    return false;
  }
}

export function grantConsent(): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, "true");
    notifyListeners();
  } catch {
    /* storage blocked */
  }
}

export function revokeConsent(): void {
  try {
    window.localStorage.removeItem(CONSENT_KEY);
    window.localStorage.removeItem(DATA_KEY);
    notifyListeners();
  } catch {
    /* storage blocked */
  }
}

// ── Visit store ───────────────────────────────────────────────────────────────

const listeners = new Set<() => void>();
let cache: PageVisit[] | null = null;

function notifyListeners() {
  cache = null; // invalidate
  listeners.forEach((l) => l());
}

function readVisits(): PageVisit[] {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(DATA_KEY) ?? "[]";
    const parsed = JSON.parse(raw) as PageVisit[];
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache;
}

/** Record a page view. No-op when consent has not been granted. */
export function recordVisit(path: string): void {
  if (!getConsent()) return;
  const visit: PageVisit = { path, at: new Date().toISOString() };
  const next = [...readVisits(), visit].slice(-MAX_VISITS);
  cache = next;
  try {
    window.localStorage.setItem(DATA_KEY, JSON.stringify(next));
  } catch {
    /* storage quota exceeded — keep in-memory cache only */
  }
  notifyListeners();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

const EMPTY: PageVisit[] = [];

/** React hook — returns live visit list. Empty during SSR. */
export function useVisits(): PageVisit[] {
  return useSyncExternalStore(subscribe, readVisits, () => EMPTY);
}

/** React hook — returns current consent status reactively. */
export function useAnalyticsConsent(): boolean {
  return useSyncExternalStore(subscribe, getConsent, () => false);
}
