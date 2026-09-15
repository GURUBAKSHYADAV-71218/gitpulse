import { TtlCache, mapWithConcurrency, fetchWithTimeout } from "../utils/cache";

export interface NpmPackageMetadata {
  name: string;
  latestVersion: string | null;
  deprecated: string | null;
  lastPublishedAt: string | null;
  found: boolean;
  error: string | null;
}

const REGISTRY_BASE = "https://registry.npmjs.org";
const CONCURRENCY_LIMIT = 8;
const CACHE_TTL_MS = 15 * 60 * 1000;

const metadataCache = new TtlCache<NpmPackageMetadata>(CACHE_TTL_MS);

function unavailable(name: string, error: string): NpmPackageMetadata {
  return { name, latestVersion: null, deprecated: null, lastPublishedAt: null, found: false, error };
}

/**
 * Fetches metadata for a single package. Never throws — any failure
 * (network, 404, 429, 5xx, malformed JSON) is captured and returned as an
 * "unavailable" result so one bad dependency can never crash the whole scan.
 */
async function fetchOne(name: string): Promise<NpmPackageMetadata> {
  const cacheKey = `npm:${name}`;
  return metadataCache.getOrCompute(cacheKey, async () => {
    let response: Response;
    try {
      response = await fetchWithTimeout(
        `${REGISTRY_BASE}/${encodeURIComponent(name)}`,
        { headers: { Accept: "application/vnd.npm.install-v1+json" } },
        8000
      );
    } catch (err) {
      return unavailable(name, err instanceof Error ? err.message : "network timeout");
    }

    if (response.status === 404) return unavailable(name, "package not found on npm registry");
    if (response.status === 429) return unavailable(name, "npm registry rate limit exceeded");
    if (!response.ok) return unavailable(name, `npm registry returned HTTP ${response.status}`);

    try {
      const json = await response.json();
      const latestTag: string | undefined = json?.["dist-tags"]?.latest;
      const time = json?.time ?? {};
      const lastPublishedAt = latestTag && time[latestTag] ? time[latestTag] : null;
      const deprecatedMsg: string | undefined = latestTag ? json?.versions?.[latestTag]?.deprecated : undefined;

      return {
        name,
        latestVersion: latestTag ?? null,
        deprecated: deprecatedMsg ?? null,
        lastPublishedAt,
        found: true,
        error: null
      };
    } catch {
      return unavailable(name, "invalid response from npm registry");
    }
  });
}

/** Fetches metadata for many packages with bounded concurrency; individual failures don't affect other packages. */
export async function fetchNpmMetadataBatch(names: string[]): Promise<Map<string, NpmPackageMetadata>> {
  const unique = Array.from(new Set(names));
  const results = await mapWithConcurrency(unique, CONCURRENCY_LIMIT, (name) => fetchOne(name));
  const map = new Map<string, NpmPackageMetadata>();
  unique.forEach((name, i) => {
    const result = results[i];
    if (result) map.set(name, result);
  });
  return map;
}
