import type { DocumentationAnalysis } from "../types";

const INSTALL_SECTION_PATTERN = /#{1,4}\s*(installation|install|getting started|setup)/i;
const USAGE_SECTION_PATTERN = /#{1,4}\s*(usage|how to use|quick ?start|examples?)/i;

export interface DocumentationAnalyzerInput {
  treePaths: string[] | null;
  readmeContent: string | null;
}

/**
 * Evaluates documentation health from file presence plus light-weight
 * content heuristics (does the README appear to contain install/usage
 * guidance). This intentionally does not attempt to judge writing quality —
 * only structural signals that are reasonably reliable to detect.
 */
export function analyzeDocumentation(input: DocumentationAnalyzerInput): DocumentationAnalysis {
  const { treePaths, readmeContent } = input;

  if (!treePaths) {
    return {
      hasReadme: false,
      readmeLength: null,
      readmeHasInstallSection: false,
      readmeHasUsageSection: false,
      hasLicense: false,
      hasContributing: false,
      hasDocsDirectory: false,
      dataAvailable: false,
      unavailableReason: "Repository file listing unavailable."
    };
  }

  const hasReadme = treePaths.some((p) => /^readme(\.[a-z]+)?$/i.test(p));
  const hasLicense = treePaths.some((p) => /^licen[sc]e(\.[a-z]+)?$/i.test(p));
  const hasContributing = treePaths.some((p) => /^contributing(\.[a-z]+)?$/i.test(p));
  const hasDocsDirectory = treePaths.some((p) => /^docs\//i.test(p));

  return {
    hasReadme,
    readmeLength: readmeContent ? readmeContent.length : null,
    readmeHasInstallSection: readmeContent ? INSTALL_SECTION_PATTERN.test(readmeContent) : false,
    readmeHasUsageSection: readmeContent ? USAGE_SECTION_PATTERN.test(readmeContent) : false,
    hasLicense,
    hasContributing,
    hasDocsDirectory,
    dataAvailable: true,
    unavailableReason: null
  };
}
