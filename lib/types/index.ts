// Core domain types shared across analyzers, scoring, recommendations,
// reports, API routes, and the frontend. Keeping these centralized avoids
// duplicated/divergent shapes between backend analysis and UI rendering.

export type Severity = "critical" | "high" | "medium" | "low" | "unknown";

export type Category =
  | "dependency"
  | "security"
  | "maintenance"
  | "repository"
  | "contributor"
  | "testing"
  | "documentation"
  | "structure";

export type UpdateType = "current" | "patch" | "minor" | "major" | "unknown";

export type MaintenanceStatus = "healthy" | "aging" | "stale" | "unknown";

export type ConfidenceLevel = "confirmed" | "detected" | "unavailable";

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------

export interface DependencyRecord {
  name: string;
  declaredRange: string;
  dependencyType: "dependencies" | "devDependencies" | "peerDependencies" | "optionalDependencies";
  currentResolvedVersion: string | null; // best-effort resolution of declaredRange, or null if indeterminate
  latestVersion: string | null; // null when metadata unavailable
  updateType: UpdateType;
  isDeprecated: boolean;
  deprecationMessage: string | null;
  lastPublishedAt: string | null; // ISO date of latest version publish
  maintenanceStatus: MaintenanceStatus;
  registryLookupFailed: boolean; // true if npm metadata could not be retrieved
  unresolvableRange: boolean; // true if declaredRange could not be parsed (e.g. git:, workspace:)
  vulnerabilities: VulnerabilityRecord[];
}

export interface DependencyAnalysis {
  dependencies: DependencyRecord[];
  totalCount: number;
  outdatedCount: number;
  majorUpdateCount: number;
  deprecatedCount: number;
  unresolvableCount: number;
  registryUnavailableCount: number;
  securityDataAvailable: boolean;
  securityUnavailableReason: string | null;
}

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------

export interface VulnerabilityRecord {
  id: string; // advisory identifier, e.g. GHSA-xxxx or CVE-xxxx
  packageName: string;
  installedVersion: string | null;
  severity: Severity;
  summary: string;
  affectedRange: string | null;
  fixedVersion: string | null;
  source: "OSV";
  referenceUrl: string | null;
}

export interface SecurityAnalysis {
  vulnerabilities: VulnerabilityRecord[];
  counts: Record<Severity, number>;
  dataAvailable: boolean;
  unavailableReason: string | null;
}

// ---------------------------------------------------------------------------
// Maintenance
// ---------------------------------------------------------------------------

export interface MaintenanceAnalysis {
  staleDependencyCount: number;
  agingDependencyCount: number;
  deprecatedDependencyCount: number;
  longVersionLagCount: number; // dependencies more than 2 major versions behind
  dataAvailable: boolean;
  notes: string[];
}

// ---------------------------------------------------------------------------
// Repository
// ---------------------------------------------------------------------------

export interface RepositoryMetrics {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  primaryLanguage: string | null;
  stars: number;
  forks: number;
  openIssues: number;
  openPullRequests: number | null; // GitHub search API required; may be unavailable
  createdAt: string | null;
  lastPushAt: string | null;
  defaultBranch: string | null;
  license: string | null;
  releaseCount: number | null;
  latestReleaseTag: string | null;
  latestReleaseDate: string | null;
  isArchived: boolean;
  dataAvailable: boolean;
  unavailableReason: string | null;
}

export interface RepositoryActivity {
  daysSinceLastPush: number | null;
  recentCommitCount30d: number | null;
  activityLevel: "healthy" | "moderate" | "low" | "unknown";
  dataAvailable: boolean;
}

// ---------------------------------------------------------------------------
// Contributors
// ---------------------------------------------------------------------------

export interface ContributorRecord {
  login: string;
  contributions: number;
  percentageOfTotal: number;
  profileUrl: string;
}

export interface ContributorAnalysis {
  totalContributors: number;
  topContributors: ContributorRecord[];
  topContributorConcentration: number; // percentage held by top contributor
  estimatedBusFactor: number;
  concentrationRisk: Severity;
  dataAvailable: boolean;
  unavailableReason: string | null;
}

// ---------------------------------------------------------------------------
// Testing
// ---------------------------------------------------------------------------

export interface TestingAnalysis {
  detectedFrameworks: string[];
  testFileCount: number;
  testDirectories: string[];
  hasCiConfig: boolean;
  coverageAvailable: boolean;
  coveragePercentage: number | null;
  dataAvailable: boolean;
  unavailableReason: string | null;
}

// ---------------------------------------------------------------------------
// Documentation
// ---------------------------------------------------------------------------

export interface DocumentationAnalysis {
  hasReadme: boolean;
  readmeLength: number | null;
  readmeHasInstallSection: boolean;
  readmeHasUsageSection: boolean;
  hasLicense: boolean;
  hasContributing: boolean;
  hasDocsDirectory: boolean;
  dataAvailable: boolean;
  unavailableReason: string | null;
}

// ---------------------------------------------------------------------------
// Structure
// ---------------------------------------------------------------------------

export interface StructureAnalysis {
  detectedDirectories: string[];
  observations: string[];
  dataAvailable: boolean;
  unavailableReason: string | null;
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export interface CategoryScore {
  category: Category;
  label: string;
  score: number | null; // 0-100, null when data insufficient
  weight: number;
  reasons: string[]; // explanation of deductions/boosts
  dataAvailable: boolean;
}

export interface EngineeringHealthScore {
  overall: number | null;
  categories: CategoryScore[];
  band: "excellent" | "healthy" | "needs-attention" | "at-risk" | "unknown";
  bandLabel: string;
}

// ---------------------------------------------------------------------------
// Risk / Issues
// ---------------------------------------------------------------------------

export interface Issue {
  id: string;
  category: Category;
  severity: Severity;
  title: string;
  description: string;
  evidence: string[];
  recommendation: string;
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

export type RecommendationPriority = "critical" | "high" | "medium" | "low";

export interface Recommendation {
  id: string;
  priority: RecommendationPriority;
  category: Category;
  title: string;
  why: string;
  evidence: string[];
  suggestedAction: string;
}

// ---------------------------------------------------------------------------
// Scan / Source
// ---------------------------------------------------------------------------

export type ScanSourceType = "package_json" | "github_repository";

export interface ScanSource {
  type: ScanSourceType;
  label: string; // repo full name, or "Uploaded package.json"
  githubUrl?: string;
}

export interface ScanRecord {
  id: string;
  createdAt: string;
  source: ScanSource;
  health: EngineeringHealthScore;
  dependencyAnalysis: DependencyAnalysis | null;
  securityAnalysis: SecurityAnalysis | null;
  maintenanceAnalysis: MaintenanceAnalysis | null;
  repositoryMetrics: RepositoryMetrics | null;
  repositoryActivity: RepositoryActivity | null;
  contributorAnalysis: ContributorAnalysis | null;
  testingAnalysis: TestingAnalysis | null;
  documentationAnalysis: DocumentationAnalysis | null;
  structureAnalysis: StructureAnalysis | null;
  issues: Issue[];
  recommendations: Recommendation[];
  engineeringSummary: {
    text: string;
    generatedBy: "ai" | "deterministic";
  };
}

export interface ScanHistoryEntry {
  id: string;
  createdAt: string;
  source: ScanSource;
  overallScore: number | null;
}
