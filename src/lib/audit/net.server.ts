// Server-only networking helpers for passive audits: timeouts, DNS-over-HTTPS,
// SSRF guard and a best-effort rate limiter.

import { isNonPublicIp, normalizeTarget } from "./url";

export const USER_AGENT = "VulnShield-PassiveAudit/0.1 (authorised, non-intrusive security check)";

export async function fetchWithTimeout(url: string, init: RequestInit = {}, ms = 10_000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      ...init,
      signal: ctrl.signal,
      headers: { "user-agent": USER_AGENT, ...(init.headers as Record<string, string> | undefined) },
    });
  } finally {
    clearTimeout(t);
  }
}

export interface DohAnswer {
  name: string;
  type: number;
  data: string;
}
export interface DohResponse {
  status: number; // 0 = NOERROR, 3 = NXDOMAIN
  ad: boolean; // DNSSEC-validated by resolver
  answers: DohAnswer[];
}

const RESOLVERS = ["https://cloudflare-dns.com/dns-query", "https://dns.google/resolve"];

export const RR = { A: 1, NS: 2, CNAME: 5, MX: 15, TXT: 16, AAAA: 28, DS: 43, CAA: 257 } as const;

/** DNS lookup through a public DNS-over-HTTPS resolver (with fallback). */
export async function doh(name: string, type: keyof typeof RR): Promise<DohResponse> {
  let lastErr: unknown;
  for (const base of RESOLVERS) {
    try {
      const res = await fetchWithTimeout(
        `${base}?name=${encodeURIComponent(name)}&type=${type}&do=true`,
        { headers: { accept: "application/dns-json" } },
        5_000,
      );
      if (!res.ok) throw new Error(`resolver ${res.status}`);
      const j = (await res.json()) as { Status: number; AD?: boolean; Answer?: DohAnswer[] };
      return {
        status: j.Status,
        ad: Boolean(j.AD),
        answers: (j.Answer ?? []).filter((a) => a.type === RR[type]),
      };
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`DNS lookup failed for ${name} (${type})`, { cause: lastErr });
}

export const unquoteTxt = (data: string) =>
  data
    .match(/"((?:[^"\\]|\\.)*)"/g)
    ?.map((s) => s.slice(1, -1))
    .join("") ?? data;

/**
 * SSRF guard: the host must be a valid public domain whose every A/AAAA
 * address is public. Returns the resolved addresses.
 */
export async function assertPublicHost(host: string): Promise<string[]> {
  const v = normalizeTarget(host);
  if (!v.ok) throw new Error(v.error);
  const [a, aaaa] = await Promise.all([doh(v.host, "A"), doh(v.host, "AAAA")]);
  if (a.status === 3) throw new Error(`${v.host} does not exist (NXDOMAIN).`);
  const ips = [...a.answers, ...aaaa.answers].map((x) => x.data);
  if (ips.length === 0) throw new Error(`${v.host} has no A/AAAA records, so it can't be reached.`);
  if (ips.some(isNonPublicIp)) throw new Error(`${v.host} resolves to a private or reserved address — blocked.`);
  return ips;
}

// Best-effort, per-server-instance rate limiter (sliding window).
const hits = new Map<string, number[]>();
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (list.length >= max) {
    const wait = Math.ceil((windowMs - (now - (list[0] ?? now))) / 1000);
    throw new Error(`Rate limit reached — please wait ${wait}s before scanning again.`);
  }
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) hits.clear();
}

export function describeFetchError(e: unknown): string {
  if (e instanceof Error) {
    if (e.name === "AbortError") return "timed out after 10s";
    const cause = (e as Error & { cause?: { code?: string; message?: string } }).cause;
    if (cause?.code) return cause.code;
    if (cause?.message) return cause.message.slice(0, 120);
    return e.message.slice(0, 120);
  }
  return "unknown error";
}
