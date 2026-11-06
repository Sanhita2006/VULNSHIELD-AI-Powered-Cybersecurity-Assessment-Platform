import type { Finding, Severity } from "./types";

/**
 * Transparent, documented scoring rule — the score is always DERIVED from
 * findings, never typed in by hand:
 *   start at 100, subtract 15 per High, 7 per Medium, 2 per Low,
 *   clamp to the 0–100 range.
 */
export const SEVERITY_PENALTY: Record<Severity, number> = {
  high: 15,
  medium: 7,
  low: 2,
};

export function countBySeverity(findings: Finding[]): Record<Severity, number> {
  const counts: Record<Severity, number> = { high: 0, medium: 0, low: 0 };
  for (const f of findings) counts[f.severity] += 1;
  return counts;
}

export function computeScore(findings: Finding[]): number {
  const penalty = findings.reduce((sum, f) => sum + SEVERITY_PENALTY[f.severity], 0);
  return Math.max(0, Math.min(100, 100 - penalty));
}

export type Posture = "Strong" | "Fair" | "Weak" | "Critical";

/** 85+ Strong, 65–84 Fair, 40–64 Weak, below 40 Critical. */
export function postureFor(score: number): Posture {
  if (score >= 85) return "Strong";
  if (score >= 65) return "Fair";
  if (score >= 40) return "Weak";
  return "Critical";
}
