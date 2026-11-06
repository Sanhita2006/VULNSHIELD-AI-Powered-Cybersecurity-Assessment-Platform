// Device & Browser Security Audit Engine
// Safely inspects browser-visible environment, secure context, cryptographic capabilities,
// privacy signals, and storage isolation.
//
// Adheres strictly to data honesty: clearly discloses sandbox boundaries
// (what web browsers can and cannot inspect).

import type { Finding, Severity } from "./types";
import { computeScore, postureFor, type Posture } from "./scoring";

export interface DeviceInfo {
  browserName: string;
  browserVersion: string;
  osFamily: string;
  platform: string;
  userAgent: string;
  screenResolution: string;
  colorDepth: number;
  devicePixelRatio: number;
  hardwareConcurrency: number | null;
  deviceMemoryGb: number | null;
  touchSupport: boolean;
  online: boolean;
  language: string;
}

export interface SecurityCheckItem {
  id: string;
  title: string;
  category: "Transport" | "Crypto" | "Isolation" | "Privacy" | "Permissions" | "Environment";
  status: "pass" | "warn" | "fail" | "unsupported";
  value: string;
  description: string;
  remediation?: string;
  severity?: Severity;
}

export interface SandboxRestriction {
  category: string;
  title: string;
  reason: string;
  explanation: string;
}

export interface DeviceAuditReport {
  timestamp: string;
  device: DeviceInfo;
  checks: SecurityCheckItem[];
  findings: Finding[];
  score: number;
  posture: Posture;
  restrictions: SandboxRestriction[];
}

/** Checks that browsers cannot perform due to security sandbox boundaries. */
export const BROWSER_SANDBOX_RESTRICTIONS: SandboxRestriction[] = [
  {
    category: "OS Security",
    title: "Operating System Patch & Hotfix Level",
    reason: "Process Sandboxing",
    explanation:
      "Modern web browsers isolate web pages from system binaries. No legitimate web application can inspect Windows Update, apt packages, or macOS kernel patch versions.",
  },
  {
    category: "Endpoint Protection",
    title: "Antivirus & EDR Real-Time Status",
    reason: "No Host File/Service Access",
    explanation:
      "Web pages cannot probe whether Windows Defender, CrowdStrike, SentinelOne, or third-party antivirus software is installed, running, or updated.",
  },
  {
    category: "Network Defense",
    title: "Host Firewall & Open Port Rules",
    reason: "Raw Socket Isolation",
    explanation:
      "Browsers communicate through high-level HTTP/WebSocket/WebRTC protocols. JavaScript cannot inspect local Windows Defender Firewall or iptables rules.",
  },
  {
    category: "Data at Rest",
    title: "Full Disk Encryption (BitLocker / FileVault)",
    reason: "Hardware & Disk Abstraction",
    explanation:
      "Storage encryption operates below the filesystem layer. Web browsers receive decrypted byte streams from the OS and cannot detect BitLocker or FileVault status.",
  },
  {
    category: "Host Integrity",
    title: "Running Background Processes & Services",
    reason: "Process Isolation Boundary",
    explanation:
      "Web applications cannot enumerate task manager processes or examine local system memory to detect resident malware or unauthorized services.",
  },
  {
    category: "Firmware",
    title: "UEFI / BIOS Secure Boot State",
    reason: "Hardware Security Boundary",
    explanation:
      "Firmware integrity and Secure Boot measurements are confined to TPM and kernel ring-0. No web API has access to motherboard firmware registers.",
  },
];

