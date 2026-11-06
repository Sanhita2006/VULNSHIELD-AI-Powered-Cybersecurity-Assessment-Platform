// Shared domain types for VULNSHIELD. Both real scan results and the
// simulated demo dataset use these exact shapes, so every UI component
// works with either source.

export type Severity = "high" | "medium" | "low";

/**
 * pass / warn / fail — check ran and produced a verdict.
 * unsupported — the target doesn't use the feature (e.g. DNSSEC not signed).
 * unavailable — VULNSHIELD could not perform this check (shown, never scored).
 */
export type CheckStatus = "pass" | "warn" | "fail" | "unsupported" | "unavailable";

export type FindingCategory = "TLS" | "Headers" | "DNS" | "Email" | "Cookies" | "Config";

export interface Finding {
  id: string;
  title: string;
  severity: Severity;
  category: FindingCategory;
  owasp?: string; // e.g. "A05:2021 Security Misconfiguration"
  description: string;
  remediation: string;
  evidence?: string;
}

export interface CheckResult {
  id: string;
  label: string;
  category: FindingCategory;
  status: CheckStatus;
  detail: string;
}

export interface CertificateInfo {
  source: "ct-logs";
  commonName: string;
  issuer: string;
  notBefore: string;
  notAfter: string;
  daysRemaining: number;
}

export interface DnsRecordSet {
  type: string;
  name: string;
  values: string[];
}

export interface AuditDetails {
  host: string;
  resolvedIps: string[];
  finalUrl?: string;
  httpStatus?: number;
  redirectChain: string[];
  responseHeaders: [string, string][];
  certificate?: CertificateInfo;
  dns: DnsRecordSet[];
  dnssecValidated?: boolean;
}

export interface ScanSummary {
  id: string;
  target: string;
  startedAt: string; // ISO timestamp
  score: number;
  findings: Finding[];
  checks: CheckResult[];
  log?: LogEvent[];
  details?: AuditDetails;
  /** true only for results produced by a real scan. */
  real?: boolean;
}

export type LogLevel = "info" | "ok" | "warn" | "alert";

export interface LogEvent {
  id: string;
  at: string; // ISO timestamp
  level: LogLevel;
  source: string;
  message: string;
}

/** "demo" = simulated sample data, "live" = only results of real scans. */
export type DataMode = "demo" | "live";

/** What every audit phase returns from the server. */
export interface PhaseResult {
  checks: CheckResult[];
  findings: Finding[];
  log: Omit<LogEvent, "id">[];
  details?: Partial<AuditDetails>;
}
