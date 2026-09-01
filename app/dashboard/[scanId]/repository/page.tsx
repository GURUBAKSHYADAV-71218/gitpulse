import { notFound } from "next/navigation";
import { getScan } from "@/lib/store/scanStore";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { MetricCard } from "@/components/dashboard/InfoCards";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { UnavailableNote } from "@/components/ui/States";
import { Star, GitFork, CircleDot, Calendar, Tag } from "lucide-react";

function formatDate(iso: string | null): string {
  if (!iso) return "Unknown";
  return new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export default async function RepositoryPage({ params }: { params: { scanId: string } }) {
  const scan = await getScan(params.scanId);
  if (!scan) notFound();

  const metrics = scan.repositoryMetrics;
  const activity = scan.repositoryActivity;
  const repoScore = scan.health.categories.find((c) => c.category === "repository");

  if (!metrics || !metrics.dataAvailable) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <UnavailableNote reason={metrics?.unavailableReason ?? "Repository data unavailable. This scan may not have used a GitHub repository as its source."} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr]">
        <Card>
          <CardBody className="flex flex-col items-center justify-center gap-2 py-8">
            <ScoreRing score={repoScore?.score ?? null} size={140} label="Repository Activity" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <p className="font-display text-sm font-medium text-ink">{metrics.fullName}</p>
          </CardHeader>
          <CardBody className="space-y-3">
            <p className="text-sm text-ink-muted">{metrics.description || "No description provided."}</p>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted">
              {metrics.primaryLanguage && <span>{metrics.primaryLanguage}</span>}
              {metrics.license && <span>{metrics.license}</span>}
              {metrics.isArchived && <span className="text-status-high">Archived</span>}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <MetricCard label="Stars" value={metrics.stars.toLocaleString()} icon={Star} />
        <MetricCard label="Forks" value={metrics.forks.toLocaleString()} icon={GitFork} />
        <MetricCard label="Open issues" value={metrics.openIssues.toLocaleString()} icon={CircleDot} />
        <MetricCard
          label="Latest release"
          value={metrics.latestReleaseTag ?? "None"}
          hint={metrics.latestReleaseDate ? formatDate(metrics.latestReleaseDate) : undefined}
          icon={Tag}
        />
        <MetricCard label="Created" value={formatDate(metrics.createdAt)} icon={Calendar} />
        <MetricCard label="Last push" value={formatDate(metrics.lastPushAt)} icon={Calendar} />
      </div>

      <Card>
        <CardHeader>
          <p className="font-display text-sm font-medium text-ink">Recent activity</p>
        </CardHeader>
        <CardBody>
          {activity?.dataAvailable ? (
            <div className="space-y-2 text-sm text-ink-muted">
              <p>
                Last push was <span className="font-mono text-ink">{activity.daysSinceLastPush} days</span> ago.
              </p>
              {activity.recentCommitCount30d !== null && (
                <p>
                  <span className="font-mono text-ink">{activity.recentCommitCount30d}</span> commits on the default
                  branch in the last 30 days.
                </p>
              )}
              <p className="text-ink-faint">
                Note: popularity metrics like stars and forks are tracked separately from engineering activity — a
                popular project is not automatically a healthy one.
              </p>
            </div>
          ) : (
            <UnavailableNote reason="Repository activity data unavailable." />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
