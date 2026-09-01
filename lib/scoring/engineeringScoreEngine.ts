import type {
  CategoryScore,
  Category,
  ContributorAnalysis,
  DependencyAnalysis,
  DocumentationAnalysis,
  EngineeringHealthScore,
  MaintenanceAnalysis,
  RepositoryActivity,
  RepositoryMetrics,
  SecurityAnalysis,
  TestingAnalysis
} from "../types";

// Centralized, named weights. Changing engineering priorities means editing
// this object only — no magic numbers scattered through components. Weights
// apply only across categories with available data; unavailable categories
// are excluded and the remaining weights are renormalized (see calculateOverall).
export const SCORE_WEIGHTS: Record<Category, number> = {
  dependency: 0.2,
  security: 0.25,
  maintenance: 0.15,
  repository: 0.1,
  contributor: 0.1,
  testing: 0.12,
  documentation: 0.08,
  structure: 0 // informational only; not included in the overall score
};

const CATEGORY_LABELS: Record<Category, string> = {
  dependency: "Dependency Health",
  security: "Security Health",
  maintenance: "Maintenance Health",
  repository: "Repository Activity",
  contributor: "Contributor Health",
  testing: "Testing Health",
  documentation: "Documentation Health",
  structure: "Project Structure"
};

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function scoreDependencies(analysis: DependencyAnalysis | null): CategoryScore {
  if (!analysis || analysis.totalCount === 0) {
    return {
      category: "dependency",
      label: CATEGORY_LABELS.dependency,
      score: null,
      weight: SCORE_WEIGHTS.dependency,
      reasons: ["No dependencies were declared or none could be analyzed."],
      dataAvailable: analysis !== null && analysis.totalCount === 0
    };
  }

  let score = 100;
  const reasons: string[] = [];

  const majorRatio = analysis.majorUpdateCount / analysis.totalCount;
  const majorDeduction = clampScore(majorRatio * 40);
  if (analysis.majorUpdateCount > 0) {
    score -= majorDeduction;
    reasons.push(`${analysis.majorUpdateCount} dependencies are one or more major versions behind.`);
  }

  const outdatedNonMajor = analysis.outdatedCount - analysis.majorUpdateCount;
  if (outdatedNonMajor > 0) {
    const deduction = clampScore((outdatedNonMajor / analysis.totalCount) * 15);
    score -= deduction;
    reasons.push(`${outdatedNonMajor} dependencies have patch/minor updates available.`);
  }

  if (analysis.deprecatedCount > 0) {
    score -= analysis.deprecatedCount * 8;
    reasons.push(`${analysis.deprecatedCount} dependencies are officially deprecated.`);
  }

  if (analysis.unresolvableCount > 0) {
    reasons.push(`${analysis.unresolvableCount} declared ranges could not be resolved to a specific version.`);
  }

  if (reasons.length === 0) {
    reasons.push("All analyzed dependencies are current.");
  }

  return {
    category: "dependency",
    label: CATEGORY_LABELS.dependency,
    score: clampScore(score),
    weight: SCORE_WEIGHTS.dependency,
    reasons,
    dataAvailable: true
  };
}

export function scoreSecurity(analysis: SecurityAnalysis | null): CategoryScore {
  if (!analysis || !analysis.dataAvailable) {
    return {
      category: "security",
      label: CATEGORY_LABELS.security,
      score: null,
      weight: SCORE_WEIGHTS.security,
      reasons: [analysis?.unavailableReason ?? "Security advisory data unavailable."],
      dataAvailable: false
    };
  }

  const { counts } = analysis;
  let score = 100;
  score -= counts.critical * 30;
  score -= counts.high * 15;
  score -= counts.medium * 6;
  score -= counts.low * 2;

  const reasons: string[] = [];
  if (counts.critical > 0) reasons.push(`${counts.critical} critical severity ${counts.critical === 1 ? "vulnerability" : "vulnerabilities"}.`);
  if (counts.high > 0) reasons.push(`${counts.high} high severity ${counts.high === 1 ? "vulnerability" : "vulnerabilities"}.`);
  if (counts.medium > 0) reasons.push(`${counts.medium} moderate severity ${counts.medium === 1 ? "vulnerability" : "vulnerabilities"}.`);
  if (counts.low > 0) reasons.push(`${counts.low} low severity ${counts.low === 1 ? "vulnerability" : "vulnerabilities"}.`);
  if (reasons.length === 0) reasons.push("No known vulnerabilities detected in analyzed dependencies.");

  return {
    category: "security",
    label: CATEGORY_LABELS.security,
    score: clampScore(score),
    weight: SCORE_WEIGHTS.security,
    reasons,
    dataAvailable: true
  };
}

