import { notFound } from "next/navigation";
import { getScan } from "@/lib/store/scanStore";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { MetricCard, IssueCard } from "@/components/dashboard/InfoCards";
import { CategoryScoreChart } from "@/components/dashboard/Charts";
import { EmptyState } from "@/components/ui/States";
import { Package, ShieldCheck, GitBranch, Users } from "lucide-react";

export default async function OverviewPage({ params }: { params: { scanId: string } }) {
  const scan = await getScan(params.scanId);
  if (!scan) notFound();

  const criticalIssues = scan.issues.filter((i) => i.severity === "critical" || i.severity === "high");
  const otherIssues = scan.issues.filter((i) => i.severity === "medium" || i.severity === "low");

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr]">
        <Card>
          <CardBody className="flex flex-col items-center justify-center gap-4 py-8">
            <ScoreRing score={scan.health.overall} />
            <div className="text-center">
              <p className="font-display text-sm font-medium text-ink">{scan.health.bandLabel}</p>
              <p className="mt-1 max-w-[220px] text-xs text-ink-faint">Engineering Health Score</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <p className="font-display text-sm font-medium text-ink">Category breakdown</p>
          </CardHeader>
          <CardBody>
            <CategoryScoreChart categories={scan.health.categories} />
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Dependencies"
          value={scan.dependencyAnalysis ? String(scan.dependencyAnalysis.totalCount) : "N/A"}
          hint={scan.dependencyAnalysis ? `${scan.dependencyAnalysis.outdatedCount} outdated` : "Not analyzed"}
          icon={Package}
        />
        <MetricCard
          label="Vulnerabilities"
          value={
            scan.securityAnalysis?.dataAvailable
              ? String(
                  scan.securityAnalysis.counts.critical +
                    scan.securityAnalysis.counts.high +
                    scan.securityAnalysis.counts.medium +
                    scan.securityAnalysis.counts.low
                )
              : "Unavailable"
          }
          hint={scan.securityAnalysis?.dataAvailable ? `${scan.securityAnalysis.counts.critical} critical, ${scan.securityAnalysis.counts.high} high` : undefined}
          icon={ShieldCheck}
        />
        <MetricCard
          label="Repository activity"
          value={scan.repositoryActivity?.dataAvailable ? scan.repositoryActivity.activityLevel : "N/A"}
          hint={
            scan.repositoryActivity?.daysSinceLastPush !== null && scan.repositoryActivity?.daysSinceLastPush !== undefined
              ? `Last push ${scan.repositoryActivity.daysSinceLastPush}d ago`
              : undefined
          }
          icon={GitBranch}
        />
        <MetricCard
          label="Contributors"
          value={scan.contributorAnalysis?.dataAvailable ? String(scan.contributorAnalysis.totalContributors) : "N/A"}
          hint={
            scan.contributorAnalysis?.dataAvailable
              ? `Top: ${scan.contributorAnalysis.topContributorConcentration}%`
              : undefined
          }
          icon={Users}
        />
      </div>

      <div>
        <h2 className="mb-3 font-display text-base font-semibold text-ink">Critical issues</h2>
        {criticalIssues.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {criticalIssues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        ) : (
          <EmptyState title="No critical issues detected" description="Nothing high-severity was found in this scan." />
        )}
      </div>

      {otherIssues.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-base font-semibold text-ink">Warnings</h2>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {otherIssues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <p className="font-display text-sm font-medium text-ink">Engineering summary</p>
        </CardHeader>
        <CardBody>
          <p className="text-sm leading-relaxed text-ink-muted">{scan.engineeringSummary.text}</p>
          {scan.engineeringSummary.generatedBy === "deterministic" && (
            <p className="mt-3 text-xs text-ink-faint">
              Generated from deterministic analysis. Configure AI_API_KEY for an AI-written narrative summary.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
