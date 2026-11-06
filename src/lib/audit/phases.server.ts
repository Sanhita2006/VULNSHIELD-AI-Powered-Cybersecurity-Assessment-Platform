// The four passive audit phases. Each makes a small, bounded number of
// ordinary requests (≤ 6 concurrent) — no payloads, no crawling, no fuzzing.

import { analyzeCaa, analyzeCookies, analyzeDmarc, analyzeHeaders, analyzeSpf } from "./analyze";
import { assertPublicHost, describeFetchError, doh, fetchWithTimeout, unquoteTxt } from "./net.server";
import { domainAncestors, mailDomain } from "./url";
import type { CertificateInfo, CheckResult, DnsRecordSet, Finding, PhaseResult } from "../types";

type Log = PhaseResult["log"];
const now = () => new Date().toISOString();
const logger = (log: Log, source: string) => (level: Log[number]["level"], message: string) =>
  log.push({ at: now(), level, source, message });

/* ---------------------------------------------------------- precheck */

export async function precheckPhase(host: string): Promise<PhaseResult> {
  const log: Log = [];
  const L = logger(log, "resolve");
  L("info", `Resolving ${host} via DNS-over-HTTPS…`);
  const ips = await assertPublicHost(host);
  L("ok", `Resolved ${ips.length} public address(es): ${ips.slice(0, 4).join(", ")}`);
  return { checks: [], findings: [], log, details: { host, resolvedIps: ips } };
}

/* -------------------------------------------------------------- http */

const MAX_REDIRECTS = 5;

async function followRedirects(start: string, L: ReturnType<typeof logger>) {
  const chain: string[] = [start];
  let url = start;
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const res = await fetchWithTimeout(url, { method: "GET", redirect: "manual" });
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      void res.body?.cancel();
      const next = new URL(loc, url).toString();
      const nextHost = new URL(next).hostname;
      if (nextHost !== new URL(url).hostname) await assertPublicHost(nextHost);
      L("info", `${res.status} → ${next}`);
      chain.push(next);
      url = next;
      continue;
    }
    return { res, chain, finalUrl: url };
  }
  throw new Error("Too many redirects");
}

