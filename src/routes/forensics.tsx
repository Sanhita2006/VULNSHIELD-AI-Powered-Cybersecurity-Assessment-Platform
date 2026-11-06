import { createFileRoute } from "@tanstack/react-router";
import { useState, useCallback } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RefreshCw, CheckCircle2, AlertTriangle, Copy } from "lucide-react";
import { md5 } from "@/lib/md5";

// ---------- Helper Types ----------
interface HashResult {
  sha256: string;
  md5: string;
}

interface Metadata {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  extension: string;
}

interface SuspiciousFinding {
  indicator: string;
  severity: "high" | "medium" | "low";
  explanation: string;
  recommendation: string;
}

// ---------- Utility Functions ----------
async function computeSHA256(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function computeMD5(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const binary = reader.result as string;
      const hash = md5(binary);
      resolve(hash);
    };
    reader.readAsBinaryString(file);
  });
}

function extractMetadata(file: File): Metadata {
  const name = file.name;
  const size = file.size;
  const type = file.type || "application/octet-stream";
  const lastModified = file.lastModified;
  const extension = name.includes(".") ? name.split('.').pop()!.toLowerCase() : "";
  return { name, size, type, lastModified, extension };
}

const SUSPICIOUS_EXTENSIONS = new Set(["exe", "dll", "bat", "cmd", "js", "vbs", "scr", "lnk"]);

function analyseSuspicious(file: File): SuspiciousFinding[] {
  const findings: SuspiciousFinding[] = [];
  const meta = extractMetadata(file);
  // Extension check
  if (SUSPICIOUS_EXTENSIONS.has(meta.extension)) {
    findings.push({
      indicator: `Suspicious extension .${meta.extension}`,
      severity: "high",
      explanation: "File extensions commonly used for executables or scripts are high‑risk when uploaded to a web‑app.",
      recommendation: "Do not execute this file. Consider scanning with an offline antivirus solution.",
    });
  }
  // Simple name pattern check
  const lower = meta.name.toLowerCase();
  if (lower.includes("malware") || lower.includes("virus")) {
    findings.push({
      indicator: "File name contains suspicious keywords",
      severity: "medium",
      explanation: "Names that reference malware often indicate a deliberately crafted sample.",
      recommendation: "Treat the file as potentially malicious and avoid opening it.",
    });
  }
  // Size‑based heuristic – very small executables (<1 KB) are unusual
  if (meta.size < 1024 && SUSPICIOUS_EXTENSIONS.has(meta.extension)) {
    findings.push({
      indicator: "Unusually small executable",
      severity: "low",
      explanation: "Such files are frequently used for dropper payloads.",
      recommendation: "Inspect the file content using a hex editor.",
    });
  }
  return findings;
}

