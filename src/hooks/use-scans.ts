import { getDemoScans } from "@/lib/demo-data";
import { useRealScans } from "@/lib/scan-store";
import type { ScanSummary } from "@/lib/types";
import { useDataMode } from "./use-data-mode";

/**
 * Single source of scan data for every module.
 * - Demo mode → simulated sample scans (clearly labelled in the UI).
 * - Live mode → real scans only (from the Website Audit). Never invented.
 */
export function useScans(): { scans: ScanSummary[]; latest: ScanSummary | null; isDemo: boolean } {
  const { isDemo } = useDataMode();
  const real = useRealScans();
  const scans = isDemo ? getDemoScans() : real;
  return { scans, latest: scans.at(-1) ?? null, isDemo };
}