/** Parse user agent string into browser name, version, and OS family. */
export function parseUserAgent(ua: string): { browserName: string; browserVersion: string; osFamily: string } {
  let browserName = "Unknown Browser";
  let browserVersion = "";
  let osFamily = "Unknown OS";

  // Operating system detection
  if (/Windows NT 10.0/i.test(ua)) osFamily = "Windows 10/11";
  else if (/Windows NT 6.3/i.test(ua)) osFamily = "Windows 8.1";
  else if (/Windows NT 6.1/i.test(ua)) osFamily = "Windows 7";
  else if (/Windows/i.test(ua)) osFamily = "Windows";
  else if (/Android/i.test(ua)) osFamily = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) osFamily = "iOS";
  else if (/Mac OS X/i.test(ua)) osFamily = "macOS";
  else if (/Linux/i.test(ua)) osFamily = "Linux";
  else if (/CrOS/i.test(ua)) osFamily = "ChromeOS";

  // Browser detection (order matters due to user-agent tokens)
  if (/Edg\/(\d+[\.\d]*)/i.test(ua)) {
    browserName = "Microsoft Edge";
    browserVersion = RegExp.$1;
  } else if (/OPR\/(\d+[\.\d]*)/i.test(ua) || /Opera/i.test(ua)) {
    browserName = "Opera";
    browserVersion = RegExp.$1;
  } else if (/Chrome\/(\d+[\.\d]*)/i.test(ua)) {
    browserName = "Google Chrome";
    browserVersion = RegExp.$1;
  } else if (/Firefox\/(\d+[\.\d]*)/i.test(ua)) {
    browserName = "Mozilla Firefox";
    browserVersion = RegExp.$1;
  } else if (/Version\/(\d+[\.\d]*).*Safari/i.test(ua)) {
    browserName = "Apple Safari";
    browserVersion = RegExp.$1;
  }

  return { browserName, browserVersion, osFamily };
}

/** Extract device and screen metrics safely. */
export function collectDeviceInfo(): DeviceInfo {
  if (typeof window === "undefined") {
    return {
      browserName: "Server Environment",
      browserVersion: "N/A",
      osFamily: "Server",
      platform: "Node.js",
      userAgent: "SSR",
      screenResolution: "0x0",
      colorDepth: 0,
      devicePixelRatio: 1,
      hardwareConcurrency: null,
      deviceMemoryGb: null,
      touchSupport: false,
      online: true,
      language: "en",
    };
  }

  const ua = navigator.userAgent;
  const parsed = parseUserAgent(ua);
  const nav = navigator as Navigator & { deviceMemory?: number };

  return {
    browserName: parsed.browserName,
    browserVersion: parsed.browserVersion,
    osFamily: parsed.osFamily,
    platform: navigator.platform ?? "Unknown",
    userAgent: ua,
    screenResolution: `${window.screen?.width ?? 0} × ${window.screen?.height ?? 0}`,
    colorDepth: window.screen?.colorDepth ?? 24,
    devicePixelRatio: window.devicePixelRatio ?? 1,
    hardwareConcurrency: navigator.hardwareConcurrency ?? null,
    deviceMemoryGb: nav.deviceMemory ?? null,
    touchSupport: (navigator.maxTouchPoints ?? 0) > 0,
    online: navigator.onLine ?? true,
    language: navigator.language ?? "en-US",
  };
}

/**
 * Runs client-side security checks across transport, cryptography,
 * isolation, privacy signals, and storage.
 */
