import { notFound } from "next/navigation";
import { getScan } from "@/lib/store/scanStore";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { RiskBadge } from "@/components/ui/RiskBadge";
import { SeverityDonut } from "@/components/dashboard/Charts";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { UnavailableNote, EmptyState } from "@/components/ui/States";

export default async function SecurityPage({ params }: { params: { scanId: string } }) {
  const scan = await getScan(params.scanId);
  if (!scan) notFound();

  const security = scan.securityAnalysis;
  const securityScore = scan.health.categories.find((c) => c.category === "security");

  if (!security || !security.dataAvailable) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <UnavailableNote reason={security?.unavailableReason ?? "Security analysis unavailable."} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr]">
        <Card>
          <CardBody className="flex flex-col items-center justify-center gap-2 py-8">
            <ScoreRing score={securityScore?.score ?? null} size={140} label="Security Health" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <p className="font-display text-sm font-medium text-ink">Severity distribution</p>
          </CardHeader>
          <CardBody>
            <SeverityDonut counts={security.counts} />
            <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
              <div>
                <p className="font-mono text-lg font-semibold text-status-critical">{security.counts.critical}</p>
                <p className="text-ink-faint">Critical</p>
              </div>
              <div>
                <p className="font-mono text-lg font-semibold text-status-high">{security.counts.high}</p>
                <p className="text-ink-faint">High</p>
              </div>
              <div>
                <p className="font-mono text-lg font-semibold text-status-medium">{security.counts.medium}</p>
                <p className="text-ink-faint">Moderate</p>
              </div>
              <div>
                <p className="font-mono text-lg font-semibold text-status-low">{security.counts.low}</p>
                <p className="text-ink-faint">Low</p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <div>
        <h2 className="mb-3 font-display text-base font-semibold text-ink">Vulnerabilities</h2>
        {security.vulnerabilities.length === 0 ? (
          <EmptyState title="No known vulnerabilities" description="No advisories were found for the analyzed dependency versions." />
        ) : (
          <div className="space-y-3">
            {security.vulnerabilities.map((v) => (
              <Card key={`${v.id}-${v.packageName}`}>
                <CardBody className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-mono text-sm text-ink">
                      {v.packageName} <span className="text-ink-faint">· {v.installedVersion ?? "unknown version"}</span>
                    </p>
                    <RiskBadge severity={v.severity} />
                  </div>
                  <p className="text-sm text-ink-muted">{v.summary}</p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-ink-faint">
                    <span>Advisory: {v.id}</span>
                    <span>Fixed in: {v.fixedVersion ?? "Not yet published"}</span>
                    {v.referenceUrl && (
                      <a href={v.referenceUrl} target="_blank" rel="noreferrer" className="text-brand hover:underline">
                        View advisory
                      </a>
                    )}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
