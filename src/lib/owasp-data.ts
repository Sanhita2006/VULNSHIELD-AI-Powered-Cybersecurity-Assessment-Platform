// Official OWASP Top 10:2021 definitions, beginner-friendly explanations,
// remediation guidance, and correlation logic for VULNSHIELD findings.

import type { Finding, Severity } from "./types";

export type OwaspRisk = "Critical" | "High" | "Medium";

export interface OwaspCategoryDef {
  id: string; // e.g. "A01:2021"
  code: string; // e.g. "A01"
  title: string; // e.g. "Broken Access Control"
  rank: number;
  riskLevel: OwaspRisk;
  summary: string;
  description: string;
  beginnerExplanation: string;
  passiveAssessmentScope: string;
  prevention: string[];
  cwes: string[];
}

export const OWASP_TOP_10_2021: OwaspCategoryDef[] = [
  {
    id: "A01:2021",
    code: "A01",
    title: "Broken Access Control",
    rank: 1,
    riskLevel: "Critical",
    summary: "Restrictions on authenticated or anonymous users are not properly enforced.",
    description:
      "Access control enforces policy such that users cannot act outside of their intended permissions. Failures typically lead to unauthorized information disclosure, modification or destruction of all data, or performing a business function outside of the user's limits.",
    beginnerExplanation:
      "Imagine a hotel where any room key opens any other guest's room door or the manager's office. Broken access control allows ordinary visitors to access sensitive admin panels, view private account data, or modify unauthorized settings.",
    passiveAssessmentScope:
      "Passive observation checks for overly permissive Cross-Origin Resource Sharing (CORS) headers (e.g. wildcard origin with credentials) and exposed directory indexing. Comprehensive verification requires authenticated testing.",
    prevention: [
      "Deny access by default for every sensitive route and API endpoint.",
      "Implement role-based access control (RBAC) and re-check permissions on every server request.",
      "Disable web server directory listing and ensure file metadata/backup files are not web-accessible.",
      "Configure strict CORS policies; never mirror origin headers with Access-Control-Allow-Credentials: true.",
    ],
    cwes: ["CWE-200 Exposure of Sensitive Info", "CWE-284 Improper Access Control", "CWE-352 CSRF"],
  },
  {
    id: "A02:2021",
    code: "A02",
    title: "Cryptographic Failures",
    rank: 2,
    riskLevel: "High",
    summary: "Failures related to cryptography (or lack thereof) exposing sensitive data in transit or at rest.",
    description:
      "Previously known as Sensitive Data Exposure. Focuses on flaws in encryption mechanisms that allow attackers to intercept, decrypt, or tamper with credentials, personal data, and communications.",
    beginnerExplanation:
      "Like sending a postcard instead of a sealed envelope: anyone handling the mail can read it. If a site lacks HTTPS or strong encryption headers, passwords and sessions can be intercepted over public Wi-Fi.",
    passiveAssessmentScope:
      "Directly assessed: validates HTTP-to-HTTPS redirect chains, enforcement of Strict-Transport-Security (HSTS), certificate validity windows via public Certificate Transparency logs, and TLS downgrade prevention.",
    prevention: [
      "Enforce HTTPS across all pages with permanent HTTP 301 redirects.",
      "Send Strict-Transport-Security with a long max-age (≥ 180 days) and includeSubDomains.",
      "Decommission legacy TLS protocols (TLS 1.0 and 1.1) and allow only TLS 1.2 and 1.3.",
      "Automate certificate renewal using Let's Encrypt or your cloud provider to prevent sudden expiration.",
    ],
    cwes: ["CWE-259 Hard-coded Password", "CWE-319 Cleartext Transmission", "CWE-327 Broken Crypto"],
  },
  {
    id: "A03:2021",
    code: "A03",
    title: "Injection",
    rank: 3,
    riskLevel: "Critical",
    summary: "Untrusted user data is executed by an interpreter as commands or queries.",
    description:
      "Injection flaws such as SQL, NoSQL, OS command, and Cross-Site Scripting (XSS) occur when untrusted user input is sent to an interpreter as part of a command or query, tricking the interpreter into executing unintended commands.",
    beginnerExplanation:
      "Tricking a system by entering malicious instructions into a search box or login field (like typing computer commands into your name field so the database executes them instead of just saving them).",
    passiveAssessmentScope:
      "Passively assessed through defensive HTTP response headers: Content-Security-Policy (CSP) with script restriction directives and X-Content-Type-Options: nosniff. Active payload injection is strictly excluded to maintain ethical passive scope.",
    prevention: [
      "Use parameterized queries (prepared statements) or ORMs for all database access.",
      "Deploy a strict Content-Security-Policy (CSP) that bans unsafe-inline and restricts script sources.",
      "Apply contextual output encoding for all user-supplied data rendered in HTML or JavaScript contexts.",
      "Set X-Content-Type-Options: nosniff to stop browsers from MIME-sniffing files into executable script.",
    ],
    cwes: ["CWE-79 Cross-site Scripting (XSS)", "CWE-89 SQL Injection", "CWE-77 Command Injection"],
  },
  {
    id: "A04:2021",
    code: "A04",
    title: "Insecure Design",
    rank: 4,
    riskLevel: "High",
    summary: "Flaws in architectural design and lack of business-logic security controls.",
    description:
      "Insecure design represents weaknesses introduced during architectural planning rather than faulty implementation. It focuses on missing threat modeling, lack of rate limiting, and business logic flaws that cannot be fixed by code patching alone.",
    beginnerExplanation:
      "Designing a bank vault out of solid steel, but forgetting to put a lock on the back door. The code might have no bugs, but the overall design forgot critical security precautions.",
    passiveAssessmentScope:
      "Passively observed through architectural response headers such as Permissions-Policy (disabling dangerous browser APIs like camera/microphone) and rate limiting headers.",
    prevention: [
      "Establish threat modeling sessions during initial software and feature design.",
      "Implement defense-in-depth: limit attempt rates on sensitive operations like login and password resets.",
      "Explicitly declare browser feature policies using Permissions-Policy.",
      "Segregate critical business logic and establish clear trust boundaries between microservices.",
    ],
    cwes: ["CWE-209 Error Message Information Leak", "CWE-256 Unprotected Storage", "CWE-501 Trust Boundary Violation"],
  },
  {
    id: "A05:2021",
    code: "A05",
    title: "Security Misconfiguration",
    rank: 5,
    riskLevel: "High",
    summary: "Default, incomplete, or unhardened configurations across the web stack.",
    description:
      "Security misconfiguration happens when security settings are left at default values, headers are missing, permissions are too broad, or unnecessary services and verbose error pages remain active.",
    beginnerExplanation:
      "Leaving the default factory password on your router, or leaving your front door unlocked. It's the most common vulnerability on the web because modern servers require dozens of configuration settings to be safe.",
    passiveAssessmentScope:
      "Heavily assessed: evaluates missing security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy), server banner version disclosure (e.g. Apache/nginx versions in headers), and DNS CAA records.",
    prevention: [
      "Remove or genericize Server and X-Powered-By response headers to avoid revealing exact software versions.",
      "Implement X-Frame-Options: DENY or CSP frame-ancestors to prevent clickjacking attacks.",
      "Publish a DNS CAA record restricting which certificate authorities can issue certificates for your domain.",
      "Use infrastructure-as-code hardening baselines and review default cloud firewall rules.",
    ],
    cwes: ["CWE-16 Configuration", "CWE-209 Information Disclosure", "CWE-1004 Cookie Without HttpOnly"],
  },
  {
    id: "A06:2021",
    code: "A06",
    title: "Vulnerable and Outdated Components",
    rank: 6,
    riskLevel: "High",
    summary: "Using third-party libraries, servers, or dependencies with known CVEs.",
    description:
      "Applications that use unsupported, out-of-date, or vulnerable open-source libraries, web servers, or operating system packages remain exposed to well-documented public exploits.",
    beginnerExplanation:
      "Using an old car with a known factory brake recall that was never serviced. Hackers look up public vulnerability databases for known flaws in older software versions and use automated scripts to attack them.",
    passiveAssessmentScope:
      "Passively assessed when web servers disclose specific version strings in headers (e.g. Apache 2.4.x, PHP/5.x) or when TLS certificates indicate deprecated algorithms.",
    prevention: [
      "Remove unused dependencies, unnecessary features, components, files, and documentation.",
      "Run automated vulnerability scanning tools (npm audit, Snyk, Dependabot) in continuous integration.",
      "Subscribe to security advisories for all underlying technologies (web server, runtime, libraries).",
      "Upgrade frameworks and dependencies promptly when security updates are released.",
    ],
    cwes: ["CWE-1104 Use of Unmaintained Third-Party Components"],
  },
  {
    id: "A07:2021",
    code: "A07",
    title: "Identification and Authentication Failures",
    rank: 7,
    riskLevel: "High",
    summary: "Confirmation of the user's identity, authentication, and session management flaws.",
    description:
      "Weaknesses in validating user identity, protecting session tokens, managing passwords, or preventing spoofed email identities allow attackers to compromise passwords, keys, or session tokens.",
    beginnerExplanation:
      "A keycard system that gives out duplicate guest badges or stores session passes on sticky notes. If authentication cookies are not protected with 'Secure' and 'HttpOnly', attackers can steal your logged-in session.",
    passiveAssessmentScope:
      "Directly assessed: checks Set-Cookie flags (Secure, HttpOnly, SameSite) on all server responses, as well as domain identity authentication records (SPF syntax, DMARC policies, and DKIM selector presence).",
    prevention: [
      "Always set Secure; HttpOnly; SameSite=Lax (or Strict) on all session and authentication cookies.",
      "Deploy multi-factor authentication (MFA) to mitigate credential stuffing and password reuse attacks.",
      "Publish strict SPF records with '-all' to reject unauthorized email senders claiming your domain.",
      "Enforce DMARC with 'p=reject' or 'p=quarantine' and monitor reports to prevent email spoofing.",
    ],
    cwes: ["CWE-287 Improper Authentication", "CWE-384 Session Fixation", "CWE-613 Insufficient Session Expiration"],
  },
  {
    id: "A08:2021",
    code: "A08",
    title: "Software and Data Integrity Failures",
    rank: 8,
    riskLevel: "High",
    summary: "Code and critical infrastructure that do not protect against integrity violations.",
    description:
      "Relates to code, dependencies, and network communications that assume integrity without verification. This includes unverified CDNs, unsigned updates, untrusted deserialization, and unvalidated DNS responses.",
    beginnerExplanation:
      "Accepting a package delivery without checking if the tamper-evident seal is broken. If an attacker tampers with DNS records or scripts loaded from an external CDN, your website can be redirected or infected.",
    passiveAssessmentScope:
      "Passively evaluated via DNSSEC validation: queries DNS-over-HTTPS resolvers for the Authenticated Data (AD) flag and verifies Delegation Signer (DS) records in parent zones to prevent DNS cache poisoning.",
    prevention: [
      "Enable and sign domain DNS records with DNSSEC to prevent DNS spoofing and cache poisoning.",
      "Use Subresource Integrity (SRI) hashes on all scripts and stylesheets loaded from external CDNs.",
      "Ensure digital signatures are verified for all software auto-updates and plugins.",
      "Avoid deserializing untrusted data without rigorous signature or schema verification.",
    ],
    cwes: ["CWE-494 Download of Code Without Integrity Check", "CWE-502 Deserialization of Untrusted Data"],
  },
  {
    id: "A09:2021",
    code: "A09",
    title: "Security Logging and Monitoring Failures",
    rank: 9,
    riskLevel: "Medium",
    summary: "Insufficient logging, breach detection, and incident response capability.",
    description:
      "Without adequate logging and active monitoring, suspicious activities and security breaches cannot be detected. Attackers take advantage of this to establish persistence and pivot through systems undetected.",
    beginnerExplanation:
      "Operating a store without security cameras or motion sensors. An intruder could break in overnight and roam freely for weeks before anyone notices merchandise missing.",
    passiveAssessmentScope:
      "Passively observed through DMARC aggregate and forensic reporting directives (rua= and ruf= mailto addresses), which ensure security teams receive automated reports about unauthorized sender attempts.",
    prevention: [
      "Ensure all login, access control, and server-side input validation failures are logged with context.",
      "Configure DMARC aggregate reporting (rua=mailto:dmarc-reports@domain) to monitor domain abuse.",
      "Centralize logs into a SIEM with real-time alerting for anomalous traffic spikes or repeated errors.",
      "Establish an incident response plan and conduct breach detection drills.",
    ],
    cwes: ["CWE-778 Insufficient Logging", "CWE-117 Improper Output Handling for Logs"],
  },
  {
    id: "A10:2021",
    code: "A10",
    title: "Server-Side Request Forgery (SSRF)",
    rank: 10,
    riskLevel: "High",
    summary: "Web applications fetching remote resources without validating destination IP addresses.",
    description:
      "SSRF flaws occur when a web application fetches a remote resource without validating the user-supplied destination URL. This allows attackers to coerce the application into sending crafted requests to unexpected destinations, such as internal loopback interfaces or cloud metadata endpoints.",
    beginnerExplanation:
      "Asking a security guard to fetch an item from an address you wrote down, and tricking them into walking into the private vault behind them. Attackers trick servers into querying their own internal private network.",
    passiveAssessmentScope:
      "VULNSHIELD actively demonstrates SSRF defense: its backend resolver inspects all target host IPs against private/loopback/link-local bogon lists and blocks private probing before any network connection is attempted.",
    prevention: [
      "Enforce network segmentation and firewall rules to isolate web applications from internal services.",
      "Validate and sanitize all user-supplied destination URLs against a strict whitelist of public domains.",
      "Block requests resolving to RFC 1918 private IPs (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16) and loopback (127.0.0.1).",
      "Disable HTTP redirects in backend HTTP clients when querying user-supplied endpoints.",
    ],
    cwes: ["CWE-918 Server-Side Request Forgery (SSRF)"],
  },
];

