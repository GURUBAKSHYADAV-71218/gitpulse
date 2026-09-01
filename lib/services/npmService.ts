import { TtlCache, mapWithConcurrency, fetchWithTimeout } from "../utils/cache";

export interface NpmPackageMetadata {
  name: string;
  latestVersion: string | null;
  deprecated: string | null; // deprecation message, or null if not deprecated
  lastPublishedAt: string | null; // ISO date for the "latest" dist-tag version
  found: boolean; // false on 404
  error: string | null; // set on network/5xx/timeout failures
}

const REGISTRY_BASE = "https://registry.npmjs.org";
const CONCURRENCY_LIMIT = 8;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

const metadataCache = new TtlCache<NpmPackageMetadata>(CACHE_TTL_MS);

function unavailable(name: string, error: string): NpmPackageMetadata {
  return {
    name,
    latestVersion: null,
    deprecated: null,
    lastPublishedAt: null,
    found: false,
    error
  };
}

async function fetchOne(name: string): Promise<NpmPackageMetadata> {
  const cacheKey = `npm:${name}`;
  return metadataCache.getOrCompute(cacheKey, async () => {
    let response: Response;
    try {
      // Scoped packages (@scope/name) must be URL-encoded as a single segment.
      response = await fetchWithTimeout(`${REGISTRY_BASE}/${encodeURIComponent(name)}`, {
        headers: { Accept: "application/vnd.npm.install-v1+json" }
      });
    } catch (err) {
      return unavailable(name, err instanceof Error ? err.message : "network timeout");
    }

    if (response.status === 404) {
      return unavailable(name, "package not found on npm registry");
    }
    if (response.status === 429) {
      return unavailable(name, "npm registry rate limit exceeded");
    }
    if (!response.ok) {
      return unavailable(name, `npm registry returned HTTP ${response.status}`);
    }

    try {
      const json = await response.json();
      const latestTag: string | undefined = json?.["dist-tags"]?.latest;
      const time = json?.time ?? {};
      const lastPublishedAt = latestTag && time[latestTag] ? time[latestTag] : null;
      const deprecatedMsg: string | undefined = latestTag
        ? json?.versions?.[latestTag]?.deprecated
        : undefined;

      return {
        name,
        latestVersion: latestTag ?? null,
        deprecated: deprecatedMsg ?? null,
        lastPublishedAt,
        found: true,
        error: null
      };
    } catch (err) {
      return unavailable(name, "invalid response from npm registry");
    }
  });
}

/** Fetches metadata for many packages with bounded concurrency. */
export async function fetchNpmMetadataBatch(
  names: string[]
): Promise<Map<string, NpmPackageMetadata>> {
  const unique = Array.from(new Set(names));
  const results = await mapWithConcurrency(unique, CONCURRENCY_LIMIT, (name) => fetchOne(name));
  const map = new Map<string, NpmPackageMetadata>();
  unique.forEach((name, i) => {
    const result = results[i];
    if (result) map.set(name, result);
  });
  return map;
}
