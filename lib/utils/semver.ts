// Lightweight, dependency-free semantic version parsing and range handling.
// Handles plain versions, and common declared ranges (^, ~, >=, <=, >, <, =,
// x-ranges, "*", "latest"). Anything outside this scope (git:, file:,
// workspace:, npm aliases, arbitrary dist-tags) is deliberately treated as
// UNRESOLVABLE rather than guessed at.

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
  const major = match[1];
  const minor = match[2];
  const patch = match[3];
  const prerelease = match[4];
  if (!major || !minor || !patch) return null;
  return {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    prerelease: prerelease ?? null,
    raw: trimmed
  };
}

export function compareVersions(a: ParsedVersion, b: ParsedVersion): number {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  if (a.patch !== b.patch) return a.patch - b.patch;
  if (a.prerelease && !b.prerelease) return -1;
  if (!a.prerelease && b.prerelease) return 1;
  if (a.prerelease && b.prerelease) return a.prerelease.localeCompare(b.prerelease);
  return 0;
}

export type RangeKind = "exact" | "caret" | "tilde" | "gte" | "lte" | "gt" | "lt" | "x-range" | "wildcard" | "unresolvable";

export interface ParsedRange {
  kind: RangeKind;
  baseVersion: ParsedVersion | null;
  raw: string;
}

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
    /^[a-z0-9-]+\/[a-z0-9-._]+$/i.test(raw)
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

  if (/x|X/.test(rest) && !op) {
    const xMatch = /^(\d+)(?:\.(\d+|x|X))?(?:\.(\d+|x|X))?$/.exec(rest);
    if (xMatch && xMatch[1]) {
      const major = Number(xMatch[1]);
      const minor = xMatch[2] && !/x/i.test(xMatch[2]) ? Number(xMatch[2]) : 0;
      const patch = xMatch[3] && !/x/i.test(xMatch[3]) ? Number(xMatch[3]) : 0;
      return { kind: "x-range", baseVersion: { major, minor, patch, prerelease: null, raw: rest }, raw: trimmed };
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
  if (cmp >= 0) return { updateType: "current", resolved: floor };
  if (floor.major !== latest.major) return { updateType: "major", resolved: floor };
  if (floor.minor !== latest.minor) return { updateType: "minor", resolved: floor };
  if (floor.patch !== latest.patch) return { updateType: "patch", resolved: floor };
  return { updateType: "current", resolved: floor };
}

export function formatVersion(v: ParsedVersion | null): string | null {
  if (!v) return null;
  return `${v.major}.${v.minor}.${v.patch}${v.prerelease ? `-${v.prerelease}` : ""}`;
}
