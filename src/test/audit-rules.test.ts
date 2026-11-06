import { describe, expect, it } from "vitest";
import { isNonPublicIp, normalizeTarget } from "@/lib/audit/url";
import { analyzeCookies, analyzeDmarc, analyzeHeaders, analyzeSpf } from "@/lib/audit/analyze";

describe("target validation (only public domains you can own)", () => {
  it("accepts a bare domain and upgrades to https", () => {
    expect(normalizeTarget("Example.ORG")).toEqual({ ok: true, host: "example.org", url: "https://example.org/" });
  });
  it.each(["http://127.0.0.1", "http://[::1]/", "localhost", "intranet.local", "https://a.com:8443", "ftp://x.com", "https://u:p@x.com"])(
    "rejects %s",
    (raw) => {
      expect(normalizeTarget(raw).ok).toBe(false);
    },
  );
  it("flags private and reserved IPs", () => {
    expect(isNonPublicIp("10.1.2.3")).toBe(true);
    expect(isNonPublicIp("169.254.169.254")).toBe(true);
    expect(isNonPublicIp("192.168.0.1")).toBe(true);
    expect(isNonPublicIp("fd00::1")).toBe(true);
    expect(isNonPublicIp("93.184.216.34")).toBe(false);
  });
});

describe("header rules", () => {
  it("missing HSTS and CSP are medium findings, missing nosniff is low", () => {
    const { findings } = analyzeHeaders({});
    const sev = Object.fromEntries(findings.map((f) => [f.id, f.severity]));
    expect(sev["hdr-hsts"]).toBe("medium");
    expect(sev["hdr-csp"]).toBe("medium");
    expect(sev["hdr-xcto"]).toBe("low");
  });
  it("a fully hardened header set produces no findings", () => {
    const { findings } = analyzeHeaders({
      "strict-transport-security": "max-age=31536000; includeSubDomains",
      "content-security-policy": "default-src 'self'; frame-ancestors 'self'",
      "x-content-type-options": "nosniff",
      "referrer-policy": "strict-origin-when-cross-origin",
      "permissions-policy": "camera=()",
      server: "nginx",
    });
    expect(findings).toEqual([]);
  });
});

describe("cookie and email rules", () => {
  it("a cookie without Secure is a medium finding", () => {
    const { findings } = analyzeCookies(["sid=abc; Path=/; HttpOnly; SameSite=Lax"]);
    expect(findings.map((f) => [f.id, f.severity])).toEqual([["ck-secure", "medium"]]);
  });
  it("SPF ending in +all is flagged; -all passes", () => {
    expect(analyzeSpf(["v=spf1 +all"]).findings[0]?.id).toBe("em-spf-weak");
    expect(analyzeSpf(["v=spf1 include:_spf.google.com -all"]).findings).toEqual([]);
  });
  it("DMARC p=none is low, missing DMARC is medium", () => {
    expect(analyzeDmarc(["v=DMARC1; p=none"]).findings[0]?.severity).toBe("low");
    expect(analyzeDmarc([]).findings[0]?.severity).toBe("medium");
  });
});
