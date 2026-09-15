import { notFound } from "next/navigation";
import { getScan } from "@/lib/store/scanStore";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { UnavailableNote } from "@/components/ui/States";
import { RiskBadge } from "@/components/ui/RiskBadge";

export default async function MaintenancePage({ params }: { params: { scanId: string } }) {
  const scan = await getScan(params.scanId);
  if (!scan) notFound();

  const maintenance = scan.maintenanceAnalysis;
  const maintenanceScore = scan.health.categories.find((c) => c.category === "maintenance");

  if (!maintenance || !maintenance.dataAvailable) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <UnavailableNote reason="Maintenance data unavailable: package registry metadata could not be retrieved." />
      </div>
    );
  }

  const staleDeps = scan.dependencyAnalysis?.dependencies.filter((d) => d.maintenanceStatus === "stale" || d.maintenanceStatus === "aging") ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr]">
        <Card><CardBody className="flex flex-col items-center justify-center gap-2 py-8"><ScoreRing score={maintenanceScore?.score ?? null} size={140} label="Maintenance Health" /></CardBody></Card>
        <Card>
          <CardHeader><p className="font-display text-sm font-medium text-ink">Maintenance signals</p></CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div><p className="font-mono text-xl font-semibold text-ink">{maintenance.deprecatedDependencyCount}</p><p className="text-xs text-ink-faint">Deprecated</p></div>
              <div><p className="font-mono text-xl font-semibold text-ink">{maintenance.staleDependencyCount}</p><p className="text-xs text-ink-faint">Stale (24mo+)</p></div>
              <div><p className="font-mono text-xl font-semibold text-ink">{maintenance.agingDependencyCount}</p><p className="text-xs text-ink-faint">Aging (12–24mo)</p></div>
              <div><p className="font-mono text-xl font-semibold text-ink">{maintenance.longVersionLagCount}</p><p className="text-xs text-ink-faint">2+ majors behind</p></div>
            </div>
            <ul className="mt-5 space-y-1.5 border-t border-line pt-4">
              {maintenance.notes.map((note, i) => <li key={i} className="text-sm text-ink-muted">{note}</li>)}
            </ul>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader><p className="font-display text-sm font-medium text-ink">Aging &amp; stale dependencies</p></CardHeader>
        <CardBody>
          {staleDeps.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">No aging or stale dependencies detected.</p>
          ) : (
            <div className="space-y-2">
              {staleDeps.map((dep) => (
                <div key={dep.name} className="flex items-center justify-between rounded-md border border-line-subtle px-3 py-2.5">
                  <div>
                    <p className="font-mono text-sm text-ink">{dep.name}</p>
                    <p className="text-xs text-ink-faint">{dep.lastPublishedAt ? `Last published ${new Date(dep.lastPublishedAt).toLocaleDateString()}` : "Last publish date unknown"}</p>
                  </div>
                  <RiskBadge severity={dep.maintenanceStatus === "stale" ? "medium" : "low"} />
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