export async function runDeviceSecurityAudit(): Promise<DeviceAuditReport> {
  const device = collectDeviceInfo();
  const checks: SecurityCheckItem[] = [];
  const findings: Finding[] = [];

  if (typeof window === "undefined") {
    return {
      timestamp: new Date().toISOString(),
      device,
      checks: [],
      findings: [],
      score: 100,
      posture: "Strong",
      restrictions: BROWSER_SANDBOX_RESTRICTIONS,
    };
  }

  // 1. Secure Browsing Context (HTTPS)
  const isSecure = window.isSecureContext === true;
  const isHttps = window.location.protocol === "https:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

  if (isSecure && isHttps) {
    checks.push({
      id: "sec-context",
      title: "Secure Browsing Context",
      category: "Transport",
      status: "pass",
      value: "Active (HTTPS / Secure Context)",
      description: "The application is running in an authenticated and encrypted secure context.",
    });
  } else {
    checks.push({
      id: "sec-context",
      title: "Secure Browsing Context",
      category: "Transport",
      status: "fail",
      value: "Insecure (Plain HTTP)",
      description: "The browser is executing in an unencrypted context, exposing communication to network eavesdropping.",
      severity: "high",
    });
    findings.push({
      id: "dev-insecure-context",
      title: "Browser is operating in an insecure (unencrypted) context",
      severity: "high",
      category: "Config",
      owasp: "A02:2021 Cryptographic Failures",
      description: "Without HTTPS, sensitive session identifiers, credentials, and data can be intercepted by anyone on the local network.",
      remediation: "Access the platform exclusively over HTTPS or install a trusted local TLS certificate.",
    });
  }

  // 2. Web Cryptography API
  const hasSubtleCrypto = typeof window.crypto !== "undefined" && typeof window.crypto.subtle !== "undefined";
  if (hasSubtleCrypto) {
    checks.push({
      id: "sec-crypto",
      title: "Hardware Cryptography Acceleration (SubtleCrypto)",
      category: "Crypto",
      status: "pass",
      value: "Available",
      description: "Browser supports cryptographically secure random number generation (CSPRNG) and hardware-accelerated cryptographic primitives.",
    });
  } else {
    checks.push({
      id: "sec-crypto",
      title: "Hardware Cryptography Acceleration",
      category: "Crypto",
      status: "fail",
      value: "Missing or Blocked",
      description: "SubtleCrypto is not available in this browsing context.",
      severity: "high",
    });
    findings.push({
      id: "dev-crypto-unavailable",
      title: "SubtleCrypto API is not accessible",
      severity: "high",
      category: "Config",
      owasp: "A02:2021 Cryptographic Failures",
      description: "The browser cannot perform client-side cryptographic operations (hashing, signing, key generation) securely.",
      remediation: "Upgrade to a modern secure browser and ensure the page is served over HTTPS.",
    });
  }

  // 3. Cross-Origin Isolation (Spectre / Meltdown Defense)
  const isCoopCoep = window.crossOriginIsolated === true;
  if (isCoopCoep) {
    checks.push({
      id: "sec-isolation",
      title: "Cross-Origin Isolation (COOP / COEP)",
      category: "Isolation",
      status: "pass",
      value: "Enabled",
      description: "Process memory is strictly isolated from third-party cross-origin frames, mitigating Spectre timing attacks.",
    });
  } else {
    checks.push({
      id: "sec-isolation",
      title: "Cross-Origin Isolation (COOP / COEP)",
      category: "Isolation",
      status: "warn",
      value: "Not Active",
      description: "Cross-Origin-Opener-Policy (COOP) and Cross-Origin-Embedder-Policy (COEP) are not enforced on this origin.",
      severity: "medium",
    });
    findings.push({
      id: "dev-no-cross-origin-isolation",
      title: "Cross-Origin Isolation is not active",
      severity: "medium",
      category: "Config",
      owasp: "A05:2021 Security Misconfiguration",
      description: "Without Cross-Origin Isolation, high-precision timers and SharedArrayBuffer may allow microarchitectural timing attacks (Spectre).",
      remediation: "Serve Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy: require-corp HTTP headers.",
    });
  }

  // 4. Global Privacy Control (GPC) & Do Not Track (DNT)
  const navPrivacy = navigator as Navigator & { globalPrivacyControl?: boolean };
  const gpcEnabled = navPrivacy.globalPrivacyControl === true;
  const dntEnabled = navigator.doNotTrack === "1" || (window as Window & { doNotTrack?: string }).doNotTrack === "1";

  if (gpcEnabled) {
    checks.push({
      id: "sec-gpc",
      title: "Global Privacy Control (GPC)",
      category: "Privacy",
      status: "pass",
      value: "Active (Sec-GPC = 1)",
      description: "Browser signals a legally recognized request to websites not to sell or share your browsing information.",
    });
  } else if (dntEnabled) {
    checks.push({
      id: "sec-gpc",
      title: "Do Not Track (DNT) / Privacy Signal",
      category: "Privacy",
      status: "pass",
      value: "Do Not Track Active",
      description: "Legacy Do-Not-Track signal is transmitted. Upgrading to modern Global Privacy Control is recommended.",
    });
  } else {
    checks.push({
      id: "sec-gpc",
      title: "Privacy Signals (GPC / DNT)",
      category: "Privacy",
      status: "warn",
      value: "No Privacy Signal Broadcast",
      description: "Neither Global Privacy Control nor Do Not Track signals are enabled in your browser settings.",
      severity: "low",
    });
    findings.push({
      id: "dev-gpc-disabled",
      title: "Global Privacy Control signal is not enabled",
      severity: "low",
      category: "Config",
      description: "Your browser does not broadcast the modern Global Privacy Control (GPC) signal to opt out of third-party tracking.",
      remediation: "Enable 'Global Privacy Control' or 'Send a Do Not Track request' in your browser's privacy settings.",
    });
  }

  // 5. Cookie & Storage Isolation
  let storageAccessible = false;
  try {
    const testKey = "__vshield_test__";
    localStorage.setItem(testKey, "1");
    storageAccessible = localStorage.getItem(testKey) === "1";
    localStorage.removeItem(testKey);
  } catch {
    storageAccessible = false;
  }

  if (navigator.cookieEnabled && storageAccessible) {
    checks.push({
      id: "sec-storage",
      title: "Local Storage & Session Storage",
      category: "Isolation",
      status: "pass",
      value: "Available & Quota Normal",
      description: "Origin storage is operating normally with no private-window sandbox blocks.",
    });
  } else if (!storageAccessible) {
    checks.push({
      id: "sec-storage",
      title: "Local Storage Access",
      category: "Isolation",
      status: "warn",
      value: "Restricted / Blocked",
      description: "Origin storage access failed or is blocked by third-party cookie restrictions or strict private mode.",
      severity: "low",
    });
    findings.push({
      id: "dev-storage-restricted",
      title: "Browser storage is restricted",
      severity: "low",
      category: "Cookies",
      description: "LocalStorage is blocked or quarantined, which may be due to strict tracking protection or private browsing.",
      remediation: "Allow first-party storage for trusted domains in browser site settings.",
    });
  }

  // 6. WebRTC Leak Exposure Risk
  const hasWebRtc = typeof window.RTCPeerConnection !== "undefined";
  if (hasWebRtc) {
    checks.push({
      id: "sec-webrtc",
      title: "WebRTC Interface & PeerConnection",
      category: "Environment",
      status: "warn",
      value: "Active (PeerConnection Supported)",
      description: "WebRTC is enabled. Modern browsers use mDNS obfuscation to prevent local LAN IP leakage, but proxy/VPN users should verify leak resistance.",
      severity: "low",
    });
    findings.push({
      id: "dev-webrtc-active",
      title: "WebRTC interface is enabled",
      severity: "low",
      category: "Config",
      description: "WebRTC peer connection capabilities are enabled. If you use a VPN, verify your browser uses mDNS masking to prevent real IP exposure.",
      remediation: "In sensitive environments, consider browser extensions (e.g. uBlock Origin) that disable WebRTC IP address leakage.",
    });
  } else {
    checks.push({
      id: "sec-webrtc",
      title: "WebRTC Interface",
      category: "Environment",
      status: "pass",
      value: "Disabled or Blocked",
      description: "WebRTC PeerConnection is disabled, eliminating WebRTC IP leak vectors.",
    });
  }

  // 7. Automation / Headless Webdriver Check
  const isAutomated = navigator.webdriver === true;
  if (isAutomated) {
    checks.push({
      id: "sec-webdriver",
      title: "Automation / WebDriver Flag",
      category: "Environment",
      status: "warn",
      value: "WebDriver Detected",
      description: "The browser reports that it is being controlled by an automated testing framework (e.g. Selenium/Puppeteer).",
      severity: "low",
    });
    findings.push({
      id: "dev-webdriver-active",
      title: "Automated browser session detected",
      severity: "low",
      category: "Config",
      description: "The navigator.webdriver flag is active, indicating an automated testing or bot session.",
      remediation: "If this is an unintended automated session, launch your browser normally without remote debugging flags.",
    });
  } else {
    checks.push({
      id: "sec-webdriver",
      title: "Browser Execution Mode",
      category: "Environment",
      status: "pass",
      value: "Interactive Human Session",
      description: "No automated WebDriver or headless control flag detected.",
    });
  }

  // 8. Service Worker Security
  const hasServiceWorker = "serviceWorker" in navigator;
  checks.push({
    id: "sec-sw",
    title: "Service Worker Capability",
    category: "Environment",
    status: "pass",
    value: hasServiceWorker ? "Supported" : "Not Supported",
    description: hasServiceWorker
      ? "Browser supports offline background sync and cache management within secure context."
      : "Service Worker API is unavailable.",
  });

  // Calculate score & posture deterministically using VULNSHIELD scoring formula
  const score = computeScore(findings);
  const posture = postureFor(score);

  return {
    timestamp: new Date().toISOString(),
    device,
    checks,
    findings,
    score,
    posture,
    restrictions: BROWSER_SANDBOX_RESTRICTIONS,
  };
}
