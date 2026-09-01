"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import clsx from "clsx";
import { RiskBadge } from "@/components/ui/RiskBadge";
import type { DependencyRecord } from "@/lib/types";

type Filter = "all" | "current" | "outdated" | "major" | "minor" | "vulnerable" | "deprecated";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "current", label: "Current" },
  { key: "outdated", label: "Outdated" },
  { key: "major", label: "Major" },
  { key: "minor", label: "Minor" },
  { key: "vulnerable", label: "Vulnerable" },
  { key: "deprecated", label: "Deprecated" }
];

function updateLabel(type: DependencyRecord["updateType"]): string {
  switch (type) {
    case "current":
      return "Up to date";
    case "patch":
      return "Patch";
    case "minor":
      return "Minor";
    case "major":
      return "Major";
    default:
      return "Unknown";
  }
}

function updateColor(type: DependencyRecord["updateType"]): string {
  switch (type) {
    case "current":
      return "text-status-low";
    case "patch":
      return "text-ink-muted";
    case "minor":
      return "text-status-medium";
    case "major":
      return "text-status-high";
    default:
      return "text-ink-faint";
  }
}

export function DependencyTable({ dependencies }: { dependencies: DependencyRecord[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    return dependencies.filter((dep) => {
      if (query && !dep.name.toLowerCase().includes(query.toLowerCase())) return false;
      switch (filter) {
        case "current":
          return dep.updateType === "current";
        case "outdated":
          return dep.updateType === "patch" || dep.updateType === "minor" || dep.updateType === "major";
        case "major":
          return dep.updateType === "major";
        case "minor":
          return dep.updateType === "minor";
        case "vulnerable":
          return dep.vulnerabilities.length > 0;
        case "deprecated":
          return dep.isDeprecated;
        default:
          return true;
      }
    });
  }, [dependencies, query, filter]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            type="text"
            placeholder="Search packages"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="focus-ring w-full rounded-md border border-line bg-bg-raised py-2 pl-9 pr-3 text-sm text-ink placeholder:text-ink-faint"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={clsx(
                "focus-ring rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                filter === f.key
                  ? "border-brand/40 bg-brand/10 text-brand"
                  : "border-line text-ink-muted hover:text-ink"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-lg border border-line md:block">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-bg-raised text-left text-xs uppercase tracking-wide text-ink-muted">
              <th className="px-4 py-2.5 font-medium">Package</th>
              <th className="px-4 py-2.5 font-medium">Current</th>
              <th className="px-4 py-2.5 font-medium">Latest</th>
              <th className="px-4 py-2.5 font-medium">Update</th>
              <th className="px-4 py-2.5 font-medium">Security</th>
              <th className="px-4 py-2.5 font-medium">Deprecated</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((dep) => (
              <tr key={dep.name} className="border-b border-line-subtle last:border-0 hover:bg-bg-raised/60">
                <td className="px-4 py-2.5 font-mono text-ink">{dep.name}</td>
                <td className="px-4 py-2.5 font-mono text-ink-muted">
                  {dep.currentResolvedVersion ?? dep.declaredRange}
                </td>
                <td className="px-4 py-2.5 font-mono text-ink-muted">{dep.latestVersion ?? "Unknown"}</td>
                <td className={clsx("px-4 py-2.5 font-medium", updateColor(dep.updateType))}>
                  {updateLabel(dep.updateType)}
                </td>
                <td className="px-4 py-2.5">
                  {dep.vulnerabilities.length > 0 ? (
                    <RiskBadge severity={dep.vulnerabilities[0]!.severity} />
                  ) : (
                    <span className="text-ink-faint">None detected</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {dep.isDeprecated ? (
                    <span className="text-status-high">Yes</span>
                  ) : (
                    <span className="text-ink-faint">No</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-ink-muted">No dependencies match this filter.</p>
        )}
      </div>

      {/* Mobile cards */}
      <div className="space-y-2 md:hidden">
        {filtered.map((dep) => (
          <div key={dep.name} className="rounded-lg border border-line bg-bg-surface p-3">
            <div className="flex items-center justify-between">
              <span className="font-mono text-sm text-ink">{dep.name}</span>
              <span className={clsx("text-xs font-medium", updateColor(dep.updateType))}>{updateLabel(dep.updateType)}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs text-ink-muted">
              <span className="font-mono">
                {dep.currentResolvedVersion ?? dep.declaredRange} → {dep.latestVersion ?? "Unknown"}
              </span>
              {dep.vulnerabilities.length > 0 && <RiskBadge severity={dep.vulnerabilities[0]!.severity} />}
            </div>
            {dep.isDeprecated && <p className="mt-1.5 text-xs text-status-high">Deprecated</p>}
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-ink-muted">No dependencies match this filter.</p>
        )}
      </div>
    </div>
  );
}
