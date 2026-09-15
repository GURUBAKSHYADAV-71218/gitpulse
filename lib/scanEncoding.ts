import { gzipSync, gunzipSync } from "zlib";
import type { DependencyRecord, ScanRecord } from "./types";

// ---------------------------------------------------------------------------
// WHY THIS FILE EXISTS
// ---------------------------------------------------------------------------
// Vercel serverless functions do not provide reliable persistent writable
// storage across requests: each invocation may run on a different instance,
// the filesystem is ephemeral, and the deployment bundle itself is
// read-only. A JSON-file-backed "database" works in local development and
// silently breaks in production the moment a scan and its dashboard view
// land on different function instances.
//
// Rather than introduce a real database just to make a "create a scan, then
// look it up" flow work (out of scope for this MVP), GitPulse makes the
// scan ID itself a compressed, URL-safe, self-contained encoding of the
// entire scan result. Retrieving a scan by ID never touches storage at
// all — it just decodes the ID. This is the same approach the product
// brief explicitly calls out ("stateless scan result identifiers" /
// "URL-safe serialized result references") and it works identically in
// local dev and in every Vercel region with zero additional infrastructure.
//
// Trade-off, stated plainly: scan URLs are long (they contain the report),
// and sharing/bookmarking a scan means sharing/bookmarking that URL. Local
// scan *history* (a list of past scans) is a separate, best-effort,
// dev-only convenience — see lib/store/scanStore.ts.
// ---------------------------------------------------------------------------

// Keep encoded tokens from growing unbounded for very large monorepos with
// hundreds of dependencies. Counts and scores are always computed from the
// full, real dataset; only the per-dependency detail list is capped for
// transfer size, and the UI states this explicitly when it happens.
const MAX_DEPENDENCIES_IN_TOKEN = 150;

function dependencyPriority(dep: DependencyRecord): number {
  if (dep.vulnerabilities.length > 0) return 3;
  if (dep.isDeprecated) return 2;
  if (dep.updateType === "major") return 1;
  return 0;
}

function truncateForEncoding(payload: Omit<ScanRecord, "id">): Omit<ScanRecord, "id"> {
  const deps = payload.dependencyAnalysis;
  if (!deps || deps.dependencies.length <= MAX_DEPENDENCIES_IN_TOKEN) {
    return payload;
  }

  const kept = [...deps.dependencies]
    .sort((a, b) => dependencyPriority(b) - dependencyPriority(a))
    .slice(0, MAX_DEPENDENCIES_IN_TOKEN)
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    ...payload,
    dependencyAnalysis: {
      ...deps,
      dependencies: kept,
      truncatedForTransfer: true,
      truncatedFullCount: deps.dependencies.length
    }
  };
}

/** Encodes a scan payload (everything except its id) into a URL-safe token. */
export function encodeScanPayload(payload: Omit<ScanRecord, "id">): string {
  const prepared = truncateForEncoding(payload);
  const json = JSON.stringify(prepared);
  const compressed = gzipSync(Buffer.from(json, "utf-8"));
  return compressed.toString("base64url");
}

/**
 * Decodes a scan token back into a full ScanRecord. Returns null for any
 * malformed, tampered, or truncated token rather than throwing — a bad
 * scan ID in a URL is an expected, recoverable condition (e.g. a stale
 * bookmark), not a server error.
 */
export function decodeScanToken(token: string): ScanRecord | null {
  if (!token || token.length > 500_000) return null; // reject absurd input early
  try {
    const compressed = Buffer.from(token, "base64url");
    const json = gunzipSync(compressed).toString("utf-8");
    const payload = JSON.parse(json) as Omit<ScanRecord, "id">;
    return { ...payload, id: token };
  } catch {
    return null;
  }
}
