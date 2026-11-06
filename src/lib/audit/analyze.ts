// Pure rules that turn observed HTTP / DNS data into checks and findings.
// No network access here, so every rule is unit-testable.

import type { CheckResult, Finding } from "../types";

const A05 = "A05:2021 Security Misconfiguration";
const A02 = "A02:2021 Cryptographic Failures";
const A07 = "A07:2021 Identification and Authentication Failures";

export interface Analysis {
  checks: CheckResult[];
  findings: Finding[];
}

type HeaderMap = Record<string, string>; // lower-cased names

export function analyzeHeaders(headers: HeaderMap): Analysis {
  const checks: CheckResult[] = [];
  const findings: Finding[] = [];
  const h = (n: string) => headers[n.toLowerCase()];

  // HSTS
  const hsts = h("strict-transport-security");
  if (!hsts) {
    checks.push({ id: "hdr-hsts", label: "Strict-Transport-Security", category: "Headers", status: "fail", detail: "Header not sent" });
    findings.push({
      id: "hdr-hsts", title: "HSTS not enabled", severity: "medium", category: "Headers", owasp: A02,
      description: "Without HSTS, a visitor's first request can be downgraded to plain HTTP and intercepted.",
      remediation: "Send Strict-Transport-Security: max-age=31536000; includeSubDomains",
    });
  } else {
    const maxAge = Number(hsts.match(/max-age=(\d+)/i)?.[1] ?? 0);
    if (maxAge < 15552000) {
      checks.push({ id: "hdr-hsts", label: "Strict-Transport-Security", category: "Headers", status: "warn", detail: `max-age=${maxAge} (< 180 days)` });
      findings.push({
        id: "hdr-hsts-short", title: "HSTS max-age is short", severity: "low", category: "Headers", owasp: A02,
        description: "A short HSTS lifetime lets browsers forget the HTTPS-only rule quickly.",
        remediation: "Raise max-age to at least 15552000 (180 days); 31536000 is common.",
        evidence: hsts,
      });
    } else {
      checks.push({ id: "hdr-hsts", label: "Strict-Transport-Security", category: "Headers", status: "pass", detail: hsts });
    }
  }

  // CSP
  const csp = h("content-security-policy");
  const cspRo = h("content-security-policy-report-only");
  if (!csp) {
    checks.push({ id: "hdr-csp", label: "Content-Security-Policy", category: "Headers", status: cspRo ? "warn" : "fail", detail: cspRo ? "Report-only mode" : "Header not sent" });
    findings.push({
      id: "hdr-csp", title: cspRo ? "CSP only in report-only mode" : "Content-Security-Policy missing",
      severity: cspRo ? "low" : "medium", category: "Headers", owasp: A05,
      description: "A CSP limits where scripts can load from, reducing the impact of cross-site scripting (XSS).",
      remediation: "Add Content-Security-Policy, e.g. default-src 'self'; object-src 'none'; frame-ancestors 'self'. Test in report-only mode first.",
    });
  } else {
    const scriptSrc = csp.match(/script-src([^;]*)/i)?.[1] ?? csp.match(/default-src([^;]*)/i)?.[1] ?? "";
    if (/'unsafe-inline'|'unsafe-eval'/.test(scriptSrc)) {
      checks.push({ id: "hdr-csp", label: "Content-Security-Policy", category: "Headers", status: "warn", detail: "Allows unsafe-inline / unsafe-eval scripts" });
      findings.push({
        id: "hdr-csp-unsafe", title: "CSP allows unsafe inline scripts", severity: "low", category: "Headers", owasp: A05,
        description: "'unsafe-inline' or 'unsafe-eval' in script sources weakens XSS protection.",
        remediation: "Replace inline scripts with nonces or hashes and remove 'unsafe-inline' / 'unsafe-eval'.",
        evidence: csp.slice(0, 200),
      });
    } else {
      checks.push({ id: "hdr-csp", label: "Content-Security-Policy", category: "Headers", status: "pass", detail: csp.slice(0, 80) });
    }
  }

  // Clickjacking
  const xfo = h("x-frame-options");
  const frameAncestors = csp && /frame-ancestors/i.test(csp);
  if (!xfo && !frameAncestors) {
    checks.push({ id: "hdr-xfo", label: "Clickjacking protection", category: "Headers", status: "fail", detail: "No X-Frame-Options or frame-ancestors" });
    findings.push({
      id: "hdr-xfo", title: "No clickjacking protection", severity: "medium", category: "Headers", owasp: A05,
      description: "The site can be embedded in a hidden frame on another site to trick users into clicking.",
      remediation: "Send X-Frame-Options: DENY (or SAMEORIGIN), or CSP frame-ancestors 'self'.",
    });
  } else {
    checks.push({ id: "hdr-xfo", label: "Clickjacking protection", category: "Headers", status: "pass", detail: xfo ? `X-Frame-Options: ${xfo}` : "CSP frame-ancestors" });
  }

  // nosniff
  const xcto = h("x-content-type-options");
  if (xcto?.toLowerCase() !== "nosniff") {
    checks.push({ id: "hdr-xcto", label: "X-Content-Type-Options", category: "Headers", status: "fail", detail: xcto ? xcto : "Header not sent" });
    findings.push({
      id: "hdr-xcto", title: "X-Content-Type-Options missing", severity: "low", category: "Headers", owasp: A05,
      description: "Browsers may MIME-sniff responses and treat uploaded files as scripts.",
      remediation: "Send X-Content-Type-Options: nosniff",
    });
  } else {
    checks.push({ id: "hdr-xcto", label: "X-Content-Type-Options", category: "Headers", status: "pass", detail: "nosniff" });
  }

  // Referrer-Policy
  const rp = h("referrer-policy");
  if (!rp || /unsafe-url/i.test(rp)) {
    checks.push({ id: "hdr-rp", label: "Referrer-Policy", category: "Headers", status: "warn", detail: rp ?? "Header not sent" });
    findings.push({
      id: "hdr-rp", title: "Referrer-Policy missing or permissive", severity: "low", category: "Headers",
      description: "Full URLs (which may contain tokens) can leak to third-party sites through the Referer header.",
      remediation: "Send Referrer-Policy: strict-origin-when-cross-origin",
    });
  } else {
    checks.push({ id: "hdr-rp", label: "Referrer-Policy", category: "Headers", status: "pass", detail: rp });
  }

  // Permissions-Policy
  const pp = h("permissions-policy");
  if (!pp) {
    checks.push({ id: "hdr-pp", label: "Permissions-Policy", category: "Headers", status: "warn", detail: "Header not sent" });
    findings.push({
      id: "hdr-pp", title: "Permissions-Policy missing", severity: "low", category: "Headers",
      description: "Embedded content could request powerful browser features like camera or geolocation.",
      remediation: "Send Permissions-Policy, e.g. camera=(), microphone=(), geolocation=()",
    });
  } else {
    checks.push({ id: "hdr-pp", label: "Permissions-Policy", category: "Headers", status: "pass", detail: pp.slice(0, 80) });
  }

  // Version disclosure
  const disclosed = ["server", "x-powered-by", "x-aspnet-version", "x-aspnetmvc-version"]
    .map((n) => [n, h(n)] as const)
    .filter(([, v]) => v && /\d/.test(v));
  if (disclosed.length) {
    const ev = disclosed.map(([n, v]) => `${n}: ${v}`).join(" · ");
    checks.push({ id: "cfg-version", label: "Software version disclosure", category: "Config", status: "warn", detail: ev });
    findings.push({
      id: "cfg-version", title: "Server software version disclosed", severity: "low", category: "Config", owasp: A05,
      description: "Exact version numbers help attackers look up known vulnerabilities for your stack.",
      remediation: "Remove or genericise Server / X-Powered-By headers in your web server or framework config.",
      evidence: ev,
    });
  } else {
    checks.push({ id: "cfg-version", label: "Software version disclosure", category: "Config", status: "pass", detail: "No version numbers in headers" });
  }

  // CORS
  const acao = h("access-control-allow-origin");
  const acac = h("access-control-allow-credentials");
  if (acao === "*" && acac?.toLowerCase() === "true") {
    checks.push({ id: "cfg-cors", label: "CORS policy", category: "Config", status: "fail", detail: "Wildcard origin with credentials" });
    findings.push({
      id: "cfg-cors", title: "Permissive CORS with credentials", severity: "medium", category: "Config", owasp: A05,
      description: "Any website may be able to make credentialed requests and read responses.",
      remediation: "Return an explicit allow-list of trusted origins instead of *.",
    });
  } else {
    checks.push({ id: "cfg-cors", label: "CORS policy", category: "Config", status: "pass", detail: acao ? `Allow-Origin: ${acao}` : "No CORS headers on homepage" });
  }

  return { checks, findings };
}

