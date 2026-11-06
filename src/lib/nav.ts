
import {
  Activity,
  Bot,
  FileText,
  Fingerprint,
  Globe,
  LayoutDashboard,
  Laptop,
  Radar,
  ShieldAlert,
  Siren,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  to:
    | "/"
    | "/website-audit"
    | "/device-audit"
    | "/owasp"
    | "/threat-intel"
    | "/forensics"
    | "/reports"
    | "/analytics"
    | "/assistant"
    | "/incident-response";
  label: string;
  icon: LucideIcon;
  code: string;
}

export const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "Monitor",
    items: [
      {
        to: "/",
        label: "Dashboard",
        icon: LayoutDashboard,
        code: "SOC",
      },
    ],
  },
  {
    label: "Assess",
    items: [
      {
        to: "/website-audit",
        label: "Website Audit",
        icon: Globe,
        code: "WEB",
      },
      {
        to: "/device-audit",
        label: "Device Audit",
        icon: Laptop,
        code: "DEV",
      },
      {
        to: "/owasp",
        label: "OWASP Assessment",
        icon: ShieldAlert,
        code: "OWA",
      },
    ],
  },
  {
    label: "Investigate",
    items: [
      {
        to: "/threat-intel",
        label: "Threat Intel",
        icon: Radar,
        code: "TIN",
      },
      {
        to: "/forensics",
        label: "Forensics Lab",
        icon: Fingerprint,
        code: "FOR",
      },
      {
        to: "/incident-response",
        label: "Incident Response",
        icon: Siren,
        code: "IR",
      },
    ],
  },
  {
    label: "Report",
    items: [
      {
        to: "/reports",
        label: "Audit Reports",
        icon: FileText,
        code: "RPT",
      },
      {
        to: "/analytics",
        label: "Visitor Analytics",
        icon: Activity,
        code: "ANA",
      },
      {
        to: "/assistant",
        label: "AI Assistant",
        icon: Bot,
        code: "AI",
      },
    ],
  },
];

