import { describe, expect, it } from "vitest";
import { computeScore, countBySeverity, postureFor } from "@/lib/scoring";
import type { Finding, Severity } from "@/lib/types";

const f = (severity: Severity, i = 0): Finding => ({
  id: `${severity}-${i}`,
  title: "t",
  severity,
  category: "Headers",
  description: "",
  remediation: "",
});

describe("security score", () => {
  it("is 100 when there are no findings", () => {
    expect(computeScore([])).toBe(100);
  });

  it("subtracts 15 per high, 7 per medium and 2 per low", () => {
    expect(computeScore([f("high"), f("medium"), f("low")])).toBe(76);
  });

  it("never drops below 0", () => {
    const many = Array.from({ length: 10 }, (_, i) => f("high", i));
    expect(computeScore(many)).toBe(0);
  });

  it("counts findings per severity", () => {
    expect(countBySeverity([f("high"), f("low", 1), f("low", 2)])).toEqual({
      high: 1,
      medium: 0,
      low: 2,
    });
  });
});

describe("security posture bands", () => {
  it("maps score thresholds to posture labels", () => {
    expect(postureFor(85)).toBe("Strong");
    expect(postureFor(84)).toBe("Fair");
    expect(postureFor(65)).toBe("Fair");
    expect(postureFor(64)).toBe("Weak");
    expect(postureFor(40)).toBe("Weak");
    expect(postureFor(39)).toBe("Critical");
  });
});
