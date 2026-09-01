import type { DependencyAnalysis, SecurityAnalysis, Severity } from "../types";

const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low", "unknown"];

/**
 * Aggregates vulnerability data already attached to each dependency (during
 * dependency analysis) into a security-focused summary. Does not perform
 * its own network calls; consumes results the dependency analyzer already
 * retrieved from OSV so a scan never queries the same data twice.
 */
export function analyzeSecurity(dependencyAnalysis: DependencyAnalysis): SecurityAnalysis {
  const vulnerabilities = dependencyAnalysis.dependencies.flatMap((d) => d.vulnerabilities);

  const counts: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 };
  for (const v of vulnerabilities) counts[v.severity]++;

  const sorted = [...vulnerabilities].sort(
    (a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity)
  );

  return {
    vulnerabilities: sorted,
    counts,
    dataAvailable: dependencyAnalysis.securityDataAvailable,
    unavailableReason: dependencyAnalysis.securityDataAvailable
      ? null
      : dependencyAnalysis.securityUnavailableReason
  };
}
