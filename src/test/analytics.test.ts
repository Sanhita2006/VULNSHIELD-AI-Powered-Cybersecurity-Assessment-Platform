import { describe, expect, it } from "vitest";
import {
  filterByRange,
  countSessions,
  buildDailySeries,
  buildDayRange,
  buildTopPages,
  computeAnalytics,
  getDemoVisits,
} from "@/lib/analytics-data";
import type { PageVisit } from "@/lib/analytics-store";

// ── Helpers ───────────────────────────────────────────────────────────────────

function visit(path: string, at: string): PageVisit {
  return { path, at };
}

// ── filterByRange ─────────────────────────────────────────────────────────────

describe("filterByRange", () => {
  const visits: PageVisit[] = [
    visit("/a", "2024-01-01T10:00:00Z"),
    visit("/b", "2024-01-02T10:00:00Z"),
    visit("/c", "2024-01-03T10:00:00Z"),
  ];

  it("returns visits within the range inclusive", () => {
    const from = new Date("2024-01-01T00:00:00Z");
    const to = new Date("2024-01-02T23:59:59Z");
    const result = filterByRange(visits, from, to);
    expect(result).toHaveLength(2);
    expect(result.map((v) => v.path)).toEqual(["/a", "/b"]);
  });

  it("returns empty when range is in the future", () => {
    const from = new Date("2099-01-01T00:00:00Z");
    const to = new Date("2099-01-02T00:00:00Z");
    expect(filterByRange(visits, from, to)).toHaveLength(0);
  });

  it("returns all when range covers all visits", () => {
    const from = new Date("2020-01-01T00:00:00Z");
    const to = new Date("2030-01-01T00:00:00Z");
    expect(filterByRange(visits, from, to)).toHaveLength(3);
  });
});

// ── countSessions ─────────────────────────────────────────────────────────────

describe("countSessions", () => {
  it("returns 0 for empty list", () => {
    expect(countSessions([])).toBe(0);
  });

  it("counts one session for visits within 30 minutes", () => {
    const visits: PageVisit[] = [
      visit("/a", "2024-01-01T10:00:00Z"),
      visit("/b", "2024-01-01T10:15:00Z"),
      visit("/c", "2024-01-01T10:29:00Z"),
    ];
    expect(countSessions(visits)).toBe(1);
  });

  it("counts two sessions when gap exceeds 30 minutes", () => {
    const visits: PageVisit[] = [
      visit("/a", "2024-01-01T10:00:00Z"),
      visit("/b", "2024-01-01T10:31:00Z"),
    ];
    expect(countSessions(visits)).toBe(2);
  });

  it("handles unsorted input", () => {
    const visits: PageVisit[] = [
      visit("/b", "2024-01-01T10:31:00Z"),
      visit("/a", "2024-01-01T10:00:00Z"),
    ];
    expect(countSessions(visits)).toBe(2);
  });
});

// ── buildDayRange ─────────────────────────────────────────────────────────────

describe("buildDayRange", () => {
  it("returns the requested number of days", () => {
    expect(buildDayRange(7)).toHaveLength(7);
    expect(buildDayRange(30)).toHaveLength(30);
  });

  it("last element is today (UTC same date)", () => {
    const days = buildDayRange(7);
    const last = days[days.length - 1];
    const today = new Date();
    expect(last.getUTCFullYear()).toBe(today.getUTCFullYear());
    expect(last.getUTCMonth()).toBe(today.getUTCMonth());
    expect(last.getUTCDate()).toBe(today.getUTCDate());
  });
});

// ── buildDailySeries ──────────────────────────────────────────────────────────

describe("buildDailySeries", () => {
  it("produces one entry per day with correct view count", () => {
    const days = buildDayRange(2);
    const today = days[1];
    const todayISO = new Date(today);
    todayISO.setUTCHours(12, 0, 0, 0);

    const visits: PageVisit[] = [
      visit("/a", todayISO.toISOString()),
      visit("/b", todayISO.toISOString()),
    ];
    const series = buildDailySeries(visits, days);
    expect(series).toHaveLength(2);
    expect(series[1].views).toBe(2);
    expect(series[0].views).toBe(0);
  });
});

// ── buildTopPages ─────────────────────────────────────────────────────────────

describe("buildTopPages", () => {
  const visits: PageVisit[] = [
    visit("/a", "2024-01-01T10:00:00Z"),
    visit("/a", "2024-01-01T10:01:00Z"),
    visit("/a", "2024-01-01T10:02:00Z"),
    visit("/b", "2024-01-01T10:03:00Z"),
    visit("/b", "2024-01-01T10:04:00Z"),
    visit("/c", "2024-01-01T10:05:00Z"),
  ];

  it("ranks pages by descending view count", () => {
    const top = buildTopPages(visits);
    expect(top[0].path).toBe("/a");
    expect(top[1].path).toBe("/b");
    expect(top[2].path).toBe("/c");
  });

  it("computes share fraction correctly", () => {
    const top = buildTopPages(visits);
    expect(top[0].share).toBeCloseTo(3 / 6);
    expect(top[1].share).toBeCloseTo(2 / 6);
    expect(top[2].share).toBeCloseTo(1 / 6);
  });

  it("respects topN limit", () => {
    expect(buildTopPages(visits, 2)).toHaveLength(2);
  });

  it("returns empty for no visits", () => {
    expect(buildTopPages([])).toHaveLength(0);
  });
});

// ── computeAnalytics ──────────────────────────────────────────────────────────

describe("computeAnalytics", () => {
  it("returns zeroed summary for empty visits", () => {
    const s = computeAnalytics([], 7);
    expect(s.totalViews).toBe(0);
    expect(s.uniquePages).toBe(0);
    expect(s.estimatedSessions).toBe(0);
    expect(s.activeLast5Min).toBe(0);
    expect(s.daily).toHaveLength(7);
    expect(s.topPages).toHaveLength(0);
    expect(s.recentActivity).toHaveLength(0);
  });

  it("counts only visits inside the window", () => {
    const old = visit("/old", "2000-01-01T00:00:00Z");
    const fresh = visit("/new", new Date().toISOString());
    const s = computeAnalytics([old, fresh], 7);
    expect(s.totalViews).toBe(1);
    expect(s.topPages[0].path).toBe("/new");
  });

  it("caps recentActivity at 20", () => {
    const now = new Date().toISOString();
    const visits = Array.from({ length: 50 }, (_, i) =>
      visit(`/page-${i}`, now),
    );
    expect(computeAnalytics(visits, 7).recentActivity).toHaveLength(20);
  });
});

// ── getDemoVisits ─────────────────────────────────────────────────────────────

describe("getDemoVisits", () => {
  it("returns at least 100 visits", () => {
    expect(getDemoVisits().length).toBeGreaterThan(100);
  });

  it("all visits have valid ISO timestamps and paths", () => {
    for (const v of getDemoVisits()) {
      expect(v.path).toMatch(/^\//);
      expect(isNaN(new Date(v.at).getTime())).toBe(false);
    }
  });

  it("is deterministic — same result on consecutive calls", () => {
    const a = getDemoVisits();
    const b = getDemoVisits();
    expect(a).toEqual(b);
  });
});
