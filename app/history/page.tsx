import Link from "next/link";
import { Activity, ArrowUpRight } from "lucide-react";
import { listScanHistory } from "@/lib/store/scanStore";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/States";
import { LinkButton } from "@/components/ui/Button";

function scoreColor(score: number | null): string {
  if (score === null) return "text-ink-faint";
  if (score >= 75) return "text-status-low";
  if (score >= 55) return "text-status-medium";
  return "text-status-critical";
}

export default async function HistoryPage() {
  const history = await listScanHistory();

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-brand" strokeWidth={2} />
          <Link href="/" className="font-display text-lg font-semibold text-ink">
            GitPulse
          </Link>
        </div>
        <LinkButton href="/scan" variant="secondary">
          New scan
        </LinkButton>
      </div>

      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">Scan history</h1>
      <p className="mb-8 text-sm text-ink-muted">
        Every scan run in this environment, most recent first. Scan history is stored locally in this deployment;
        see the README for notes on persisting it to a database in production.
      </p>

      {history.length === 0 ? (
        <EmptyState
          title="No scans yet"
          description="Run your first Engineering Health scan to see it appear here."
          action={<LinkButton href="/scan">Run a scan</LinkButton>}
        />
      ) : (
        <div className="space-y-2">
          {history.map((entry) => (
            <Link key={entry.id} href={`/dashboard/${entry.id}/overview`}>
              <Card className="transition-colors hover:border-ink-faint">
                <CardBody className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm text-ink">{entry.source.label}</p>
                    <p className="text-xs text-ink-faint">
                      {new Date(entry.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className={`font-mono text-lg font-semibold tabular ${scoreColor(entry.overallScore)}`}>
                      {entry.overallScore ?? "—"}
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-ink-faint" />
                  </div>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