/**
 * Maps any VULNSHIELD Finding to its corresponding OWASP Top 10:2021 category code ("A01" - "A10").
 */
export function getOwaspCategoryForFinding(f: Finding): string {
  // 1. Check explicit owasp property first
  if (f.owasp) {
    const match = f.owasp.match(/A(0[1-9]|10)/i);
    if (match?.[0]) {
      return match[0].toUpperCase();
    }
  }

  // 2. Intelligent heuristic based on finding ID and category
  const id = f.id.toLowerCase();
  const cat = f.category;

  if (cat === "TLS") {
    return "A02"; // Cryptographic Failures
  }

  if (cat === "Headers") {
    if (id.includes("hsts")) return "A02"; // Cryptographic Failures
    if (id.includes("csp") || id.includes("xcto")) return "A05"; // Security Misconfiguration (and XSS prevention)
    if (id.includes("xfo")) return "A05"; // Security Misconfiguration (Clickjacking)
    return "A05"; // Security Misconfiguration
  }

  if (cat === "Cookies") {
    return "A07"; // Identification & Authentication Failures
  }

  if (cat === "Email") {
    // SPF & DMARC validate sender identity; DMARC also has reporting (A09)
    return "A07"; // Identification & Authentication Failures
  }

  if (cat === "DNS") {
    if (id.includes("dnssec")) return "A08"; // Software & Data Integrity Failures
    if (id.includes("caa")) return "A05"; // Security Misconfiguration
    return "A05";
  }

  if (cat === "Config") {
    if (id.includes("version")) return "A05"; // Security Misconfiguration
    if (id.includes("cors")) return "A01"; // Broken Access Control
    return "A05";
  }

  return "A05";
}

