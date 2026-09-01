import type { LucideIcon } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { RiskBadge } from "@/components/ui/RiskBadge";
import type { Issue, Recommendation } from "@/lib/types";

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
}) {
  return (
    <Card>
      <CardBody className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</span>
          {Icon && <Icon className="h-4 w-4 text-ink-faint" strokeWidth={1.75} />}
        </div>
        <div className="font-mono text-2xl font-semibold tabular text-ink">{value}</div>
        {hint && <div className="text-xs text-ink-faint">{hint}</div>}
      </CardBody>
    </Card>
  );
}

export function IssueCard({ issue }: { issue: Issue }) {
  return (
    <Card>
      <CardBody className="space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <p className="font-display text-sm font-medium leading-snug text-ink">{issue.title}</p>
          <RiskBadge severity={issue.severity} className="shrink-0" />
        </div>
        <p className="text-sm leading-relaxed text-ink-muted">{issue.description}</p>
        {issue.evidence.length > 0 && (
          <ul className="space-y-1 border-l-2 border-line pl-3">
            {issue.evidence.map((e, i) => (
              <li key={i} className="font-mono text-xs text-ink-faint">
                {e}
              </li>
            ))}
          </ul>
        )}
        <p className="text-sm text-brand">{issue.recommendation}</p>
      </CardBody>
    </Card>
  );
}

const PRIORITY_LABEL: Record<Recommendation["priority"], string> = {
  critical: "Priority 1 — Critical",
  high: "Priority 2 — High",
  medium: "Priority 3 — Medium",
  low: "Priority 4 — Low"
};

export function RecommendationCard({ recommendation, index }: { recommendation: Recommendation; index: number }) {
  return (
    <Card>
      <CardBody className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-wide text-ink-faint">
            #{index + 1} · {PRIORITY_LABEL[recommendation.priority]}
          </span>
          <RiskBadge
            severity={
              recommendation.priority === "critical"
                ? "critical"
                : recommendation.priority === "high"
                ? "high"
                : recommendation.priority === "medium"
                ? "medium"
                : "low"
            }
          />
        </div>
        <p className="font-display text-sm font-medium leading-snug text-ink">{recommendation.title}</p>
        <p className="text-sm leading-relaxed text-ink-muted">{recommendation.why}</p>
        {recommendation.evidence.length > 0 && (
          <ul className="space-y-1 border-l-2 border-line pl-3">
            {recommendation.evidence.map((e, i) => (
              <li key={i} className="font-mono text-xs text-ink-faint">
                {e}
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
