import { notFound } from "next/navigation";

import { getScan } from "@/lib/store/scanStore";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { MetricCard } from "@/components/dashboard/InfoCards";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { UnavailableNote } from "@/components/ui/States";
import { CheckCircle2, XCircle } from "lucide-react";

function Check({
  ok,
  label,
}: {
  ok: boolean;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <CheckCircle2
          className="h-4 w-4 text-status-low"
          strokeWidth={1.75}
        />
      ) : (
        <XCircle
          className="h-4 w-4 text-ink-faint"
          strokeWidth={1.75}
        />
      )}

      <span className={ok ? "text-ink" : "text-ink-faint"}>
        {label}
      </span>
    </div>
  );
}

export default async function TestingPage({
  params,
}: {
  params: { scanId: string };
}) {
  const scan = await getScan(params.scanId);

  if (!scan) notFound();

  const testing = scan.testingAnalysis;

  const testingScore = scan.health.categories.find(
    (c) => c.category === "testing"
  );

  if (!testing || !testing.dataAvailable) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <UnavailableNote
          reason={
            testing?.unavailableReason ??
            "Testing infrastructure data unavailable. This scan may not have used a GitHub repository as its source."
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr]">
        <Card>
          <CardBody className="flex flex-col items-center justify-center gap-2 py-8">
            <ScoreRing
              score={testingScore?.score ?? null}
              size={140}
              label="Testing Health"
            />
          </CardBody>
        </Card>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <MetricCard
            label="Test files detected"
            value={String(testing.testFileCount)}
          />

          <MetricCard
            label="Test directories"
            value={String(testing.testDirectories.length)}
          />

          <MetricCard
            label="Frameworks detected"
            value={String(testing.detectedFrameworks.length)}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <p className="font-display text-sm font-medium text-ink">
            Testing infrastructure detected
          </p>
        </CardHeader>

        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {testing.detectedFrameworks.length > 0 ? (
              testing.detectedFrameworks.map((fw) => (
                <span
                  key={fw}
                  className="rounded-full border border-line bg-bg-raised px-3 py-1 text-xs font-mono text-ink"
                >
                  {fw}
                </span>
              ))
            ) : (
              <p className="text-sm text-ink-muted">
                No recognized test framework detected.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 border-t border-line pt-4 sm:grid-cols-2">
            <Check
              ok={testing.hasCiConfig}
              label="Continuous integration configuration detected"
            />

            <Check
              ok={testing.testFileCount > 0}
              label="Test files detected"
            />
          </div>

          {testing.testDirectories.length > 0 && (
            <div className="border-t border-line pt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
                Test directories
              </p>

              <ul className="space-y-1 font-mono text-xs text-ink-faint">
                {testing.testDirectories.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="border-t border-line pt-4 text-xs text-ink-faint">
            GitPulse detects testing infrastructure by inspecting the
            repository&apos;s file tree and declared dependencies. It does not
            execute any repository code, so it cannot report whether tests
            actually pass — only whether infrastructure is present.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}