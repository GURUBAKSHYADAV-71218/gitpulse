import { Search, Cpu, FileCheck } from "lucide-react";

const STEPS = [
  {
    icon: Search,
    title: "Point GitPulse at your project",
    description: "Provide a public GitHub repository URL, or upload a package.json directly."
  },
  {
    icon: Cpu,
    title: "Real analysis runs across eight dimensions",
    description:
      "GitPulse queries the npm registry, GitHub's API, and OSV security advisories, then parses versions, structure, and activity."
  },
  {
    icon: FileCheck,
    title: "Get an explainable health report",
    description: "A scored, evidence-backed report with prioritized recommendations you can act on immediately."
  }
];

export function HowItWorks() {
  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="font-display text-2xl font-semibold text-ink">How GitPulse works</h2>
        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="relative">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md border border-line bg-bg-surface">
                <step.icon className="h-5 w-5 text-brand" strokeWidth={1.75} />
              </div>
              <h3 className="font-display text-base font-medium text-ink">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