export function analyzeCookies(setCookies: string[]): Analysis {
  if (setCookies.length === 0) {
    return {
      checks: [{ id: "ck-flags", label: "Cookie security flags", category: "Cookies", status: "pass", detail: "No cookies set on homepage" }],
      findings: [],
    };
  }
  const noSecure: string[] = [];
  const noHttpOnly: string[] = [];
  const noSameSite: string[] = [];
  for (const c of setCookies) {
    const name = c.split("=")[0]?.trim() ?? "cookie";
    const attrs = c.toLowerCase();
    if (!/;\s*secure/.test(attrs)) noSecure.push(name);
    if (!/;\s*httponly/.test(attrs)) noHttpOnly.push(name);
    if (!/;\s*samesite=/.test(attrs)) noSameSite.push(name);
  }
  const findings: Finding[] = [];
  if (noSecure.length)
    findings.push({
      id: "ck-secure", title: "Cookies without Secure flag", severity: "medium", category: "Cookies", owasp: A07,
      description: "These cookies can be sent over unencrypted HTTP connections.",
      remediation: "Add the Secure attribute to every cookie.", evidence: noSecure.join(", "),
    });
  if (noHttpOnly.length)
    findings.push({
      id: "ck-httponly", title: "Cookies readable by JavaScript", severity: "low", category: "Cookies", owasp: A07,
      description: "Without HttpOnly, an XSS bug can steal these cookies. Fine for non-sensitive cookies; required for session cookies.",
      remediation: "Add HttpOnly to session and authentication cookies.", evidence: noHttpOnly.join(", "),
    });
  if (noSameSite.length)
    findings.push({
      id: "ck-samesite", title: "Cookies without SameSite", severity: "low", category: "Cookies", owasp: A07,
      description: "Missing SameSite relies on browser defaults for cross-site request protection.",
      remediation: "Set SameSite=Lax (or Strict) explicitly.", evidence: noSameSite.join(", "),
    });
  const status = noSecure.length ? "fail" : findings.length ? "warn" : "pass";
  return {
    checks: [{
      id: "ck-flags", label: "Cookie security flags", category: "Cookies", status,
      detail: `${setCookies.length} cookie(s)` + (findings.length ? ` · ${findings.length} issue type(s)` : " · all flags set"),
    }],
    findings,
  };
}

