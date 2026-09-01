import { notFound } from "next/navigation";
import { getScan } from "@/lib/store/scanStore";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { MetricCard } from "@/components/dashboard/InfoCards";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { ContributorBarChart } from "@/components/dashboard/Charts";
import { UnavailableNote } from "@/components/ui/States";
import { RiskBadge } from "@/components/ui/RiskBadge";

export default async function ContributorsPage({ params }: { params: { scanId: string } }) {
  const scan = await getScan(params.scanId);
  if (!scan) notFound();

  const contributors = scan.contributorAnalysis;
  const contributorScore = scan.health.categories.find((c) => c.category === "contributor");

  if (!contributors || !contributors.dataAvailable) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <UnavailableNote reason={contributors?.unavailableReason ?? "Contributor data unavailable. This scan may not have used a GitHub repository as its source."} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr]">
        <Card>
          <CardBody className="flex flex-col items-center justify-center gap-2 py-8">
            <ScoreRing score={contributorScore?.score ?? null} size={140} label="Contributor Health" />
          </CardBody>
        </Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard label="Total contributors" value={String(contributors.totalContributors)} />
          <MetricCard label="Top contributor" value={`${contributors.topContributorConcentration}%`} hint="of tracked contributions" />
          <MetricCard label="Estimated bus factor" value={String(contributors.estimatedBusFactor)} />
        </div>
      </div>

      {contributors.concentrationRisk === "high" && (
        <div className="rounded-md border border-status-medium/30 bg-status-medium/5 px-4 py-3 text-sm text-ink-muted">
          Most repository activity is concentrated among a small number of contributors, which can increase
          continuity risk. This does not necessarily mean the project is poorly maintained.
        </div>
      )}

      <Card>
        <CardHeader className="flex items-center justify-between">
          <p className="font-display text-sm font-medium text-ink">Contribution distribution</p>
          <RiskBadge severity={contributors.concentrationRisk} />
        </CardHeader>
        <CardBody>
          <ContributorBarChart contributors={contributors.topContributors} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <p className="font-display text-sm font-medium text-ink">Top contributors</p>
        </CardHeader>
        <CardBody>
          <div className="divide-y divide-line-subtle">
            {contributors.topContributors.map((c) => (
              <div key={c.login} className="flex items-center justify-between py-2.5">
                <a
                  href={c.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-sm text-ink hover:text-brand hover:underline"
                >
                  {c.login}
                </a>
                <div className="flex items-center gap-3 text-sm text-ink-muted">
                  <span className="font-mono">{c.contributions.toLocaleString()} commits</span>
                  <span className="font-mono tabular text-ink-faint">{c.percentageOfTotal}%</span>
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
