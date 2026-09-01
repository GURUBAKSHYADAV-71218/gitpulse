import { parseVersion } from "../utils/semver";
import type { DependencyAnalysis, MaintenanceAnalysis } from "../types";

/**
 * Evaluates dependency maintenance signals: staleness (time since last
 * publish), deprecation, and "long version lag" (declared range is more
 * than two majors behind latest). This is separate from security analysis:
 * an old package is not automatically a vulnerability, and a recently
 * updated package is not automatically safe.
 */
export function analyzeMaintenance(dependencyAnalysis: DependencyAnalysis): MaintenanceAnalysis {
  const { dependencies } = dependencyAnalysis;

  const staleDependencyCount = dependencies.filter((d) => d.maintenanceStatus === "stale" && !d.isDeprecated).length;
  const agingDependencyCount = dependencies.filter((d) => d.maintenanceStatus === "aging").length;
  const deprecatedDependencyCount = dependencies.filter((d) => d.isDeprecated).length;

  let longVersionLagCount = 0;
  for (const dep of dependencies) {
    if (!dep.currentResolvedVersion || !dep.latestVersion) continue;
    const current = parseVersion(dep.currentResolvedVersion);
    const latest = parseVersion(dep.latestVersion);
    if (!current || !latest) continue;
    if (latest.major - current.major >= 2) longVersionLagCount++;
  }

  const dataAvailable = dependencies.some((d) => !d.registryLookupFailed);

  const notes: string[] = [];
  if (deprecatedDependencyCount > 0) {
    notes.push(`${deprecatedDependencyCount} ${deprecatedDependencyCount === 1 ? "dependency is" : "dependencies are"} officially deprecated.`);
  }
  if (staleDependencyCount > 0) {
    notes.push(`${staleDependencyCount} ${staleDependencyCount === 1 ? "dependency has" : "dependencies have"} not been published to in over 24 months.`);
  }
  if (longVersionLagCount > 0) {
    notes.push(`${longVersionLagCount} ${longVersionLagCount === 1 ? "dependency is" : "dependencies are"} two or more major versions behind latest.`);
  }
  if (notes.length === 0 && dataAvailable) {
    notes.push("No significant maintenance concerns detected among analyzed dependencies.");
  }
  if (!dataAvailable) {
    notes.push("Maintenance data unavailable: package registry metadata could not be retrieved.");
  }

  return {
    staleDependencyCount,
    agingDependencyCount,
    deprecatedDependencyCount,
    longVersionLagCount,
    dataAvailable,
    notes
  };
}
