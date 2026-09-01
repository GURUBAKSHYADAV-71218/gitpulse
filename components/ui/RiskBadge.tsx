import clsx from "clsx";
import type { Severity } from "@/lib/types";

const SEVERITY_STYLES: Record<Severity, string> = {
  critical: "bg-status-critical/10 text-status-critical border-status-critical/30",
  high: "bg-status-high/10 text-status-high border-status-high/30",
  medium: "bg-status-medium/10 text-status-medium border-status-medium/30",
  low: "bg-status-low/10 text-status-low border-status-low/30",
  unknown: "bg-status-unknown/10 text-ink-muted border-status-unknown/30"
};

const SEVERITY_LABELS: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  unknown: "Unknown"
};

export function RiskBadge({ severity, className }: { severity: Severity; className?: string }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium font-mono uppercase tracking-wide",
        SEVERITY_STYLES[severity],
        className
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {SEVERITY_LABELS[severity]}
    </span>
  );
}