export function scoreMaintenance(analysis: MaintenanceAnalysis | null): CategoryScore {
  if (!analysis || !analysis.dataAvailable) {
    return {
      category: "maintenance",
      label: CATEGORY_LABELS.maintenance,
      score: null,
      weight: SCORE_WEIGHTS.maintenance,
      reasons: ["Maintenance data unavailable."],
      dataAvailable: false
    };
  }

  let score = 100;
  score -= analysis.deprecatedDependencyCount * 10;
  score -= analysis.staleDependencyCount * 6;
  score -= analysis.agingDependencyCount * 2;
  score -= analysis.longVersionLagCount * 4;

  return {
    category: "maintenance",
    label: CATEGORY_LABELS.maintenance,
    score: clampScore(score),
    weight: SCORE_WEIGHTS.maintenance,
    reasons: analysis.notes,
    dataAvailable: true
  };
}

export function scoreRepositoryActivity(
  metrics: RepositoryMetrics | null,
  activity: RepositoryActivity | null
): CategoryScore {
  if (!metrics || !metrics.dataAvailable || !activity || !activity.dataAvailable) {
    return {
      category: "repository",
      label: CATEGORY_LABELS.repository,
      score: null,
      weight: SCORE_WEIGHTS.repository,
      reasons: [metrics?.unavailableReason ?? "Repository activity data unavailable."],
      dataAvailable: false
    };
  }

  let score = 100;
  const reasons: string[] = [];

  if (metrics.isArchived) {
    score = 20;
    reasons.push("Repository is archived.");
  } else if (activity.activityLevel === "healthy") {
    reasons.push(`Last push was ${activity.daysSinceLastPush} days ago.`);
  } else if (activity.activityLevel === "moderate") {
    score -= 20;
    reasons.push(`Last push was ${activity.daysSinceLastPush} days ago; activity has slowed.`);
  } else {
    score -= 45;
    reasons.push(`Last push was ${activity.daysSinceLastPush} days ago; no recent activity detected.`);
  }

  return {
    category: "repository",
    label: CATEGORY_LABELS.repository,
    score: clampScore(score),
    weight: SCORE_WEIGHTS.repository,
    reasons,
    dataAvailable: true
  };
}

export function scoreContributors(analysis: ContributorAnalysis | null): CategoryScore {
  if (!analysis || !analysis.dataAvailable) {
    return {
      category: "contributor",
      label: CATEGORY_LABELS.contributor,
      score: null,
      weight: SCORE_WEIGHTS.contributor,
      reasons: [analysis?.unavailableReason ?? "Contributor data unavailable."],
      dataAvailable: false
    };
  }

  let score = 100;
  const reasons: string[] = [];

  if (analysis.concentrationRisk === "high") {
    score -= 35;
    reasons.push(
      `Most repository activity is concentrated among a small number of contributors (top contributor: ${analysis.topContributorConcentration}%), which can increase continuity risk.`
    );
  } else if (analysis.concentrationRisk === "medium") {
    score -= 15;
    reasons.push(`Contribution is moderately concentrated (top contributor: ${analysis.topContributorConcentration}%).`);
  } else {
    reasons.push("Contributions are reasonably distributed across contributors.");
  }

  if (analysis.estimatedBusFactor <= 1 && analysis.totalContributors > 1) {
    score -= 10;
    reasons.push("Estimated bus factor is 1.");
  }

  return {
    category: "contributor",
    label: CATEGORY_LABELS.contributor,
    score: clampScore(score),
    weight: SCORE_WEIGHTS.contributor,
    reasons,
    dataAvailable: true
  };
}