// ---------- Main Component ----------
export const Route = createFileRoute("/forensics")({
  head: () => ({
    meta: [
      { title: "Forensics Lab — VULNSHIELD" },
      { name: "description", content: "Safe, in‑browser file analysis – files never leave your device." },
      { property: "og:title", content: "Forensics Lab — VULNSHIELD" },
      { property: "og:description", content: "Safe, in‑browser file analysis – files never leave your device." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ForensicsPage,
});

function ForensicsPage() {
  const [activeTab, setActiveTab] = useState<"hash" | "integrity" | "metadata" | "suspicious" | "report">("hash");

  // ---------- State for Hash Generator ----------
  const [hashFile, setHashFile] = useState<File | null>(null);
  const [hashResult, setHashResult] = useState<HashResult | null>(null);
  const [hashLoading, setHashLoading] = useState(false);

  const handleHashFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setHashFile(e.target.files[0]);
  };

  const runHash = async () => {
    if (!hashFile) return;
    setHashLoading(true);
    try {
      const [sha256, md5] = await Promise.all([computeSHA256(hashFile), computeMD5(hashFile)]);
      setHashResult({ sha256, md5 });
    } catch (e) {
      console.error(e);
    } finally {
      setHashLoading(false);
    }
  };

  // ---------- State for Integrity Checker ----------
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [integrityResult, setIntegrityResult] = useState<boolean | null>(null);
  const [integrityLoading, setIntegrityLoading] = useState(false);

  const runIntegrity = async () => {
    if (!fileA || !fileB) return;
    setIntegrityLoading(true);
    try {
      const [hashA, hashB] = await Promise.all([computeSHA256(fileA), computeSHA256(fileB)]);
      setIntegrityResult(hashA === hashB);
    } catch (e) {
      console.error(e);
    } finally {
      setIntegrityLoading(false);
    }
  };

  // ---------- State for Metadata ----------
  const [metaFile, setMetaFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<Metadata | null>(null);

  const runMetadata = () => {
    if (!metaFile) return;
    setMetadata(extractMetadata(metaFile));
  };

  // ---------- State for Suspicious Analysis ----------
  const [suspFile, setSuspFile] = useState<File | null>(null);
  const [suspFindings, setSuspFindings] = useState<SuspiciousFinding[]>([]);

  const runSuspicious = () => {
    if (!suspFile) return;
    setSuspFindings(analyseSuspicious(suspFile));
  };

  // ---------- Report Generation ----------
  const generateReport = () => {
    const report = {
      hash: hashResult,
      metadata: metadata,
      integrity: integrityResult,
      suspicious: suspFindings,
    };
    // JSON download
    const jsonBlob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const jsonLink = document.createElement("a");
    jsonLink.href = jsonUrl;
    jsonLink.download = "forensics-report.json";
    jsonLink.click();
    // CSV download (flattened key/value rows)
    const rows: string[] = [];
    if (hashResult) rows.push(["SHA-256", hashResult.sha256].join(","), ["MD5", hashResult.md5].join(","));
    if (metadata) rows.push(["File Name", metadata.name].join(","), ["Size", metadata.size].join(","), ["MIME Type", metadata.type].join(","), ["Extension", metadata.extension].join(","), ["Last Modified", new Date(metadata.lastModified).toISOString()].join(","));
    if (integrityResult !== null) rows.push(["Integrity Match", integrityResult].join(","));
    suspFindings.forEach((f, i) => {
      rows.push([`Finding ${i + 1} Indicator`, f.indicator].join(","));
      rows.push([`Finding ${i + 1} Severity`, f.severity].join(","));
      rows.push([`Finding ${i + 1} Explanation`, `"${f.explanation}"`].join(","));
    });
    const csvBlob = new Blob([rows.join("\n")], { type: "text/csv" });
    const csvUrl = URL.createObjectURL(csvBlob);
    const csvLink = document.createElement("a");
    csvLink.href = csvUrl;
    csvLink.download = "forensics-report.csv";
    csvLink.click();
  };

  // ---------- UI Helpers ----------
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
  };

  // ---------- Render ----------
  return (
    <div className="space-y-6">
      <PageHeader
        code="FOR"
        title="Forensics Lab"
        description="In‑browser file analysis – nothing leaves your device."
        actions={<Button variant="neon" onClick={() => setActiveTab("hash")} className="mr-2">Hash Generator</Button>}
      />

      {/* Tab selector */}
      <div className="flex gap-2 mb-4">
        {(["hash", "integrity", "metadata", "suspicious", "report"] as const).map((t) => (
          <Button
            key={t}
            variant={activeTab === t ? "neon" : "secondary"}
            onClick={() => setActiveTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </Button>
        ))}
      </div>

      {/* Hash Generator Tab */}
      {activeTab === "hash" && (
        <Panel title="SHA‑256 & MD5 Hash Generator" code="01" className="scanline">
          <input type="file" onChange={handleHashFile} />
          <Button onClick={runHash} disabled={!hashFile || hashLoading} className="ml-2">
            {hashLoading ? <RefreshCw className="animate-spin size-4 mr-1" /> : null}Generate
          </Button>
          {hashResult && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">SHA‑256</Badge>
                <code className="font-mono text-sm">{hashResult.sha256}</code>
                <Button size="icon" variant="ghost" onClick={() => copyToClipboard(hashResult.sha256)}>
                  <Copy className="size-3" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">MD5</Badge>
                <code className="font-mono text-sm">{hashResult.md5}</code>
                <Button size="icon" variant="ghost" onClick={() => copyToClipboard(hashResult.md5)}>
                  <Copy className="size-3" />
                </Button>
              </div>
            </div>
          )}
        </Panel>
      )}

      {/* Integrity Checker Tab */}
      {activeTab === "integrity" && (
        <Panel title="File Integrity Checker" code="02" className="scanline">
          <div className="flex gap-2 mb-2">
            <input type="file" onChange={(e) => setFileA(e.target.files?.[0] ?? null)} />
            <input type="file" onChange={(e) => setFileB(e.target.files?.[0] ?? null)} />
            <Button onClick={runIntegrity} disabled={!fileA || !fileB || integrityLoading}>
              {integrityLoading ? <RefreshCw className="animate-spin size-4 mr-1" /> : null}Compare
            </Button>
          </div>
          {integrityResult !== null && (
            <div className="mt-2">
              {integrityResult ? (
                <Badge variant="outline" className={cn("bg-sev-low/20 border-sev-low text-sev-low")}>Identical</Badge>
              ) : (
                <Badge variant="outline" className={cn("bg-sev-high/20 border-sev-high text-sev-high")}>Modified</Badge>
              )}
            </div>
          )}
        </Panel>
      )}

      {/* Metadata Analysis Tab */}
      {activeTab === "metadata" && (
        <Panel title="Metadata Extraction" code="03" className="scanline">
          <input type="file" onChange={(e) => setMetaFile(e.target.files?.[0] ?? null)} />
          <Button onClick={runMetadata} disabled={!metaFile} className="ml-2">Extract</Button>
          {metadata && (
            <div className="mt-4 space-y-1 text-sm">
              <p><strong>Name:</strong> {metadata.name}</p>
              <p><strong>Extension:</strong> {metadata.extension}</p>
              <p><strong>MIME Type:</strong> {metadata.type}</p>
              <p><strong>Size:</strong> {metadata.size} bytes</p>
              <p><strong>Last Modified:</strong> {new Date(metadata.lastModified).toLocaleString()}</p>
            </div>
          )}
        </Panel>
      )}

      {/* Suspicious File Analysis Tab */}
      {activeTab === "suspicious" && (
        <Panel title="Suspicious File Analysis" code="04" className="scanline">
          <input type="file" onChange={(e) => setSuspFile(e.target.files?.[0] ?? null)} />
          <Button onClick={runSuspicious} disabled={!suspFile} className="ml-2">Analyse</Button>
          {suspFindings.length > 0 ? (
            <div className="mt-4 space-y-3">
              {suspFindings.map((f, i) => (
                <div key={i} className="border border-border rounded p-3">
                  <div className="flex items-center gap-2 mb-1">
                    {f.severity === "high" && <AlertTriangle className="size-4 text-sev-high" />}
                    {f.severity === "medium" && <Info className="size-4 text-sev-medium" />}
                    {f.severity === "low" && <CheckCircle2 className="size-4 text-sev-low" />}
                    <Badge variant="outline" className={cn(
                      "uppercase",
                      f.severity === "high" && "bg-sev-high/20 border-sev-high text-sev-high",
                      f.severity === "medium" && "bg-sev-medium/20 border-sev-medium text-sev-medium",
                      f.severity === "low" && "bg-sev-low/20 border-sev-low text-sev-low",
                    )}>
                      {f.severity}
                    </Badge>
                  </div>
                  <p className="font-medium">{f.indicator}</p>
                  <p className="text-xs text-muted-foreground">{f.explanation}</p>
                  <p className="mt-1 text-sm">Recommendation: {f.recommendation}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-muted-foreground">No suspicious indicators detected.</p>
          )}
        </Panel>
      )}

      {/* Report Generator Tab */}
      {activeTab === "report" && (
        <Panel title="Investigation Report" code="05" className="scanline">
          <Button onClick={generateReport} disabled={!(hashResult || metadata)} variant="neon">
            Download Report (JSON & CSV)
          </Button>
          <p className="mt-2 text-muted-foreground text-sm">
            The report aggregates all data collected in the session. It does not contain any uploaded file content.
          </p>
        </Panel>
      )}
    </div>
  );
}
