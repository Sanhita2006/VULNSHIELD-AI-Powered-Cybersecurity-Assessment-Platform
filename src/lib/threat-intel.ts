/*
 * Threat Intelligence library – provides IP and Domain reputation look‑ups.
 * Uses free public APIs when an API key is supplied, otherwise falls back to
 * demo data. The consumer must differentiate between live data (when an API
 * key is present) and demo data (no key).
 */

export type Reputation = "malicious" | "suspicious" | "clean";

export interface ThreatDetail {
  /** Human readable description of the finding */
  description: string;
  /** Source of the intelligence (e.g., "AbuseIPDB", "IPInfo", "Demo") */
  source: string;
  /** Confidence score from 0‑100 (higher is more confident) */
  confidence: number;
  /** ISO timestamp of the last update from the source */
  lastUpdated: string;
  /** Classification based on the source data */
  reputation: Reputation;
}

/**
 * Checks an IPv4/IPv6 address for reputation.
 *
 * If `ABUSEIPDB_API_KEY` is defined in the environment, the function calls the
 * AbuseIPDB API (free tier – 1 000 requests/day). Otherwise a deterministic demo
 * record is returned. The demo data mirrors the shape of the live response so the
 * UI can treat both uniformly.
 */
export async function checkIPReputation(ip: string): Promise<ThreatDetail> {
  const apiKey = process.env.ABUSEIPDB_API_KEY;
  if (apiKey) {
    const url = `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(
      ip,
    )}&maxAgeInDays=90`;
    const resp = await fetch(url, {
      headers: {
        Key: apiKey,
        Accept: "application/json",
      },
    });
    if (!resp.ok) {
      throw new Error(`AbuseIPDB request failed: ${resp.status}`);
    }
    const data = (await resp.json()) as any;
    const { abuseConfidenceScore, countryCode, isWhitelisted, domain } = data.data;
    const reputation: Reputation =
      abuseConfidenceScore >= 75
        ? "malicious"
        : abuseConfidenceScore >= 40
          ? "suspicious"
          : "clean";
    return {
      description: `Abuse confidence ${abuseConfidenceScore}% – ${reputation}`,
      source: "AbuseIPDB",
      confidence: abuseConfidenceScore,
      lastUpdated: data.data.lastReportedAt ?? new Date().toISOString(),
      reputation,
    };
  }

  // ---- Demo fallback -----------------------------------------------------
  // Deterministic demo data based on the IP string – useful for UI testing.
  const hash = [...ip].reduce((a, c) => a + c.charCodeAt(0), 0);
  const reputation: Reputation = hash % 3 === 0 ? "malicious" : hash % 3 === 1 ? "suspicious" : "clean";
  return {
    description: `Demo data – IP appears ${reputation}`,
    source: "Demo",
    confidence: reputation === "malicious" ? 90 : reputation === "suspicious" ? 60 : 10,
    lastUpdated: new Date().toISOString(),
    reputation,
  };
}

/**
 * Checks a domain name for reputation.
 *
 * Uses the free IPInfo API (no key required for basic look‑ups) to resolve the
 * domain to an IP and then re‑uses `checkIPReputation`. When a key for AbuseIPDB
 * is present the IP reputation will be live; otherwise the demo fallback is
 * used.
 */
export async function checkDomainReputation(domain: string): Promise<ThreatDetail> {
  // Resolve domain to an IP using a public DNS‑over‑HTTPS endpoint.
  try {
    const dnsResp = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=A`,
    );
    if (dnsResp.ok) {
      const dnsData = (await dnsResp.json()) as any;
      const ip = dnsData.Answer?.[0]?.data;
      if (ip) {
        // Re‑use the IP reputation routine – it will be live if an API key is set.
        const ipReport = await checkIPReputation(ip);
        return { ...ipReport, description: `Domain resolved to ${ip} – ${ipReport.description}` };
      }
    }
  } catch (_) {
    // Swallow errors – fall back to demo data.
  }

  // ---- Demo fallback -----------------------------------------------------
  const hash = [...domain].reduce((a, c) => a + c.charCodeAt(0), 0);
  const reputation: Reputation = hash % 3 === 0 ? "malicious" : hash % 3 === 1 ? "suspicious" : "clean";
  return {
    description: `Demo data – domain appears ${reputation}`,
    source: "Demo",
    confidence: reputation === "malicious" ? 85 : reputation === "suspicious" ? 55 : 5,
    lastUpdated: new Date().toISOString(),
    reputation,
  };
}