export function scoreTesting(analysis: TestingAnalysis | null): CategoryScore {
  if (!analysis || !analysis.dataAvailable) {
    return {
      category: "testing",
      label: CATEGORY_LABELS.testing,
      score: null,
      weight: SCORE_WEIGHTS.testing,
      reasons: ["Testing infrastructure data unavailable."],
      dataAvailable: false
    };
  }

  let score = 30; // baseline: no detected testing infrastructure
  const reasons: string[] = [];

  if (analysis.detectedFrameworks.length > 0) {
    score = 70;
    reasons.push(`Detected testing framework(s): ${analysis.detectedFrameworks.join(", ")}.`);
  } else {
    reasons.push("No testing framework detected.");
  }

  if (analysis.testFileCount > 0) {
    score += Math.min(20, Math.floor(analysis.testFileCount / 5));
    reasons.push(`${analysis.testFileCount} test files detected.`);
  } else {
    reasons.push("No test files detected.");
  }

  if (analysis.hasCiConfig) {
    score += 10;
    reasons.push("Continuous integration configuration detected.");
  }

  return {
    category: "testing",
    label: CATEGORY_LABELS.testing,
    score: clampScore(score),
    weight: SCORE_WEIGHTS.testing,
    reasons,
    dataAvailable: true
  };
}

export function scoreDocumentation(analysis: DocumentationAnalysis | null): CategoryScore {
  if (!analysis || !analysis.dataAvailable) {
    return {
      category: "documentation",
      label: CATEGORY_LABELS.documentation,
      score: null,
      weight: SCORE_WEIGHTS.documentation,
      reasons: ["Documentation data unavailable."],
      dataAvailable: false
    };
  }

  let score = 0;
  const reasons: string[] = [];

  if (analysis.hasReadme) {
    score += 40;
    reasons.push("README detected.");
    if (analysis.readmeHasInstallSection) {
      score += 15;
      reasons.push("README includes installation guidance.");
    }
    if (analysis.readmeHasUsageSection) {
      score += 15;
      reasons.push("README includes usage guidance.");
    }
  } else {
    reasons.push("No README detected.");
  }

  if (analysis.hasLicense) {
    score += 15;
    reasons.push("LICENSE detected.");
  } else {
    reasons.push("No LICENSE file detected.");
  }

  if (analysis.hasContributing) {
    score += 5;
  }
  if (analysis.hasDocsDirectory) {
    score += 10;
    reasons.push("Dedicated docs/ directory detected.");
  }

  return {
    category: "documentation",
    label: CATEGORY_LABELS.documentation,
    score: clampScore(score),
    weight: SCORE_WEIGHTS.documentation,
    reasons,
    dataAvailable: true
  };
}

function classifyBand(overall: number | null): EngineeringHealthScore["band"] {
  if (overall === null) return "unknown";
  if (overall >= 90) return "excellent";
  if (overall >= 75) return "healthy";
  if (overall >= 55) return "needs-attention";
  return "at-risk";
}

const BAND_LABELS: Record<EngineeringHealthScore["band"], string> = {
  excellent: "Excellent engineering health",
  healthy: "Healthy with improvements recommended",
  "needs-attention": "Needs attention",
  "at-risk": "At risk",
  unknown: "Unable to calculate"
};

/** Combines category scores into an overall score, weighted and renormalized across only the categories with available data. */
export function calculateOverallScore(categories: CategoryScore[]): EngineeringHealthScore {
  const scored = categories.filter((c) => c.score !== null && c.weight > 0);
  const totalWeight = scored.reduce((sum, c) => sum + c.weight, 0);

  const overall =
    totalWeight > 0
      ? clampScore(scored.reduce((sum, c) => sum + (c.score as number) * c.weight, 0) / totalWeight)
      : null;

  const band = classifyBand(overall);

  return {
    overall,
    categories,
    band,
    bandLabel: BAND_LABELS[band]
  };
}
