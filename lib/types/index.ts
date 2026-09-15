// Core domain types shared across analyzers, scoring, recommendations,
// reports, API routes, and the frontend.

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

// ---------------------------------------------------------------------------
// Dependencies
// ---------------------------------------------------------------------------

export interface DependencyRecord {
  name: string;
  declaredRange: string;
  dependencyType: "dependencies" | "devDependencies" | "peerDependencies" | "optionalDependencies";
  currentResolvedVersion: string | null;
  latestVersion: string | null;
  updateType: UpdateType;
  isDeprecated: boolean;
  deprecationMessage: string | null;
  lastPublishedAt: string | null;
  maintenanceStatus: MaintenanceStatus;
  registryLookupFailed: boolean;
  unresolvableRange: boolean;
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
  // Security data availability is determined once, from the actual OSV
  // response, and threaded through here rather than re-derived elsewhere
  // (re-deriving it from unrelated signals like registry lookup success
  // was a real bug in an earlier version of this analyzer).
  securityDataAvailable: boolean;
  securityUnavailableReason: string | null;
  // When a scan has more dependencies than fit safely in a stateless,
  // URL-encoded scan token, the least-actionable entries are dropped before
  // encoding. Counts above (totalCount, outdatedCount, etc.) always reflect
  // the full, real analysis — only the `dependencies` array itself is
  // truncated, and only for transfer-size reasons, never silently.
  truncatedForTransfer: boolean;
  truncatedFullCount: number | null;
}

// ---------------------------------------------------------------------------
// Security
// ---------------------------------------------------------------------------

export interface VulnerabilityRecord {
  id: string;
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
  longVersionLagCount: number;
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
  openPullRequests: number | null;
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
  topContributorConcentration: number;
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
  score: number | null;
  weight: number;
  reasons: string[];
  dataAvailable: boolean;
}

export interface EngineeringHealthScore {
  overall: number | null;
  categories: CategoryScore[];
  band: "excellent" | "healthy" | "needs-attention" | "at-risk" | "unknown";
  bandLabel: string;
}

// ---------------------------------------------------------------------------
// Risk / Issues / Recommendations
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
  label: string;
  githubUrl?: string;
}

/**
 * A full scan result. In production this record's `id` field IS the
 * complete encoded representation of everything else in this object (see
 * lib/scanEncoding.ts) — there is no server-side lookup involved in
 * retrieving a scan by id. This is what makes the scan flow work
 * identically in local dev and on Vercel serverless with zero database.
 */
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
