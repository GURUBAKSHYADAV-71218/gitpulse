import type { StructureAnalysis } from "../types";

const KNOWN_DIRECTORIES = [
  "src",
  "app",
  "components",
  "services",
  "controllers",
  "routes",
  "tests",
  "test",
  "__tests__",
  "docs",
  "config",
  "lib",
  "pages",
  "api"
];

/**
 * Reports neutral, factual observations about which conventional directories
 * are present. Deliberately avoids asserting that any one architecture is
 * correct — different stacks and team conventions are equally valid.
 */
export function analyzeStructure(treePaths: string[] | null): StructureAnalysis {
  if (!treePaths) {
    return {
      detectedDirectories: [],
      observations: [],
      dataAvailable: false,
      unavailableReason: "Repository file listing unavailable."
    };
  }

  const topLevelDirs = new Set(
    treePaths
      .map((p) => p.split("/")[0])
      .filter((d): d is string => !!d && KNOWN_DIRECTORIES.includes(d.toLowerCase()))
  );

  const detectedDirectories = Array.from(topLevelDirs);

  const observations: string[] = [];
  if (topLevelDirs.has("src") || topLevelDirs.has("app")) {
    observations.push("Source directory detected.");
  } else {
    observations.push("No conventional source directory (src/ or app/) detected at the repository root.");
  }
  if (topLevelDirs.has("tests") || topLevelDirs.has("test") || topLevelDirs.has("__tests__")) {
    observations.push("Testing directory detected.");
  } else {
    observations.push("Testing directory not detected at the repository root.");
  }
  if (topLevelDirs.has("docs")) {
    observations.push("Documentation directory detected.");
  }
  if (topLevelDirs.has("config")) {
    observations.push("Configuration directory detected.");
  }

  return {
    detectedDirectories,
    observations,
    dataAvailable: true,
    unavailableReason: null
  };
}