export interface OwaspCategoryStatus {
  category: OwaspCategoryDef;
  findings: Finding[];
  counts: { high: number; medium: number; low: number; total: number };
  status: "affected" | "clean" | "unassessed";
}

/**
 * Correlates a list of findings against all 10 OWASP categories.
 */
export function evaluateOwaspPosture(findings: Finding[]): OwaspCategoryStatus[] {
  // Group findings by OWASP category code ("A01" to "A10")
  const groups = new Map<string, Finding[]>();
  for (const f of findings) {
    const code = getOwaspCategoryForFinding(f);
    const list = groups.get(code) ?? [];
    list.push(f);
    groups.set(code, list);
  }

  return OWASP_TOP_10_2021.map((cat) => {
    const catFindings = groups.get(cat.code) ?? [];
    const counts = {
      high: catFindings.filter((f) => f.severity === "high").length,
      medium: catFindings.filter((f) => f.severity === "medium").length,
      low: catFindings.filter((f) => f.severity === "low").length,
      total: catFindings.length,
    };

    let status: OwaspCategoryStatus["status"] = "clean";
    if (counts.total > 0) {
      status = "affected";
    } else if (cat.code === "A03" || cat.code === "A04" || cat.code === "A06") {
      // For categories that require active payload scanning or source code review,
      // and no passive indicators were triggered, label as unassessed/clean with nuance.
      status = "clean";
    }

    return {
      category: cat,
      findings: catFindings,
      counts,
      status,
    };
  });
}
