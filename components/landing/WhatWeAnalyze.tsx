import {
  Package,
  ShieldCheck,
  Wrench,
  GitBranch,
  Users,
  FlaskConical,
  FileText,
  LayoutGrid
} from "lucide-react";

const CAPABILITIES = [
  { icon: Package, title: "Dependency Health", description: "Semantic version comparison, update classification, and npm registry metadata." },
  { icon: ShieldCheck, title: "Security Health", description: "Real vulnerability advisories from OSV, scored by severity — never invented." },
  { icon: Wrench, title: "Maintenance Health", description: "Staleness, deprecation, and version lag signals, kept separate from security." },
  { icon: GitBranch, title: "Repository Activity", description: "Commit recency and push activity from the GitHub API — not just star counts." },
  { icon: Users, title: "Contributor Health", description: "Contribution distribution and an estimated bus factor." },
  { icon: FlaskConical, title: "Testing Health", description: "Detected frameworks, test files, and CI configuration." },
  { icon: FileText, title: "Documentation Health", description: "README, LICENSE, and CONTRIBUTING presence and structure." },
  { icon: LayoutGrid, title: "Project Structure", description: "Neutral observations about conventional directory layout." }
];

export function WhatWeAnalyze() {
  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="font-display text-2xl font-semibold text-ink">What GitPulse analyzes</h2>
        <p className="mt-2 max-w-2xl text-sm text-ink-muted">
          Eight engineering dimensions combine into one explainable score. Every finding traces back to real,
          retrieved data — nothing is fabricated to fill a gap.
        </p>
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CAPABILITIES.map((cap) => (
            <div key={cap.title} className="rounded-lg border border-line bg-bg-surface p-4">
              <cap.icon className="mb-3 h-5 w-5 text-brand" strokeWidth={1.75} />
              <h3 className="font-display text-sm font-medium text-ink">{cap.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">{cap.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
