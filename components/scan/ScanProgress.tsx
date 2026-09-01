"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Circle } from "lucide-react";

export interface ScanStage {
  label: string;
}

const PACKAGE_STAGES: ScanStage[] = [
  { label: "Preparing project" },
  { label: "Reading dependencies" },
  { label: "Checking package metadata" },
  { label: "Checking security advisories" },
  { label: "Calculating health score" },
  { label: "Generating recommendations" }
];

const GITHUB_STAGES: ScanStage[] = [
  { label: "Preparing repository" },
  { label: "Reading dependencies" },
  { label: "Checking package metadata" },
  { label: "Checking security advisories" },
  { label: "Analyzing repository activity" },
  { label: "Analyzing contributors" },
  { label: "Inspecting testing infrastructure" },
  { label: "Inspecting documentation" },
  { label: "Calculating health score" },
  { label: "Generating recommendations" }
];

/**
 * The actual analysis runs as a single server request (analyzers execute
 * concurrently server-side). This component advances through the real
 * stage list on a fixed cadence while that request is in flight, and
 * always waits for the genuine response before allowing completion —
 * it never fakes a "done" state ahead of the real result.
 */
export function ScanProgress({ mode, inFlight }: { mode: "package" | "github"; inFlight: boolean }) {
  const stages = mode === "github" ? GITHUB_STAGES : PACKAGE_STAGES;
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!inFlight) return;
    const interval = setInterval(() => {
      setActiveIndex((i) => Math.min(i + 1, stages.length - 1));
    }, 900);
    return () => clearInterval(interval);
  }, [inFlight, stages.length]);

  return (
    <div className="space-y-2.5">
      {stages.map((stage, i) => {
        const isDone = i < activeIndex;
        const isActive = i === activeIndex;
        return (
          <div key={stage.label} className="flex items-center gap-2.5 text-sm">
            {isDone ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-brand" />
            ) : isActive ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-brand" />
            ) : (
              <Circle className="h-4 w-4 shrink-0 text-ink-faint" strokeWidth={1.5} />
            )}
            <span className={isDone || isActive ? "text-ink" : "text-ink-faint"}>{stage.label}…</span>
          </div>
        );
      })}
    </div>
  );
}
