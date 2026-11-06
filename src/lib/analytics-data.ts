/**
 * VULNSHIELD — Analytics Calculations
 *
 * Pure functions — no side effects, no network calls, fully testable.
 * All functions accept a PageVisit[] and a date-range window.
 */

import type { PageVisit } from "./analytics-store";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DayPoint {
  /** "Mon", "Tue", … or "Jan 1" etc. */
  label: string;
  views: number;
  /** Distinct sessions approximated by 30-min gap between visits to same path */
  unique: number;
}

export interface PageStat {
  path: string;
  views: number;
  /** Fraction of total views 0-1 */
  share: number;
}

export interface ActivityEvent {
  at: string; // ISO
  path: string;
}

export interface AnalyticsSummary {
  totalViews: number;
  uniquePages: number;
  /** Distinct "sessions" — gaps > 30 min counted as new session */
  estimatedSessions: number;
  /** Visits in last 5 minutes (proxy for "active now") */
  activeLast5Min: number;
  daily: DayPoint[];
  topPages: PageStat[];
  recentActivity: ActivityEvent[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function dayLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** Build a contiguous list of N days ending today (UTC). */
export function buildDayRange(days: number): Date[] {
  const result: Date[] = [];
  const now = Date.now();
  for (let i = days - 1; i >= 0; i--) {
    result.push(new Date(now - i * 86_400_000));
  }
  return result;
}

/** Filter visits to those within [from, to]. */
export function filterByRange(
  visits: PageVisit[],
  from: Date,
  to: Date,
): PageVisit[] {
  const lo = from.getTime();
  const hi = to.getTime();
  return visits.filter((v) => {
    const t = new Date(v.at).getTime();
    return t >= lo && t <= hi;
  });
}

/** Approximate unique sessions: sort by time, new session if gap > 30 min. */
export function countSessions(visits: PageVisit[]): number {
  if (!visits.length) return 0;
  const sorted = [...visits].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );
  let sessions = 1;
  let prevAt = new Date(sorted[0].at).getTime();
  for (let i = 1; i < sorted.length; i++) {
    const t = new Date(sorted[i].at).getTime();
    if (t - prevAt > 30 * 60_000) sessions++;
    prevAt = t;
  }
  return sessions;
}

/** Build daily view/unique series over the given day range. */
export function buildDailySeries(
  visits: PageVisit[],
  days: Date[],
): DayPoint[] {
  return days.map((day) => {
    const start = new Date(day);
    start.setUTCHours(0, 0, 0, 0);
    const end = new Date(day);
    end.setUTCHours(23, 59, 59, 999);
    const inDay = filterByRange(visits, start, end);
    const uniquePaths = new Set(inDay.map((v) => v.path)).size;
    return {
      label: dayLabel(day),
      views: inDay.length,
      unique: uniquePaths,
    };
  });
}

/** Rank pages by view count, return top N with share fraction. */
export function buildTopPages(visits: PageVisit[], topN = 8): PageStat[] {
  const counts = new Map<string, number>();
  for (const v of visits) {
    counts.set(v.path, (counts.get(v.path) ?? 0) + 1);
  }
  const total = visits.length || 1;
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([path, views]) => ({ path, views, share: views / total }));
}

/** Full analytics summary for a given visit list and day window. */
export function computeAnalytics(
  visits: PageVisit[],
  windowDays: number = 7,
): AnalyticsSummary {
  const days = buildDayRange(windowDays);
  const from = days[0];
  const to = new Date(); // now

  const inWindow = filterByRange(visits, from, to);

  const fiveMinAgo = new Date(Date.now() - 5 * 60_000);
  const activeLast5Min = filterByRange(inWindow, fiveMinAgo, to).length;

  return {
    totalViews: inWindow.length,
    uniquePages: new Set(inWindow.map((v) => v.path)).size,
    estimatedSessions: countSessions(inWindow),
    activeLast5Min,
    daily: buildDailySeries(inWindow, days),
    topPages: buildTopPages(inWindow),
    recentActivity: [...inWindow]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 20)
      .map(({ path, at }) => ({ path, at })),
  };
}

// ── Demo Data ──────────────────────────────────────────────────────────────────
// Clearly simulated — used only in demo mode.

const DEMO_PAGES = [
  "/",
  "/website-audit",
  "/owasp",
  "/device-audit",
  "/threat-intel",
  "/forensics",
  "/reports",
  "/analytics",
];

/** Build a deterministic demo dataset anchored to today (UTC midnight). */
export function getDemoVisits(): PageVisit[] {
  const DAY = 86_400_000;
  const anchor = Math.floor(Date.now() / DAY) * DAY; // today UTC 00:00
  const visits: PageVisit[] = [];

  // 30 days of realistic-looking traffic
  for (let d = 29; d >= 0; d--) {
    const base = anchor - d * DAY;
    // weekdays get more traffic
    const dow = new Date(base).getUTCDay(); // 0=Sun
    const isWeekend = dow === 0 || dow === 6;
    const count = isWeekend
      ? 8 + ((29 - d) % 5)
      : 20 + ((29 - d) % 11);

    for (let i = 0; i < count; i++) {
      const offset = Math.floor(((i * 1_234_567) % DAY) * 0.9); // spread across day
      const at = new Date(base + offset).toISOString();
      const path = DEMO_PAGES[(i + d) % DEMO_PAGES.length];
      visits.push({ path, at });
    }
  }
  return visits;
}
