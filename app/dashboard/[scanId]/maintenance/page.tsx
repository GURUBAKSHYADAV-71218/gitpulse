import { notFound } from "next/navigation";
import { getScan } from "@/lib/store/scanStore";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { MetricCard } from "@/components/dashboard/InfoCards";
import { UnavailableNote } from "@/components/ui/States";

export default async function MaintenancePage({ params }: { params: { scanId: string } }) {
  const scan = await getScan(params.scanId);
  if (!scan) notFound();

  const maintenance = scan.maintenanceAnalysis;
  const maintenanceScore = scan.health.categories.find((c) => c.category === "maintenance");

  if (!maintenance || !maintenance.dataAvailable) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <UnavailableNote reason="Maintenance data unavailable." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr]">
        <Card>
          <CardBody className="flex flex-col items-center justify-center gap-2 py-8">
            <ScoreRing score={maintenanceScore?.score ?? null} size={140} label="Maintenance Health" />
          </CardBody>
        </Card>
        <div className="grid grid-cols-2 gap-4">
          <MetricCard label="Deprecated dependencies" value={String(maintenance.deprecatedDependencyCount)} />
          <MetricCard label="Stale dependencies" value={String(maintenance.staleDependencyCount)} hint="No publish in 24+ months" />
          <MetricCard label="Aging dependencies" value={String(maintenance.agingDependencyCount)} hint="No publish in 12-24 months" />
          <MetricCard label="Long version lag" value={String(maintenance.longVersionLagCount)} hint="2+ majors behind" />
        </div>
      </div>

      <Card>
        <CardHeader>
          <p className="font-display text-sm font-medium text-ink">Notes</p>
        </CardHeader>
        <CardBody>
          <ul className="space-y-2">
            {maintenance.notes.map((note, i) => (
              <li key={i} className="text-sm text-ink-muted">
                {note}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  );
}
