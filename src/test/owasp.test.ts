import { describe, expect, it } from "vitest";
import { evaluateOwaspPosture, getOwaspCategoryForFinding, OWASP_TOP_10_2021 } from "@/lib/owasp-data";
import type { Finding } from "@/lib/types";

describe("OWASP Top 10 data definitions", () => {
  it("defines all 10 OWASP Top 10:2021 categories from A01 to A10", () => {
    expect(OWASP_TOP_10_2021).toHaveLength(10);
    const codes = OWASP_TOP_10_2021.map((c) => c.code);
    expect(codes).toEqual(["A01", "A02", "A03", "A04", "A05", "A06", "A07", "A08", "A09", "A10"]);
  });

  it("assigns valid risk levels to all categories", () => {
    for (const cat of OWASP_TOP_10_2021) {
      expect(["Critical", "High", "Medium"]).toContain(cat.riskLevel);
      expect(cat.title.length).toBeGreaterThan(0);
      expect(cat.beginnerExplanation.length).toBeGreaterThan(0);
      expect(cat.prevention.length).toBeGreaterThan(0);
    }
  });
});

describe("OWASP finding category mapping", () => {
  it("maps explicit OWASP property accurately", () => {
    const f: Finding = {
      id: "test-1",
      title: "Broken crypto",
      severity: "high",
      category: "TLS",
      owasp: "A02:2021 Cryptographic Failures",
      description: "desc",
      remediation: "fix",
    };
    expect(getOwaspCategoryForFinding(f)).toBe("A02");
  });

  it("maps TLS findings to A02 Cryptographic Failures", () => {
    const f: Finding = {
      id: "tls-expiry",
      title: "Certificate expires soon",
      severity: "medium",
      category: "TLS",
      description: "desc",
      remediation: "fix",
    };
    expect(getOwaspCategoryForFinding(f)).toBe("A02");
  });

  it("maps cookie findings to A07 Identification & Authentication Failures", () => {
    const f: Finding = {
      id: "ck-secure",
      title: "Cookie missing Secure flag",
      severity: "medium",
      category: "Cookies",
      description: "desc",
      remediation: "fix",
    };
    expect(getOwaspCategoryForFinding(f)).toBe("A07");
  });

  it("maps DNS CAA finding to A05 Security Misconfiguration", () => {
    const f: Finding = {
      id: "dns-caa",
      title: "No CAA record",
      severity: "low",
      category: "DNS",
      description: "desc",
      remediation: "fix",
    };
    expect(getOwaspCategoryForFinding(f)).toBe("A05");
  });

  it("maps DNSSEC finding to A08 Software & Data Integrity Failures", () => {
    const f: Finding = {
      id: "dns-dnssec-missing",
      title: "DNSSEC not signed",
      severity: "low",
      category: "DNS",
      description: "desc",
      remediation: "fix",
    };
    expect(getOwaspCategoryForFinding(f)).toBe("A08");
  });
});

describe("evaluateOwaspPosture", () => {
  it("groups findings and aggregates severity counts across categories", () => {
    const findings: Finding[] = [
      {
        id: "f1",
        title: "Tls fail",
        severity: "high",
        category: "TLS",
        owasp: "A02:2021",
        description: "",
        remediation: "",
      },
      {
        id: "f2",
        title: "Hsts missing",
        severity: "medium",
        category: "Headers",
        owasp: "A02:2021",
        description: "",
        remediation: "",
      },
      {
        id: "f3",
        title: "CSP missing",
        severity: "low",
        category: "Headers",
        owasp: "A05:2021",
        description: "",
        remediation: "",
      },
    ];

    const result = evaluateOwaspPosture(findings);
    expect(result).toHaveLength(10);

    const a02 = result.find((r) => r.category.code === "A02");
    expect(a02?.status).toBe("affected");
    expect(a02?.counts.total).toBe(2);
    expect(a02?.counts.high).toBe(1);
    expect(a02?.counts.medium).toBe(1);

    const a05 = result.find((r) => r.category.code === "A05");
    expect(a05?.status).toBe("affected");
    expect(a05?.counts.low).toBe(1);

    const a01 = result.find((r) => r.category.code === "A01");
    expect(a01?.status).toBe("clean");
    expect(a01?.counts.total).toBe(0);
  });
});
