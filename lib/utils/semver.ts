// Lightweight, dependency-free semantic version parsing and range handling.
//
// This intentionally implements only what GitPulse needs: parsing a plain
// version, parsing common declared ranges (^, ~, >=, <=, >, <, =, x-ranges,
// "*", "latest"), and classifying the relationship between a declared range
// and a resolved "latest" version as current/patch/minor/major.
//
// Anything outside this scope (git:, file:, workspace:, npm aliases, tags
// other than "latest") is deliberately treated as UNRESOLVABLE rather than
// guessed at, per the product's "unable to determine" accuracy principle.

export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
  prerelease: string | null;
  raw: string;
}

const VERSION_RE = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-.]+))?(?:\+[0-9A-Za-z-.]+)?$/;

export function parseVersion(input: string): ParsedVersion | null {
  const trimmed = input.trim();
  const match = VERSION_RE.exec(trimmed);
  if (!match) return null;
  const [, major, minor, patch, prerelease] = match;
  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    prerelease: prerelease ?? null,
    raw: trimmed
  };
}

/** Returns negative if a < b, 0 if equal, positive if a > b. Prereleases sort below release. */
export function compareVersions(a: ParsedVersion, b: ParsedVersion): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;
  if (a.prerelease && !b.prerelease) return -1;
  if (!a.prerelease && b.prerelease) return 1;
  if (a.prerelease && b.prerelease) return a.prerelease.localeCompare(b.prerelease);
  return 0;
}

export type RangeKind =
  | "exact"
  | "caret"
  | "tilde"
  | "gte"
  | "lte"
  | "gt"
  | "lt"
  | "x-range"
  | "wildcard"
  | "unresolvable";

export interface ParsedRange {
  kind: RangeKind;
  baseVersion: ParsedVersion | null;
  raw: string;
}

/**
 * Detects ranges GitPulse cannot safely resolve to a concrete version:
 * git dependencies, local file paths, workspace protocol, npm aliases,
 * and arbitrary dist-tags other than "latest".
 */
function isUnresolvableProtocol(raw: string): boolean {
  return (
    raw.startsWith("git:") ||
    raw.startsWith("git+") ||
    raw.startsWith("file:") ||
    raw.startsWith("workspace:") ||
    raw.startsWith("link:") ||
    raw.startsWith("npm:") ||
    raw.startsWith("http:") ||
    raw.startsWith("https:") ||
    /^[a-z0-9-]+\/[a-z0-9-._]+$/i.test(raw) // "owner/repo" shorthand for GitHub deps
  );
}

export function parseRange(raw: string): ParsedRange {
  const trimmed = raw.trim();

  if (!trimmed || trimmed === "*" || trimmed === "x" || trimmed === "latest") {
    return { kind: "wildcard", baseVersion: null, raw: trimmed };
  }

  if (isUnresolvableProtocol(trimmed)) {
    return { kind: "unresolvable", baseVersion: null, raw: trimmed };
  }

  const opMatch = /^(\^|~|>=|<=|>|<|=)?\s*(.+)$/.exec(trimmed);
  if (!opMatch || !opMatch[2]) return { kind: "unresolvable", baseVersion: null, raw: trimmed };
  const op = opMatch[1];
  const rest = opMatch[2];

  // x-ranges like 1.2.x, 1.x, 1.x.x
  if (/x|X/.test(rest) && !op) {
    const xMatch = /^(\d+)(?:\.(\d+|x|X))?(?:\.(\d+|x|X))?$/.exec(rest);
    if (xMatch && xMatch[1]) {
      const major = Number(xMatch[1]);
      const minor = xMatch[2] && !/x/i.test(xMatch[2]) ? Number(xMatch[2]) : 0;
      const patch = xMatch[3] && !/x/i.test(xMatch[3]) ? Number(xMatch[3]) : 0;
      return {
        kind: "x-range",
        baseVersion: { major, minor, patch, prerelease: null, raw: rest },
        raw: trimmed
      };
    }
  }

  const parsed = parseVersion(rest);
  if (!parsed) return { kind: "unresolvable", baseVersion: null, raw: trimmed };

  switch (op) {
    case "^":
      return { kind: "caret", baseVersion: parsed, raw: trimmed };
    case "~":
      return { kind: "tilde", baseVersion: parsed, raw: trimmed };
    case ">=":
      return { kind: "gte", baseVersion: parsed, raw: trimmed };
    case "<=":
      return { kind: "lte", baseVersion: parsed, raw: trimmed };
    case ">":
      return { kind: "gt", baseVersion: parsed, raw: trimmed };
    case "<":
      return { kind: "lt", baseVersion: parsed, raw: trimmed };
    case "=":
    case undefined:
      return { kind: "exact", baseVersion: parsed, raw: trimmed };
    default:
      return { kind: "unresolvable", baseVersion: null, raw: trimmed };
  }
}

/**
 * Best-effort "resolved current version" for a declared range: the floor
 * version implied by the range. This is an approximation used for display
 * and update-type classification, not a lockfile-accurate resolution
 * (GitPulse does not have access to the project's lockfile).
 */
export function resolveFloorVersion(range: ParsedRange): ParsedVersion | null {
  if (range.kind === "unresolvable" || range.kind === "wildcard") return null;
  return range.baseVersion;
}

export function classifyUpdate(
  range: ParsedRange,
  latest: ParsedVersion | null
): { updateType: import("../types").UpdateType; resolved: ParsedVersion | null } {
  if (range.kind === "unresolvable") return { updateType: "unknown", resolved: null };
  const floor = resolveFloorVersion(range);
  if (!floor || !latest) return { updateType: "unknown", resolved: floor };

  const cmp = compareVersions(floor, latest);
  if (cmp === 0) return { updateType: "current", resolved: floor };
  if (cmp > 0) return { updateType: "current", resolved: floor }; // ahead of registry "latest" tag (e.g. pre-release channel)

  if (floor.major !== latest.major) return { updateType: "major", resolved: floor };
  if (floor.minor !== latest.minor) return { updateType: "minor", resolved: floor };
  if (floor.patch !== latest.patch) return { updateType: "patch", resolved: floor };
  return { updateType: "current", resolved: floor };
}

export function formatVersion(v: ParsedVersion | null): string | null {
  if (!v) return null;
  return `${v.major}.${v.minor}.${v.patch}${v.prerelease ? `-${v.prerelease}` : ""}`;
}
