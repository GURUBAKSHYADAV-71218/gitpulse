import Link from "next/link";

import { ArrowRight } from "lucide-react";

export function WhyItMatters() {
  return (
    <section className="border-b border-line">
      <div className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="font-display text-2xl font-semibold text-ink">
          Why engineering health matters
        </h2>

        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-ink-muted">
          Outdated dependencies, unpatched vulnerabilities, and thinning contributor coverage rarely announce
          themselves. They accumulate quietly until a security incident, a broken build, or a departing maintainer
          turns them into an emergency. GitPulse surfaces these risks early, with evidence, so they can be addressed
          on your own timeline instead of someone else&apos;s.
        </p>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section>
      <div className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h2 className="font-display text-2xl font-semibold text-ink sm:text-3xl">
          Run your first Engineering Health scan
        </h2>

        <p className="mt-3 text-sm text-ink-muted">
          Takes under a minute. No account required.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/scan?mode=github"
            className="focus-ring inline-flex items-center gap-2 rounded-md bg-brand px-5 py-3 text-sm font-medium text-bg transition-colors hover:bg-brand-bright"
          >
            Analyze GitHub Repository
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/scan?mode=upload"
            className="focus-ring inline-flex items-center gap-2 rounded-md border border-line bg-bg-surface px-5 py-3 text-sm font-medium text-ink transition-colors hover:border-ink-faint"
          >
            Upload package.json
          </Link>
        </div>
      </div>
    </section>
  );
}