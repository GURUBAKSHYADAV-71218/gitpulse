import { notFound } from "next/navigation";
import { getScan } from "@/lib/store/scanStore";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ReportActions } from "@/components/dashboard/ReportActions";
import { RiskBadge } from "@/components/ui/RiskBadge";

export default async function ReportPage({ params }: { params: { scanId: string } }) {
  const scan = await getScan(params.scanId);
  if (!scan) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-lg font-semibold text-ink">Engineering Health Report</h1>
          <p className="text-sm text-ink-muted">
            {scan.source.label} · Scanned {new Date(scan.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <ReportActions scanId={scan.id} />
      </div>

      <Card>
        <CardHeader>
          <p className="font-display text-sm font-medium text-ink">Overall Engineering Health</p>
        </CardHeader>
        <CardBody className="space-y-1">
          <p className="font-mono text-3xl font-semibold tabular text-ink">
            {scan.health.overall ?? "N/A"} <span className="text-base text-ink-faint">/ 100</span>
          </p>
          <p className="text-sm text-ink-muted">{scan.health.bandLabel}</p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <p className="font-display text-sm font-medium text-ink">Category scores</p>
        </CardHeader>
        <CardBody>
          <div className="divide-y divide-line-subtle">
            {scan.health.categories
              .filter((c) => c.weight > 0)
              .map((c) => (
                <div key={c.category} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-ink-muted">{c.label}</span>
                  <span className="font-mono text-ink">{c.score === null ? "Unavailable" : `${c.score}/100`}</span>
                </div>
              ))}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <p className="font-display text-sm font-medium text-ink">Engineering summary</p>
        </CardHeader>
        <CardBody>
          <p className="text-sm leading-relaxed text-ink-muted">{scan.engineeringSummary.text}</p>
        </CardBody>
      </Card>

      {scan.issues.length > 0 && (
        <Card>
          <CardHeader>
            <p className="font-display text-sm font-medium text-ink">Issues</p>
          </CardHeader>
          <CardBody className="space-y-4">
            {scan.issues.map((issue) => (
              <div key={issue.id} className="space-y-1 border-b border-line-subtle pb-4 last:border-0 last:pb-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink">{issue.title}</p>
                  <RiskBadge severity={issue.severity} />
                </div>
                <p className="text-sm text-ink-muted">{issue.description}</p>
                <p className="text-sm text-brand">{issue.recommendation}</p>
              </div>
            ))}
          </CardBody>
        </Card>
      )}

      {scan.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <p className="font-display text-sm font-medium text-ink">Prioritized recommendations</p>
          </CardHeader>
          <CardBody>
            <ol className="list-decimal space-y-2 pl-4 text-sm">
              {scan.recommendations.map((rec) => (
                <li key={rec.id} className="text-ink-muted">
                  <span className="font-medium text-ink">{rec.title}</span>
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