export async function httpPhase(host: string): Promise<PhaseResult> {
  const log: Log = [];
  const L = logger(log, "https");
  const checks: CheckResult[] = [];
  const findings: Finding[] = [];
  const details: PhaseResult["details"] = { redirectChain: [], responseHeaders: [] };

  // 1. HTTP → HTTPS redirect
  const LH = logger(log, "redirect");
  try {
    LH("info", `GET http://${host}/ (redirect handling: manual)`);
    const res = await fetchWithTimeout(`http://${host}/`, { redirect: "manual" });
    void res.body?.cancel();
    const loc = res.headers.get("location") ?? "";
    if (res.status >= 300 && res.status < 400 && loc.startsWith("https://")) {
      checks.push({ id: "tls-redirect", label: "HTTP → HTTPS redirect", category: "TLS", status: "pass", detail: `${res.status} → ${loc.slice(0, 60)}` });
      LH("ok", `HTTP redirects to HTTPS (${res.status})`);
    } else {
      checks.push({ id: "tls-redirect", label: "HTTP → HTTPS redirect", category: "TLS", status: "fail", detail: `HTTP ${res.status}${loc ? ` → ${loc.slice(0, 50)}` : ", no redirect"}` });
      findings.push({
        id: "tls-redirect", title: "Plain HTTP is not redirected to HTTPS", severity: "medium", category: "TLS", owasp: "A02:2021 Cryptographic Failures",
        description: "Visitors who type the address without https:// stay on an unencrypted connection.",
        remediation: "Return a 301 redirect from http:// to https:// for every path.",
      });
      LH("warn", `HTTP did not redirect to HTTPS (status ${res.status})`);
    }
  } catch (e) {
    checks.push({ id: "tls-redirect", label: "HTTP → HTTPS redirect", category: "TLS", status: "unavailable", detail: `Port 80 not reachable (${describeFetchError(e)})` });
    LH("info", `Port 80 not reachable — redirect check unavailable`);
  }

  // 2. HTTPS reachability + certificate trust + headers
  let res: Response;
  try {
    L("info", `GET https://${host}/ — validating certificate chain`);
    const r = await followRedirects(`https://${host}/`, L);
    res = r.res;
    details.redirectChain = r.chain;
    details.finalUrl = r.finalUrl;
    details.httpStatus = res.status;
    void res.body?.cancel();
  } catch (e) {
    const why = describeFetchError(e);
    checks.push({ id: "tls-https", label: "HTTPS reachable & certificate trusted", category: "TLS", status: "fail", detail: why });
    findings.push({
      id: "tls-https", title: "HTTPS connection failed", severity: "high", category: "TLS", owasp: "A02:2021 Cryptographic Failures",
      description: `A secure connection to https://${host}/ could not be established (${why}). This usually means HTTPS isn't configured, or the certificate is expired, self-signed or for a different name.`,
      remediation: "Install a valid certificate from a trusted CA (e.g. Let's Encrypt) covering this hostname and serve the site on port 443.",
    });
    for (const id of ["Security headers", "Cookie security flags"])
      checks.push({ id: `na-${id}`, label: id, category: "Headers", status: "unavailable", detail: "Skipped — no HTTPS response" });
    L("alert", `HTTPS failed: ${why}`);
    return { checks, findings, log, details };
  }

  const finalProto = new URL(details.finalUrl ?? "").protocol;
  if (finalProto !== "https:") {
    findings.push({
      id: "tls-downgrade", title: "HTTPS redirects back to plain HTTP", severity: "high", category: "TLS", owasp: "A02:2021 Cryptographic Failures",
      description: "The final page is served over unencrypted HTTP after starting on HTTPS.",
      remediation: "Remove redirects that point to http:// URLs.", evidence: details.redirectChain?.join(" → "),
    });
    L("alert", "Redirect chain downgrades to HTTP");
  }
  checks.push({ id: "tls-https", label: "HTTPS reachable & certificate trusted", category: "TLS", status: "pass", detail: `HTTP ${res.status} · chain validated by server TLS client` });
  L("ok", `HTTPS OK (${res.status}) · certificate trusted`);

  const headerMap: Record<string, string> = {};
  res.headers.forEach((v, k) => {
    if (k !== "set-cookie") headerMap[k] = v;
  });
  const setCookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  details.responseHeaders = [
    ...Object.entries(headerMap),
    ...setCookies.map((c) => ["set-cookie", `${c.split("=")[0]}=… ${c.split(";").slice(1).join(";").trim()}`] as [string, string]),
  ];

  const LS = logger(log, "headers");
  const hdr = analyzeHeaders(headerMap);
  for (const c of hdr.checks) LS(c.status === "pass" ? "ok" : c.status === "fail" ? "alert" : "warn", `${c.label}: ${c.detail}`);
  const ck = analyzeCookies(setCookies);
  for (const c of ck.checks) logger(log, "cookies")(c.status === "pass" ? "ok" : "warn", `${c.label}: ${c.detail}`);

  return { checks: [...checks, ...hdr.checks, ...ck.checks], findings: [...findings, ...hdr.findings, ...ck.findings], log, details };
}

/* --------------------------------------------------------------- tls */

interface CertSpotterIssuance {
  dns_names?: string[];
  issuer?: { name?: string; friendly_name?: string };
  not_before: string;
  not_after: string;
  revoked?: boolean;
}

const covers = (names: string[], host: string) =>
  names.some((n) => n === host || (n.startsWith("*.") && host.endsWith(n.slice(1)) && host.split(".").length === n.split(".").length));

