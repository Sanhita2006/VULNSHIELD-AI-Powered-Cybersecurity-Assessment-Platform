import { describe, expect, it } from "vitest";
import {
  BROWSER_SANDBOX_RESTRICTIONS,
  collectDeviceInfo,
  parseUserAgent,
  runDeviceSecurityAudit,
} from "@/lib/device-audit";

describe("User Agent Parser", () => {
  it("identifies Windows and Chrome accurately", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";
    const res = parseUserAgent(ua);
    expect(res.browserName).toBe("Google Chrome");
    expect(res.browserVersion).toBe("122.0.0.0");
    expect(res.osFamily).toBe("Windows 10/11");
  });

  it("identifies Edge on Windows accurately", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.2365.92";
    const res = parseUserAgent(ua);
    expect(res.browserName).toBe("Microsoft Edge");
    expect(res.browserVersion).toBe("122.0.2365.92");
    expect(res.osFamily).toBe("Windows 10/11");
  });

  it("identifies Firefox on Linux", () => {
    const ua = "Mozilla/5.0 (X11; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0";
    const res = parseUserAgent(ua);
    expect(res.browserName).toBe("Mozilla Firefox");
    expect(res.browserVersion).toBe("123.0");
    expect(res.osFamily).toBe("Linux");
  });

  it("identifies Safari on macOS", () => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15";
    const res = parseUserAgent(ua);
    expect(res.browserName).toBe("Apple Safari");
    expect(res.browserVersion).toBe("17.3");
    expect(res.osFamily).toBe("macOS");
  });
});

describe("Browser Sandbox Restrictions", () => {
  it("contains all critical OS/hardware boundary explanations", () => {
    expect(BROWSER_SANDBOX_RESTRICTIONS.length).toBeGreaterThanOrEqual(6);
    const titles = BROWSER_SANDBOX_RESTRICTIONS.map((r) => r.title);
    expect(titles).toContain("Operating System Patch & Hotfix Level");
    expect(titles).toContain("Antivirus & EDR Real-Time Status");
    expect(titles).toContain("Host Firewall & Open Port Rules");
    expect(titles).toContain("Full Disk Encryption (BitLocker / FileVault)");
    expect(titles).toContain("Running Background Processes & Services");
    expect(titles).toContain("UEFI / BIOS Secure Boot State");
  });

  it("has clear reason and explanation fields for honesty", () => {
    for (const r of BROWSER_SANDBOX_RESTRICTIONS) {
      expect(r.category.length).toBeGreaterThan(0);
      expect(r.reason.length).toBeGreaterThan(0);
      expect(r.explanation.length).toBeGreaterThan(20);
    }
  });
});

describe("Device Audit Engine", () => {
  it("executes audit without throwing and produces a valid score between 0 and 100", async () => {
    const report = await runDeviceSecurityAudit();
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.score).toBeLessThanOrEqual(100);
    expect(["Strong", "Fair", "Weak", "Critical"]).toContain(report.posture);
    expect(report.checks.length).toBeGreaterThan(0);
  });

  it("collects device info safely", () => {
    const info = collectDeviceInfo();
    expect(info).toBeDefined();
    expect(typeof info.browserName).toBe("string");
    expect(typeof info.osFamily).toBe("string");
  });
});
