// Website Audit API — one server function per scan phase so the browser can
// show real, phase-by-phase progress. Every call re-validates the target,
// requires the ownership confirmation and is rate-limited.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { normalizeTarget } from "./audit/url";
import type { PhaseResult } from "./types";

const AuditInput = z.object({
  url: z.string().min(1).max(2048),
  consent: z.literal(true, {
    errorMap: () => ({ message: "You must confirm you own or are authorised to test this website." }),
  }),
});

async function guard(url: string, phase: string): Promise<string> {
  const v = normalizeTarget(url);
  if (!v.ok) throw new Error(v.error);
  const { getRequestIP } = await import("@tanstack/react-start/server");
  const { rateLimit } = await import("./audit/net.server");
  const ip = getRequestIP({ xForwardedFor: true }) ?? "unknown";
  rateLimit(`ip:${ip}:${phase}`, 8, 10 * 60_000); // 8 scans / 10 min per visitor
  rateLimit(`host:${v.host}:${phase}`, 1, 15_000); // 1 scan / 15 s per target
  return v.host;
}

export const auditPrecheck = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AuditInput.parse(d))
  .handler(async ({ data }): Promise<PhaseResult> => {
    const host = await guard(data.url, "pre");
    const { precheckPhase } = await import("./audit/phases.server");
    return precheckPhase(host);
  });

export const auditHttp = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AuditInput.parse(d))
  .handler(async ({ data }): Promise<PhaseResult> => {
    const host = await guard(data.url, "http");
    const { httpPhase, } = await import("./audit/phases.server");
    const { assertPublicHost } = await import("./audit/net.server");
    await assertPublicHost(host);
    return httpPhase(host);
  });

export const auditTls = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AuditInput.parse(d))
  .handler(async ({ data }): Promise<PhaseResult> => {
    const host = await guard(data.url, "tls");
    const { tlsPhase } = await import("./audit/phases.server");
    return tlsPhase(host);
  });

export const auditDns = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => AuditInput.parse(d))
  .handler(async ({ data }): Promise<PhaseResult> => {
    const host = await guard(data.url, "dns");
    const { dnsPhase } = await import("./audit/phases.server");
    return dnsPhase(host);
  });
