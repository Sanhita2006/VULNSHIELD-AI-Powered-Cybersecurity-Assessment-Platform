# VULNSHIELD — Architecture

## Stack (as built on Lovable)

| Layer      | Choice                                   | Why |
|------------|------------------------------------------|-----|
| Frontend   | React 19 + TanStack Router + Tailwind v4 | File-based routing, typed links, SSR |
| Backend    | TanStack Start server functions (TypeScript, Node-like edge runtime) | Same role as Express/FastAPI, lives in the same repo, no CORS |
| Database   | Lovable Cloud (PostgreSQL)               | Replaces SQLite; real Postgres from day one, so no migration later |
| Charts     | Recharts                                 | React-native charts |
| AI         | Lovable AI Gateway (LLM), called server-side only | API key stays in server env vars, never in the browser |
| PDF        | jsPDF (client-side)                      | Report export |

```text
 Browser (React UI)
   │  sidebar + 9 modules, Demo/Live switch
   │
   │  createServerFn RPC (same origin)
   ▼
 Server functions  ──► passive checks: fetch HEAD/GET (headers, redirects),
   │                    DNS-over-HTTPS (DNSSEC, SPF, DMARC, DKIM, CAA),
   │                    TLS/cert info · rate-limited · consent required
   │
   ├──► Lovable Cloud Postgres: scans, findings, checks, page_views
   └──► AI Gateway (LLM): explain findings, remediation, secure code
```

## Data honesty rules
- Score = 100 − 15×High − 7×Medium − 2×Low (clamped). Always computed, never typed.
- **Demo mode** shows simulated sample data with a DEMO badge on every panel.
- **Live mode** shows only real scan results; empty until a scan runs.

## Folder structure

```text
src/
  routes/                 one file per page (URL = file name)
    __root.tsx            app shell: sidebar + top bar + <Outlet/>
    index.tsx             /               Dashboard
    website-audit.tsx     /website-audit
    device-audit.tsx      /device-audit
    owasp.tsx             /owasp
    threat-intel.tsx      /threat-intel
    forensics.tsx         /forensics
    reports.tsx           /reports
    analytics.tsx         /analytics
    assistant.tsx         /assistant
  components/
    layout/               AppSidebar, TopBar, PageHeader, Panel, ModulePlaceholder
    dashboard/            ScoreGauge, SeverityCards, PostureCharts, LiveLog, StatusOverview
    ui/                   shadcn primitives (button, card, sidebar…)
  hooks/
    use-data-mode.tsx     Demo / Live switch (saved in localStorage)
    use-scans.ts          single source of scan data for all modules
  lib/
    types.ts              Finding, CheckResult, ScanSummary, LogEvent
    scoring.ts            score + posture rules
    demo-data.ts          SIMULATED sample dataset
    nav.ts                sidebar menu definition
  server/                 (Step 5+) *.functions.ts server functions
  test/                   vitest tests
docs/ARCHITECTURE.md      this file
```

## Website Audit backend (Step 5–6)

```text
Browser /website-audit
  1. normalizeTarget()  – instant URL validation (src/lib/audit/url.ts)
  2. calls 4 server functions in order → real per-phase progress
        auditPrecheck → auditHttp → auditTls → auditDns   (src/lib/audit.functions.ts)
  3. merges checks/findings, score = computeScore(findings), saves to scan-store
Server (each call):
  zod input { url, consent: true } → normalizeTarget → rate limit (IP + target)
  → SSRF guard: resolve A/AAAA via DNS-over-HTTPS, refuse private/reserved IPs
  → phase logic (src/lib/audit/phases.server.ts), rules in src/lib/audit/analyze.ts
```

| Phase | What it does (passive) | Source |
|-------|------------------------|--------|
| pre   | Validate domain, resolve IPs, block private/reserved | Cloudflare / Google DoH |
| http  | GET http:// (redirect?) and GET https:// (≤5 redirects, each re-checked), read headers + cookie flags, body discarded | target site |
| tls   | Newest valid certificate for the hostname; TLS versions/ciphers marked UNAVAILABLE | Cert Spotter CT-log API |
| dns   | A, AAAA, NS, MX, TXT, DNSSEC (AD flag + DS), CAA tree-climb, SPF, DMARC, 8 common DKIM selectors | DoH |

Check status `unavailable` = could not be performed; shown in the UI and never scored.
Real scans are kept in localStorage (`src/lib/scan-store.ts`) until the database step.
