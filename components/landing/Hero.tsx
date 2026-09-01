import Link from "next/link";
import { Activity, ArrowRight, Upload } from "lucide-react";
import { PulseLine } from "@/components/ui/PulseLine";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-line">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-line to-transparent" />
      <div className="mx-auto max-w-4xl px-6 py-24 text-center sm:py-32">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-line bg-bg-surface px-3 py-1 text-xs font-medium text-ink-muted">
          <Activity className="h-3.5 w-3.5 text-brand" />
          Engineering Health Platform
        </div>
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink sm:text-6xl">
          Understand the health of your codebase{" "}
          <span className="text-brand">before problems become incidents.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-ink-muted sm:text-lg">
          Analyze dependencies, security, maintenance, repository activity and engineering risks from one unified
          dashboard.
        </p>

        <div className="mx-auto mt-10 h-10 max-w-md text-brand/70">
          <PulseLine className="h-full w-full" />
        </div>

        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
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
            <Upload className="h-4 w-4" />
            Upload package.json
          </Link>
        </div>
      </div>
    </section>
  );
}
