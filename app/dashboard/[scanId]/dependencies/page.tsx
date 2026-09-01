import { notFound } from "next/navigation";
import { getScan } from "@/lib/store/scanStore";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { DependencyTable } from "@/components/dashboard/DependencyTable";
import { MetricCard } from "@/components/dashboard/InfoCards";
import { EmptyState } from "@/components/ui/States";

export default async function DependenciesPage({ params }: { params: { scanId: string } }) {
  const scan = await getScan(params.scanId);
  if (!scan) notFound();

  const analysis = scan.dependencyAnalysis;

  if (!analysis || analysis.totalCount === 0) {
    return (
      <div className="mx-auto max-w-6xl">
        <EmptyState
          title="No dependency data"
          description="This scan didn't include a package.json, or it declared no dependencies."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total dependencies" value={String(analysis.totalCount)} />
        <MetricCard label="Outdated" value={String(analysis.outdatedCount)} hint={`${analysis.majorUpdateCount} major`} />
        <MetricCard label="Deprecated" value={String(analysis.deprecatedCount)} />
        <MetricCard label="Registry unavailable" value={String(analysis.registryUnavailableCount)} />
      </div>

      <Card>
        <CardHeader>
          <p className="font-display text-sm font-medium text-ink">All dependencies</p>
        </CardHeader>
        <CardBody>
          <DependencyTable dependencies={analysis.dependencies} />
        </CardBody>
      </Card>
    </div>
  );
}
