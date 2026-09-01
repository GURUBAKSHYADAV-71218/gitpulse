import { parseRange, parseVersion, classifyUpdate, formatVersion, compareVersions } from "../utils/semver";
import { fetchNpmMetadataBatch } from "../services/npmService";
import { fetchVulnerabilities } from "../services/osvService";
import type { DependencyAnalysis, DependencyRecord, MaintenanceStatus } from "../types";

export interface RawPackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

const DEP_TYPE_ORDER = ["dependencies", "devDependencies", "peerDependencies", "optionalDependencies"] as const;

function classifyMaintenance(lastPublishedAt: string | null, isDeprecated: boolean): MaintenanceStatus {
  if (isDeprecated) return "stale";
  if (!lastPublishedAt) return "unknown";
  const publishedDate = new Date(lastPublishedAt);
  if (Number.isNaN(publishedDate.getTime())) return "unknown";
  const monthsSince = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (monthsSince < 12) return "healthy";
  if (monthsSince < 24) return "aging";
  return "stale";
}

/**
 * Extracts, parses, and enriches every dependency declared in a package.json.
 * Performs live npm registry lookups (batched, cached, concurrency-limited)
 * and OSV vulnerability lookups for resolvable versions. Never fabricates
 * data: anything that cannot be determined is marked accordingly.
 */
export async function analyzeDependencies(pkg: RawPackageJson): Promise<DependencyAnalysis> {
  const entries: Array<{ name: string; range: string; type: (typeof DEP_TYPE_ORDER)[number] }> = [];

  for (const type of DEP_TYPE_ORDER) {
    const group = pkg[type];
    if (!group) continue;
    for (const [name, range] of Object.entries(group)) {
      if (typeof range === "string") entries.push({ name, range, type });
    }
  }

  const uniqueNames = Array.from(new Set(entries.map((e) => e.name)));
  const metadataMap = await fetchNpmMetadataBatch(uniqueNames);

  const preliminary = entries.map((entry) => {
    const meta = metadataMap.get(entry.name);
    const parsedRange = parseRange(entry.range);
    const latestParsed = meta?.latestVersion ? parseVersion(meta.latestVersion) : null;
    const { updateType, resolved } = classifyUpdate(parsedRange, latestParsed);

    const registryLookupFailed = !meta || (!meta.found && !!meta.error);
    const unresolvableRange = parsedRange.kind === "unresolvable";

    const record: DependencyRecord = {
      name: entry.name,
      declaredRange: entry.range,
      dependencyType: entry.type,
      currentResolvedVersion: formatVersion(resolved),
      latestVersion: meta?.latestVersion ?? null,
      updateType,
      isDeprecated: !!meta?.deprecated,
      deprecationMessage: meta?.deprecated ?? null,
      lastPublishedAt: meta?.lastPublishedAt ?? null,
      maintenanceStatus: classifyMaintenance(meta?.lastPublishedAt ?? null, !!meta?.deprecated),
      registryLookupFailed,
      unresolvableRange,
      vulnerabilities: []
    };
    return record;
  });

  // Query vulnerabilities only for dependencies with a concrete resolved version.
  const vulnQueryTargets = preliminary
    .filter((d) => d.currentResolvedVersion !== null)
    .map((d) => ({ name: d.name, version: d.currentResolvedVersion }));

  const osvResult = await fetchVulnerabilities(vulnQueryTargets);
  if (osvResult.dataAvailable) {
    const byPackage = new Map<string, typeof osvResult.vulnerabilities>();
    for (const vuln of osvResult.vulnerabilities) {
      const list = byPackage.get(vuln.packageName) ?? [];
      list.push(vuln);
      byPackage.set(vuln.packageName, list);
    }
    for (const dep of preliminary) {
      dep.vulnerabilities = byPackage.get(dep.name) ?? [];
    }
  }

  // De-duplicate by name (a package can appear in multiple dependency groups;
  // keep the strongest-signal entry: prod dependencies take priority for display).
  const seen = new Map<string, DependencyRecord>();
  for (const dep of preliminary) {
    const existing = seen.get(dep.name);
    if (!existing) {
      seen.set(dep.name, dep);
      continue;
    }
    const priority = (t: string) => DEP_TYPE_ORDER.indexOf(t as (typeof DEP_TYPE_ORDER)[number]);
    if (priority(dep.dependencyType) < priority(existing.dependencyType)) {
      seen.set(dep.name, dep);
    }
  }

  const dependencies = Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));

  return {
    dependencies,
    totalCount: dependencies.length,
    outdatedCount: dependencies.filter((d) => d.updateType === "patch" || d.updateType === "minor" || d.updateType === "major").length,
    majorUpdateCount: dependencies.filter((d) => d.updateType === "major").length,
    deprecatedCount: dependencies.filter((d) => d.isDeprecated).length,
    unresolvableCount: dependencies.filter((d) => d.unresolvableRange).length,
    registryUnavailableCount: dependencies.filter((d) => d.registryLookupFailed).length,
    securityDataAvailable: osvResult.dataAvailable,
    securityUnavailableReason: osvResult.dataAvailable ? null : osvResult.unavailableReason
  };
}

// Re-exported for use by other analyzers that need raw comparisons.
export { compareVersions };