export async function tlsPhase(host: string): Promise<PhaseResult> {
  const log: Log = [];
  const L = logger(log, "cert");
  const checks: CheckResult[] = [];
  const findings: Finding[] = [];
  let certificate: CertificateInfo | undefined;

  L("info", "Querying public Certificate Transparency logs…");
  try {
    const res = await fetchWithTimeout(
      `https://api.certspotter.com/v1/issuances?domain=${encodeURIComponent(host)}&expand=dns_names&expand=issuer`,
      { headers: { accept: "application/json" } },
      10_000,
    );
    if (!res.ok) throw new Error(`CT log service returned ${res.status}`);
    const list = (await res.json()) as CertSpotterIssuance[];
    const t = Date.now();
    const current = list
      .filter((c) => !c.revoked && covers(c.dns_names ?? [], host) && Date.parse(c.not_after) > t && Date.parse(c.not_before) <= t)
      .sort((a, b) => Date.parse(b.not_before) - Date.parse(a.not_before))[0];

    if (!current) {
      checks.push({ id: "tls-cert", label: "Certificate details (CT logs)", category: "TLS", status: "unavailable", detail: "No current certificate for this exact name found in CT logs" });
      L("info", "No matching current certificate in CT logs");
    } else {
      const days = Math.floor((Date.parse(current.not_after) - t) / 86_400_000);
      certificate = {
        source: "ct-logs",
        commonName: (current.dns_names ?? []).slice(0, 3).join(", "),
        issuer: current.issuer?.friendly_name ?? current.issuer?.name ?? "Unknown",
        notBefore: current.not_before,
        notAfter: current.not_after,
        daysRemaining: days,
      };
      const status = days < 7 ? "fail" : days < 21 ? "warn" : "pass";
      checks.push({ id: "tls-cert", label: "Certificate validity window", category: "TLS", status, detail: `${certificate.issuer} · ${days} days left` });
      if (days < 21)
        findings.push({
          id: "tls-expiry", title: `Latest certificate expires in ${days} days`, severity: days < 7 ? "high" : "medium", category: "TLS",
          description: "Based on the newest certificate in public CT logs. Expired certificates make browsers block the site. If auto-renewal is set up, a newer certificate may simply not be logged yet.",
          remediation: "Confirm automatic renewal (e.g. certbot / your host) is working, or renew now.",
          evidence: `notAfter ${current.not_after}`,
        });
      L(status === "pass" ? "ok" : "warn", `Issuer ${certificate.issuer} · expires ${current.not_after.slice(0, 10)} (${days}d)`);
    }
  } catch (e) {
    checks.push({ id: "tls-cert", label: "Certificate details (CT logs)", category: "TLS", status: "unavailable", detail: `CT lookup failed (${describeFetchError(e)})` });
    L("warn", "Certificate Transparency lookup unavailable");
  }

  checks.push({
    id: "tls-proto", label: "TLS protocol versions & ciphers", category: "TLS", status: "unavailable",
    detail: "Requires a raw TLS handshake probe — not supported by this scanner",
  });
  L("info", "TLS version/cipher enumeration: unavailable in passive mode");

  return { checks, findings, log, details: certificate ? { certificate } : {} };
}

/* --------------------------------------------------------------- dns */

const DKIM_SELECTORS = ["default", "google", "selector1", "selector2", "k1", "s1", "dkim", "mail"];

async function inChunks<T, R>(items: T[], size: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) out.push(...(await Promise.all(items.slice(i, i + size).map(fn))));
  return out;
}

