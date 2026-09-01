import { ScoreRing } from "@/components/ui/ScoreRing";
import { RiskBadge } from "@/components/ui/RiskBadge";

const EXAMPLE_CATEGORIES = [
  { label: "Dependency Health", score: 91 },
  { label: "Security Health", score: 78 },
  { label: "Maintenance Health", score: 86 },
  { label: "Repository Activity", score: 90 },
  { label: "Contributor Health", score: 71 },
  { label: "Testing Health", score: 82 },
  { label: "Documentation Health", score: 88 }
];

export function ExampleReport() {
  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <div className="mb-2 flex items-center gap-2">
          <h2 className="font-display text-2xl font-semibold text-ink">An example Engineering Health Report</h2>
        </div>
        <p className="mb-10 max-w-2xl text-sm text-ink-muted">
          Illustrative only — every value shown here is a placeholder for the layout. Real scans replace every
          number with live analysis of your project.
        </p>

        <div className="overflow-hidden rounded-xl border border-line bg-bg-surface shadow-card">
          <div className="grid grid-cols-1 gap-8 p-8 md:grid-cols-[auto_1fr]">
            <div className="flex flex-col items-center justify-center gap-3">
              <ScoreRing score={84} size={140} />
              <p className="text-center text-xs text-ink-muted">Healthy with improvements recommended</p>
            </div>
            <div className="space-y-3">
              {EXAMPLE_CATEGORIES.map((cat) => (
                <div key={cat.label} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 text-xs text-ink-muted">{cat.label}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-raised">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${cat.score}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right font-mono text-xs tabular text-ink">{cat.score}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-line bg-bg-raised/40 p-6">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-ink-muted">Sample findings</p>
            <div className="flex flex-wrap gap-2">
              <RiskBadge severity="high" />
              <span className="text-xs text-ink-muted">High severity vulnerability in a transitive dependency</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <RiskBadge severity="medium" />
              <span className="text-xs text-ink-muted">High contributor concentration</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
