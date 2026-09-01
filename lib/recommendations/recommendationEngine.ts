import type {
  ContributorAnalysis,
  DependencyAnalysis,
  DocumentationAnalysis,
  Issue,
  MaintenanceAnalysis,
  Recommendation,
  RecommendationPriority,
  SecurityAnalysis,
  Severity,
  TestingAnalysis
} from "../types";

const PRIORITY_ORDER: RecommendationPriority[] = ["critical", "high", "medium", "low"];
const SEVERITY_TO_PRIORITY: Record<Severity, RecommendationPriority> = {
  critical: "critical",
  high: "high",
  medium: "medium",
  low: "low",
  unknown: "low"
};

export interface AnalysisBundle {
  dependencyAnalysis: DependencyAnalysis | null;
  securityAnalysis: SecurityAnalysis | null;
  maintenanceAnalysis: MaintenanceAnalysis | null;
  contributorAnalysis: ContributorAnalysis | null;
  testingAnalysis: TestingAnalysis | null;
  documentationAnalysis: DocumentationAnalysis | null;
}

/**
 * Builds a flat, standardized list of Issues from raw analysis results.
 * Every issue carries category, severity, evidence, and a recommendation,
 * so nothing downstream needs to re-derive meaning from raw numbers.
 */
export function buildIssues(bundle: AnalysisBundle): Issue[] {
  const issues: Issue[] = [];

  // Security
  if (bundle.securityAnalysis?.dataAvailable) {
    for (const vuln of bundle.securityAnalysis.vulnerabilities) {
      if (vuln.severity === "unknown") continue; // don't overstate an indeterminate finding as an "issue"
      issues.push({
        id: `security-${vuln.id}-${vuln.packageName}`,
        category: "security",
        severity: vuln.severity,
        title: `${vuln.severity === "critical" || vuln.severity === "high" ? "High" : "Moderate"} security risk in ${vuln.packageName}`,
        description: vuln.summary,
        evidence: [
          `Advisory ${vuln.id}`,
          vuln.installedVersion ? `Installed version: ${vuln.installedVersion}` : "Installed version unknown",
          vuln.fixedVersion ? `Fixed in: ${vuln.fixedVersion}` : "No fixed version published yet"
        ],
        recommendation: vuln.fixedVersion
          ? `Upgrade ${vuln.packageName} to ${vuln.fixedVersion} or later.`
          : `Review advisory ${vuln.id} for ${vuln.packageName}; no fixed version is published yet.`
      });
    }
  }

  // Deprecated dependencies
  if (bundle.dependencyAnalysis) {
    for (const dep of bundle.dependencyAnalysis.dependencies) {
      if (!dep.isDeprecated) continue;
      issues.push({
        id: `deprecated-${dep.name}`,
        category: "dependency",
        severity: "medium",
        title: `Deprecated dependency: ${dep.name}`,
        description: dep.deprecationMessage || "Package is officially deprecated on the npm registry.",
        evidence: [`Declared range: ${dep.declaredRange}`],
        recommendation: "Consider migrating to an actively maintained alternative."
      });
    }
  }

  // Major outdated dependencies
  if (bundle.dependencyAnalysis) {
    for (const dep of bundle.dependencyAnalysis.dependencies) {
      if (dep.updateType !== "major" || dep.isDeprecated) continue;
      issues.push({
        id: `outdated-${dep.name}`,
        category: "dependency",
        severity: "low",
        title: `Major update available for ${dep.name}`,
        description: `Currently declared as ${dep.declaredRange}; the latest published version is ${dep.latestVersion}.`,
        evidence: [`Declared: ${dep.declaredRange}`, `Latest: ${dep.latestVersion}`],
        recommendation: `Review the changelog and upgrade ${dep.name} to the latest major version when convenient.`
      });
    }
  }

  // Contributor concentration
  if (bundle.contributorAnalysis?.dataAvailable && bundle.contributorAnalysis.concentrationRisk === "high") {
    issues.push({
      id: "contributor-concentration",
      category: "contributor",
      severity: "medium",
      title: "High contributor concentration",
      description:
        "Most repository activity is concentrated among a small number of contributors, which can increase continuity risk.",
      evidence: [
        `Top contributor accounts for ${bundle.contributorAnalysis.topContributorConcentration}% of recorded contributions.`,
        `Estimated bus factor: ${bundle.contributorAnalysis.estimatedBusFactor}.`
      ],
      recommendation: "Encourage code review distribution and document tribal knowledge to reduce continuity risk."
    });
  }

  // Testing
  if (bundle.testingAnalysis?.dataAvailable && bundle.testingAnalysis.detectedFrameworks.length === 0) {
    issues.push({
      id: "testing-missing",
      category: "testing",
      severity: "medium",
      title: "No testing infrastructure detected",
      description: "No recognized test framework or test files were detected in the repository.",
      evidence: ["No test framework configuration found.", "No files matching common test naming conventions found."],
      recommendation: "Add automated tests using an established framework appropriate for the project's language."
    });
  }

  // Documentation
  if (bundle.documentationAnalysis?.dataAvailable && !bundle.documentationAnalysis.hasReadme) {
    issues.push({
      id: "documentation-missing-readme",
      category: "documentation",
      severity: "low",
      title: "No README detected",
      description: "The repository does not appear to have a README file.",
      evidence: ["No file matching README.* found at the repository root."],
      recommendation: "Add a README describing the project, installation steps, and usage."
    });
  }

  const severityOrder: Severity[] = ["critical", "high", "medium", "low", "unknown"];
  return issues.sort((a, b) => severityOrder.indexOf(a.severity) - severityOrder.indexOf(b.severity));
}

/**
 * Converts issues into prioritized, actionable recommendations. Recommendations
 * are always derived from real issues found above — never hard-coded independent
 * of actual findings.
 */
export function buildRecommendations(issues: Issue[]): Recommendation[] {
  const recommendations = issues.map((issue) => ({
    id: `rec-${issue.id}`,
    priority: SEVERITY_TO_PRIORITY[issue.severity],
    category: issue.category,
    title: issue.recommendation,
    why: issue.description,
    evidence: issue.evidence,
    suggestedAction: issue.recommendation
  }));

  return recommendations.sort(
    (a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)
  );
}
