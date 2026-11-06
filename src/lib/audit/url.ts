// Target validation shared by the browser (instant feedback) and the server
// (authoritative check). Only public hostnames on default ports are allowed.

export type TargetResult = { ok: true; host: string; url: string } | { ok: false; error: string };

const BLOCKED_SUFFIXES = [
  "localhost",
  ".localhost",
  ".local",
  ".internal",
  ".lan",
  ".home",
  ".corp",
  ".test",
  ".example",
  ".invalid",
  ".onion",
  ".arpa",
];

const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;

export function normalizeTarget(raw: string): TargetResult {
  const input = raw.trim();
  if (!input) return { ok: false, error: "Enter a website URL." };
  if (input.length > 2048) return { ok: false, error: "URL is too long." };

  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(input) ? input : `https://${input}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { ok: false, error: "That doesn't look like a valid URL." };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:")
    return { ok: false, error: "Only http:// and https:// URLs can be audited." };
  if (url.username || url.password) return { ok: false, error: "URLs with credentials are not allowed." };
  if (url.port) return { ok: false, error: "Custom ports are not scanned — use the site's standard address." };

  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (host.includes(":") || host.startsWith("["))
    return { ok: false, error: "IP addresses are not accepted — enter a domain name." };
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || /^[0-9.]+$/.test(host))
    return { ok: false, error: "IP addresses are not accepted — enter a domain name." };
  if (host.length > 253) return { ok: false, error: "Domain name is too long." };
  if (BLOCKED_SUFFIXES.some((s) => host === s.replace(/^\./, "") || host.endsWith(s)))
    return { ok: false, error: "Local, internal or reserved domains cannot be scanned." };

  const labels = host.split(".");
  if (labels.length < 2) return { ok: false, error: "Enter a full domain name, e.g. example.org." };
  if (!labels.every((l) => LABEL.test(l))) return { ok: false, error: "Domain contains invalid characters." };
  const tld = labels.at(-1) ?? "";
  if (/^\d+$/.test(tld)) return { ok: false, error: "Enter a valid domain name." };

  return { ok: true, host, url: `https://${host}/` };
}

/** Email/DNS policy domain: drop a leading "www." */
export function mailDomain(host: string): string {
  return host.startsWith("www.") ? host.slice(4) : host;
}

/** Ancestors used for CAA tree-climbing: a.b.example.org → [a.b.example.org, b.example.org, example.org] */
export function domainAncestors(host: string): string[] {
  const parts = host.split(".");
  const out: string[] = [];
  for (let i = 0; i <= parts.length - 2; i++) out.push(parts.slice(i).join("."));
  return out;
}

/** True for loopback, private, link-local, CGNAT, multicast and reserved addresses. */
export function isNonPublicIp(ip: string): boolean {
  const v4 = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  if (v6 === "::" || v6 === "::1") return true;
  if (v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80") || v6.startsWith("ff")) return true;
  const mapped = v6.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped?.[1]) return isNonPublicIp(mapped[1]);
  return false;
}
