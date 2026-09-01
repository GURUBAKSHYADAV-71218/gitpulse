import { fetchWithTimeout } from "../utils/cache";
import type { Severity, VulnerabilityRecord } from "../types";

// OSV (Open Source Vulnerabilities, https://osv.dev) aggregates advisories
// from the GitHub Advisory Database and other ecosystem sources, and
// provides a free batch query API keyed by package + version. GitPulse uses
// it as its sole security data source: if this call fails, GitPulse reports
// security data as unavailable rather than guessing.

const OSV_API_URL = process.env.OSV_API_URL || "https://api.osv.dev/v1";

interface OsvQueryPackage {
  name: string;
  version: string | null;
}

interface OsvSeverityEntry {
  type: string;
  score: string;
}

interface OsvVulnEntry {
  id: string;
  summary?: string;
  details?: string;
  severity?: OsvSeverityEntry[];
  database_specific?: { severity?: string };
  affected?: Array<{
    ranges?: Array<{ events?: Array<{ introduced?: string; fixed?: string }> }>;
  }>;
  references?: Array<{ url: string }>;
}

export interface OsvResult {
  dataAvailable: boolean;
  unavailableReason: string | null;
  vulnerabilities: VulnerabilityRecord[];
}

function normalizeSeverity(entry: OsvVulnEntry): Severity {
  const dbSeverity = entry.database_specific?.severity?.toLowerCase();
  if (dbSeverity === "critical" || dbSeverity === "high" || dbSeverity === "moderate" || dbSeverity === "low") {
    return dbSeverity === "moderate" ? "medium" : (dbSeverity as Severity);
  }

  const cvssEntry = entry.severity?.find((s) => s.type.startsWith("CVSS"));
  if (cvssEntry) {
    const scoreMatch = /\/(?:AV|S):|(\d+\.\d+)/.exec(cvssEntry.score);
    // CVSS vector strings don't embed a numeric score directly in all versions;
    // fall back to "unknown" rather than mis-parsing a vector string as a number.
    if (!scoreMatch) return "unknown";
  }

  return "unknown";
}

/**
 * Queries OSV.dev's batch endpoint for a set of npm packages at their
 * resolved versions. Packages with an indeterminate resolved version are
 * skipped (OSV requires either a version or a commit to query against).
 */
export async function fetchVulnerabilities(
  packages: Array<{ name: string; version: string | null }>
): Promise<OsvResult> {
  const queryable: OsvQueryPackage[] = packages.filter((p) => p.version !== null);

  if (queryable.length === 0) {
    return { dataAvailable: true, unavailableReason: null, vulnerabilities: [] };
  }

  const queries = queryable.map((p) => ({
    package: { name: p.name, ecosystem: "npm" },
    version: p.version
  }));

  let response: Response;
  try {
    response = await fetchWithTimeout(
      `${OSV_API_URL}/querybatch`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queries })
      },
      12000
    );
  } catch (err) {
    return {
      dataAvailable: false,
      unavailableReason: `Security advisory data unavailable (${err instanceof Error ? err.message : "network error"}).`,
      vulnerabilities: []
    };
  }

  if (response.status === 429) {
    return {
      dataAvailable: false,
      unavailableReason: "Security advisory data unavailable (OSV rate limit exceeded).",
      vulnerabilities: []
    };
  }
  if (!response.ok) {
    return {
      dataAvailable: false,
      unavailableReason: `Security advisory data unavailable (OSV returned HTTP ${response.status}).`,
      vulnerabilities: []
    };
  }

  let batchJson: { results?: Array<{ vulns?: Array<{ id: string }> }> };
  try {
    batchJson = await response.json();
  } catch {
    return {
      dataAvailable: false,
      unavailableReason: "Security advisory data unavailable (invalid response from OSV).",
      vulnerabilities: []
    };
  }

  const results = batchJson.results ?? [];
  const idsToFetch: string[] = [];
  results.forEach((r) => (r.vulns ?? []).forEach((v) => idsToFetch.push(v.id)));
  const uniqueIds = Array.from(new Set(idsToFetch));

  if (uniqueIds.length === 0) {
    return { dataAvailable: true, unavailableReason: null, vulnerabilities: [] };
  }

  // Batch query only returns IDs; fetch full details for each unique advisory.
  const detailMap = new Map<string, OsvVulnEntry>();
  await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        const res = await fetchWithTimeout(`${OSV_API_URL}/vulns/${encodeURIComponent(id)}`, {}, 8000);
        if (res.ok) {
          const json = (await res.json()) as OsvVulnEntry;
          detailMap.set(id, json);
        }
      } catch {
        // Skip individual advisory detail failures; the ID is still known,
        // it will just render with reduced detail below.
      }
    })
  );

  const vulnerabilities: VulnerabilityRecord[] = [];
  results.forEach((r, i) => {
    const pkg = queryable[i];
    if (!pkg) return;
    (r.vulns ?? []).forEach((v) => {
      const detail = detailMap.get(v.id);
      const fixedVersion =
        detail?.affected?.[0]?.ranges?.[0]?.events?.find((e) => e.fixed)?.fixed ?? null;

      vulnerabilities.push({
        id: v.id,
        packageName: pkg.name,
        installedVersion: pkg.version,
        severity: detail ? normalizeSeverity(detail) : "unknown",
        summary: detail?.summary || detail?.details?.slice(0, 240) || "No summary provided by advisory source.",
        affectedRange: null,
        fixedVersion,
        source: "OSV",
        referenceUrl: detail?.references?.[0]?.url ?? `https://osv.dev/vulnerability/${v.id}`
      });
    });
  });

  return { dataAvailable: true, unavailableReason: null, vulnerabilities };
}