export async function dnsPhase(host: string): Promise<PhaseResult> {
  const log: Log = [];
  const L = logger(log, "dns");
  const LM = logger(log, "mail");
  const checks: CheckResult[] = [];
  const findings: Finding[] = [];
  const dns: DnsRecordSet[] = [];
  const md = mailDomain(host);
  const rec = (type: string, name: string, values: string[]) => values.length && dns.push({ type, name, values });

  L("info", `Querying A/AAAA/NS/MX/TXT for ${host}${md !== host ? ` and ${md}` : ""}`);
  const [a, aaaa, ns, mx, txt, dmarc] = await Promise.all([
    doh(host, "A"),
    doh(host, "AAAA"),
    doh(md, "NS"),
    doh(md, "MX"),
    doh(md, "TXT"),
    doh(`_dmarc.${md}`, "TXT"),
  ]);
  rec("A", host, a.answers.map((x) => x.data));
  rec("AAAA", host, aaaa.answers.map((x) => x.data));
  rec("NS", md, ns.answers.map((x) => x.data));
  rec("MX", md, mx.answers.map((x) => x.data));
  const txtValues = txt.answers.map((x) => unquoteTxt(x.data));
  rec("TXT", md, txtValues);
  const dmarcValues = dmarc.answers.map((x) => unquoteTxt(x.data));
  rec("TXT", `_dmarc.${md}`, dmarcValues);
  L("ok", `A ${a.answers.length} · AAAA ${aaaa.answers.length} · NS ${ns.answers.length} · MX ${mx.answers.length} · TXT ${txtValues.length}`);

  // DNSSEC
  if (a.ad) {
    checks.push({ id: "dns-dnssec", label: "DNSSEC", category: "DNS", status: "pass", detail: "Answers validated by resolver (AD flag)" });
    L("ok", "DNSSEC: signatures validated");
  } else {
    const apex = domainAncestors(md).at(-1) ?? md;
    const ds = await doh(apex, "DS");
    if (ds.answers.length) {
      checks.push({ id: "dns-dnssec", label: "DNSSEC", category: "DNS", status: "fail", detail: "DS record exists but answers are not validated" });
      findings.push({
        id: "dns-dnssec", title: "DNSSEC appears misconfigured", severity: "medium", category: "DNS",
        description: "The parent zone publishes a DS record, but resolvers could not validate this domain's answers.",
        remediation: "Check DNSKEY/DS key tags at your DNS provider and registrar; re-sign the zone if needed.",
      });
      L("alert", "DS present but validation failed");
    } else {
      checks.push({ id: "dns-dnssec", label: "DNSSEC", category: "DNS", status: "unsupported", detail: "Zone is not DNSSEC-signed (optional hardening)" });
      L("info", "DNSSEC not enabled for this zone");
    }
  }

  // CAA tree-climbing
  let caa: string[] = [];
  let caaAt: string | null = null;
  for (const name of domainAncestors(host)) {
    const r = await doh(name, "CAA");
    if (r.answers.length) {
      caa = r.answers.map((x) => x.data);
      caaAt = name;
      break;
    }
  }
  if (caaAt) rec("CAA", caaAt, caa);
  const caaA = analyzeCaa(caa, caaAt);
  L(caa.length ? "ok" : "warn", caa.length ? `CAA: ${caa.join(" | ").slice(0, 90)}` : "No CAA record — any CA may issue");

  // Email
  const spfA = analyzeSpf(txtValues);
  const dmarcA = analyzeDmarc(dmarcValues);
  for (const c of [...spfA.checks, ...dmarcA.checks]) LM(c.status === "pass" ? "ok" : "warn", `${c.label}: ${c.detail}`);

  LM("info", `Probing ${DKIM_SELECTORS.length} common DKIM selectors…`);
  const dkim = await inChunks(DKIM_SELECTORS, 6, async (s) => {
    try {
      const r = await doh(`${s}._domainkey.${md}`, "TXT");
      const v = r.answers.map((x) => unquoteTxt(x.data)).find((t) => /v=DKIM1|p=/i.test(t));
      return v ? s : null;
    } catch {
      return null;
    }
  });
  const found = dkim.filter(Boolean) as string[];
  if (found.length) {
    checks.push({ id: "em-dkim", label: "DKIM selector", category: "Email", status: "pass", detail: `Key found at: ${found.join(", ")}` });
    LM("ok", `DKIM key found (${found.join(", ")})`);
  } else {
    checks.push({
      id: "em-dkim", label: "DKIM selector", category: "Email", status: "unavailable",
      detail: "No key at common selectors — DKIM selectors are private, so absence can't be confirmed",
    });
    LM("info", "DKIM: not found at common selectors (cannot confirm absence)");
  }

  return {
    checks: [...checks, ...caaA.checks, ...spfA.checks, ...dmarcA.checks],
    findings: [...findings, ...caaA.findings, ...spfA.findings, ...dmarcA.findings],
    log,
    details: { dns, dnssecValidated: a.ad },
  };
}
