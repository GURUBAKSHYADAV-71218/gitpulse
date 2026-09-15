import Link from "next/link";
import { Activity, ArrowUpRight } from "lucide-react";
import { listScanHistory, localHistoryEnabled } from "@/lib/store/scanStore";
import { Card, CardBody } from "@/components/ui/Card";
import { EmptyState, UnavailableNote } from "@/components/ui/States";
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
          <Link href="/" className="font-display text-lg font-semibold text-ink">GitPulse</Link>
        </div>
        <LinkButton href="/scan" variant="secondary">New scan</LinkButton>
      </div>

      <h1 className="mb-1 font-display text-2xl font-semibold text-ink">Scan history</h1>

      {localHistoryEnabled ? (
        <p className="mb-8 text-sm text-ink-muted">Every scan run in this local environment, most recent first.</p>
      ) : (
        <div className="mb-8">
          <UnavailableNote reason="Scan history isn't available on this deployment: it requires persistent server storage, which this serverless environment doesn't provide. Individual scan results still work normally — bookmark or share a scan's URL directly to return to it, since each scan link is self-contained." />
        </div>
      )}

      {history.length === 0 ? (
        <EmptyState
          title="No scans yet"
          description={localHistoryEnabled ? "Run your first Engineering Health scan to see it appear here." : "Run a scan to get a shareable report link."}
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
                    <p className="text-xs text-ink-faint">{new Date(entry.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className={`font-mono text-lg font-semibold tabular ${scoreColor(entry.overallScore)}`}>{entry.overallScore ?? "—"}</span>
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