export function analyzeSpf(txt: string[]): Analysis {
  const spf = txt.filter((t) => /^v=spf1/i.test(t));
  if (spf.length === 0)
    return {
      checks: [{ id: "em-spf", label: "SPF record", category: "Email", status: "fail", detail: "No SPF record" }],
      findings: [{
        id: "em-spf", title: "No SPF record", severity: "medium", category: "Email",
        description: "Anyone can send email that claims to come from this domain.",
        remediation: "Publish a TXT record like: v=spf1 include:<your-mail-provider> -all (or v=spf1 -all if the domain sends no mail).",
      }],
    };
  if (spf.length > 1)
    return {
      checks: [{ id: "em-spf", label: "SPF record", category: "Email", status: "fail", detail: "Multiple SPF records" }],
      findings: [{
        id: "em-spf-multi", title: "Multiple SPF records", severity: "medium", category: "Email",
        description: "More than one SPF record makes SPF evaluation fail (permerror).",
        remediation: "Merge them into a single v=spf1 record.", evidence: spf.join(" | "),
      }],
    };
  const rec = spf[0] ?? "";
  if (/[+?]all\b/i.test(rec) || !/all\b/i.test(rec))
    return {
      checks: [{ id: "em-spf", label: "SPF record", category: "Email", status: "warn", detail: rec.slice(0, 80) }],
      findings: [{
        id: "em-spf-weak", title: "SPF policy does not reject unknown senders", severity: "low", category: "Email",
        description: "The SPF record ends with +all, ?all or no 'all' mechanism, so spoofed mail isn't rejected.",
        remediation: "End the record with -all (or ~all while testing).", evidence: rec,
      }],
    };
  return { checks: [{ id: "em-spf", label: "SPF record", category: "Email", status: "pass", detail: rec.slice(0, 80) }], findings: [] };
}

export function analyzeDmarc(txt: string[]): Analysis {
  const rec = txt.find((t) => /^v=DMARC1/i.test(t));
  if (!rec)
    return {
      checks: [{ id: "em-dmarc", label: "DMARC policy", category: "Email", status: "fail", detail: "No DMARC record" }],
      findings: [{
        id: "em-dmarc", title: "No DMARC record", severity: "medium", category: "Email",
        description: "Receivers get no instruction on what to do with mail that fails SPF/DKIM, enabling spoofing.",
        remediation: "Publish TXT at _dmarc.<domain>: v=DMARC1; p=quarantine; rua=mailto:dmarc@<domain>",
      }],
    };
  const p = rec.match(/;\s*p=([a-z]+)/i)?.[1]?.toLowerCase() ?? "none";
  if (p === "none")
    return {
      checks: [{ id: "em-dmarc", label: "DMARC policy", category: "Email", status: "warn", detail: "p=none (monitor only)" }],
      findings: [{
        id: "em-dmarc-none", title: "DMARC policy set to p=none", severity: "low", category: "Email",
        description: "Spoofed messages are reported but still delivered.",
        remediation: "After reviewing reports, move to p=quarantine and then p=reject.", evidence: rec,
      }],
    };
  return { checks: [{ id: "em-dmarc", label: "DMARC policy", category: "Email", status: "pass", detail: `p=${p}` }], findings: [] };
}

export function analyzeCaa(records: string[], foundAt: string | null): Analysis {
  if (records.length === 0)
    return {
      checks: [{ id: "dns-caa", label: "CAA record", category: "DNS", status: "fail", detail: "None published" }],
      findings: [{
        id: "dns-caa", title: "No CAA record published", severity: "low", category: "DNS",
        description: "Any certificate authority may issue TLS certificates for this domain.",
        remediation: 'Publish a CAA record naming only the CA(s) you use, e.g. 0 issue "letsencrypt.org".',
      }],
    };
  return {
    checks: [{ id: "dns-caa", label: "CAA record", category: "DNS", status: "pass", detail: `${records.length} record(s) at ${foundAt}` }],
    findings: [],
  };
}
