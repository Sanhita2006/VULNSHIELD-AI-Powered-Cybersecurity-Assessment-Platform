// ⚠️ SIMULATED DEMONSTRATION DATA — NOT A REAL SCAN.
// Used only when the app is in "Demo" mode so the dashboard can be presented
// before any real scan exists. Every screen shows a DEMO badge while this is used.
// The target is a reserved, non-routable name so it can never be mistaken for a real site.

import { computeScore } from "./scoring";
import type { CheckResult, Finding, LogEvent, ScanSummary } from "./types";

export const DEMO_TARGET = "demo.vulnshield.example";

const demoFindings: Finding[] = [
  {
    id: "d-tls10",
    title: "Legacy TLS 1.0 still accepted",
    severity: "high",
    category: "TLS",
    owasp: "A02:2021 Cryptographic Failures",
    description: "The server negotiates TLS 1.0, which has known weaknesses.",
    remediation: "Disable TLS 1.0/1.1 and allow only TLS 1.2 and 1.3.",
  },
  {
    id: "d-csp",
    title: "Content-Security-Policy header missing",
    severity: "medium",
    category: "Headers",
    owasp: "A05:2021 Security Misconfiguration",
    description: "Without CSP, injected scripts run with no browser restriction.",
    remediation: "Add a Content-Security-Policy header starting with default-src 'self'.",
  },
  {
    id: "d-hsts",
    title: "HSTS not enabled",
    severity: "medium",
    category: "Headers",
    owasp: "A05:2021 Security Misconfiguration",
    description: "Browsers may still connect over plain HTTP on first visit.",
    remediation: "Send Strict-Transport-Security: max-age=31536000; includeSubDomains.",
  },
  {
    id: "d-dmarc",
    title: "DMARC policy set to p=none",
    severity: "medium",
    category: "Email",
    description: "Spoofed emails from this domain are reported but not blocked.",
    remediation: "Move the DMARC policy to p=quarantine, then p=reject.",
  },
  {
    id: "d-cookie",
    title: "Session cookie without Secure flag",
    severity: "medium",
    category: "Cookies",
    owasp: "A07:2021 Identification and Authentication Failures",
    description: "The cookie could be sent over an unencrypted connection.",
    remediation: "Set Secure; HttpOnly; SameSite=Lax on session cookies.",
  },
  {
    id: "d-caa",
    title: "No CAA record published",
    severity: "low",
    category: "DNS",
    description: "Any certificate authority may issue certificates for the domain.",
    remediation: "Publish a CAA record naming only the CA you use.",
  },
  {
    id: "d-xcto",
    title: "X-Content-Type-Options missing",
    severity: "low",
    category: "Headers",
    owasp: "A05:2021 Security Misconfiguration",
    description: "Browsers may MIME-sniff responses into executable types.",
    remediation: "Send X-Content-Type-Options: nosniff.",
  },
  {
    id: "d-server",
    title: "Server version disclosed in headers",
    severity: "low",
    category: "Config",
    owasp: "A05:2021 Security Misconfiguration",
    description: "The Server header reveals software and version.",
    remediation: "Hide or genericise the Server / X-Powered-By headers.",
  },
];

const demoChecks: CheckResult[] = [
  { id: "c1", label: "HTTPS reachable", category: "TLS", status: "pass", detail: "Valid certificate, 64 days left" },
  { id: "c2", label: "TLS protocol versions", category: "TLS", status: "fail", detail: "TLS 1.0 accepted" },
  { id: "c3", label: "HTTP → HTTPS redirect", category: "TLS", status: "pass", detail: "301 to https://" },
  { id: "c4", label: "Security headers", category: "Headers", status: "warn", detail: "3 of 7 recommended present" },
  { id: "c5", label: "DNSSEC", category: "DNS", status: "unsupported", detail: "Not signed by registrar" },
  { id: "c6", label: "SPF record", category: "Email", status: "pass", detail: "v=spf1 include:_spf… -all" },
  { id: "c7", label: "DKIM selector", category: "Email", status: "pass", detail: "selector1 found" },
  { id: "c8", label: "DMARC policy", category: "Email", status: "warn", detail: "p=none" },
  { id: "c9", label: "CAA record", category: "DNS", status: "fail", detail: "None published" },
];

const DAY = 86_400_000;

// Historical simulated scans: each one carries a subset of findings so its
// score is still computed by the same rule as real scans.
function demoScan(anchor: number, id: string, days: number, findingIds: string[]): ScanSummary {
  const findings = demoFindings.filter((f) => findingIds.includes(f.id));
  return {
    id,
    target: DEMO_TARGET,
    startedAt: new Date(anchor - days * DAY).toISOString(),
    score: computeScore(findings),
    findings,
    checks: demoChecks,
  };
}

let cached: { day: number; scans: ScanSummary[] } | null = null;

/** Built lazily (not at module load) and anchored to 09:00 UTC today, so server and browser match. */
export function getDemoScans(): ScanSummary[] {
  const day = Math.floor(Date.now() / DAY);
  if (cached?.day === day) return cached.scans;
  const anchor = day * DAY + 9 * 3_600_000;
  const all = demoFindings.map((f) => f.id);
  const scans = [
    demoScan(anchor, "s2", 24, all),
    demoScan(anchor, "s3", 17, all.filter((x) => x !== "d-server")),
    demoScan(anchor, "s4", 10, all.filter((x) => x !== "d-xcto")),
    demoScan(anchor, "s5", 4, all.filter((x) => !["d-xcto", "d-server"].includes(x))),
    demoScan(anchor, "s6", 0, all.filter((x) => !["d-xcto", "d-server", "d-hsts"].includes(x))),
  ];
  cached = { day, scans };
  return scans;
}

// Templates for the simulated activity stream.
export const demoLogTemplates: Omit<LogEvent, "id" | "at">[] = [
  { level: "info", source: "tls-probe", message: `Handshake ${DEMO_TARGET}:443 → TLSv1.3 negotiated` },
  { level: "alert", source: "tls-probe", message: "Legacy TLSv1.0 accepted by server" },
  { level: "ok", source: "cert", message: "Certificate chain valid · issuer R11 · 64d remaining" },
  { level: "warn", source: "headers", message: "Content-Security-Policy not present" },
  { level: "ok", source: "headers", message: "X-Frame-Options: DENY" },
  { level: "info", source: "dns", message: "Resolving CAA records…" },
  { level: "warn", source: "dns", message: "No CAA record — any CA may issue" },
  { level: "ok", source: "mail", message: "SPF record valid (-all)" },
  { level: "warn", source: "mail", message: "DMARC policy p=none (monitor only)" },
  { level: "info", source: "rate-limit", message: "Throttle: 1 req/s · passive mode" },
  { level: "ok", source: "redirect", message: "HTTP → HTTPS 301 confirmed" },
  { level: "alert", source: "cookies", message: "Set-Cookie sid missing Secure flag" },
];
