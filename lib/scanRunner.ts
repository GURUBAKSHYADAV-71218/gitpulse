import { analyzeDependencies, type RawPackageJson } from "./analyzers/dependencyAnalyzer";
import { analyzeSecurity } from "./analyzers/securityAnalyzer";
import { analyzeMaintenance } from "./analyzers/maintenanceAnalyzer";
import { analyzeRepository, type RepositoryAnalysisResult } from "./analyzers/repositoryAnalyzer";
import { analyzeContributors } from "./analyzers/contributorAnalyzer";
import { analyzeTesting } from "./analyzers/testingAnalyzer";
import { analyzeDocumentation } from "./analyzers/documentationAnalyzer";
import { analyzeStructure } from "./analyzers/structureAnalyzer";
import {
  scoreDependencies,
  scoreSecurity,
  scoreMaintenance,
  scoreRepositoryActivity,
  scoreContributors,
  scoreTesting,
  scoreDocumentation,
  calculateOverallScore
} from "./scoring/engineeringScoreEngine";
import { buildIssues, buildRecommendations } from "./recommendations/recommendationEngine";
import { generateEngineeringSummary } from "./services/aiService";
import { fetchRepoTree, fetchPackageJsonFromRepo, fetchRawFile } from "./services/githubService";
import { encodeScanPayload } from "./scanEncoding";
import { recordScanForLocalHistory } from "./store/scanStore";
import { GitPulseError } from "./errors";
import type { ScanRecord, ScanSource } from "./types";

interface GithubScanContext {
  owner: string;
  repo: string;
  defaultBranch: string;
  repoResult: RepositoryAnalysisResult;
}

/** Translates a failed core repository fetch into a specific, typed, user-facing error. */
function mapGithubRepoError(repoResult: RepositoryAnalysisResult): GitPulseError {
  const status = repoResult.statusCode;
  const reason = repoResult.metrics.unavailableReason ?? "GitHub repository could not be accessed.";

  if (status === 404) {
    return new GitPulseError("GITHUB_NOT_FOUND", "Repository not found. It may be private, deleted, or the URL may be incorrect.", 404, reason);
  }
  if (status === 403) {
    return new GitPulseError("GITHUB_RATE_LIMITED", "GitHub API rate limit exceeded. Configure GITHUB_TOKEN or try again later.", 429, reason);
  }
  if (status === 401) {
    return new GitPulseError("GITHUB_API_ERROR", "GitHub authentication failed. Check the configured GITHUB_TOKEN.", 502, reason);
  }
  return new GitPulseError("GITHUB_API_ERROR", "GitHub repository could not be accessed. It may be unavailable or rate-limited.", 502, reason);
}

async function assembleScan(
  source: ScanSource,
  pkg: RawPackageJson | null,
  githubContext: GithubScanContext | null
): Promise<ScanRecord> {
  // REQUIRED CORE DATA: dependency analysis (when a package.json is available).
  const dependencyAnalysis = pkg ? await analyzeDependencies(pkg) : null;
  const securityAnalysis = dependencyAnalysis ? analyzeSecurity(dependencyAnalysis) : null;
  const maintenanceAnalysis = dependencyAnalysis ? analyzeMaintenance(dependencyAnalysis) : null;

  // OPTIONAL DATA: repository activity, contributors, testing/docs/structure
  // signals. Each is allowed to independently fail without aborting the
  // scan — every analyzer already returns an explicit "unavailable" state
  // rather than throwing, and any that could still throw is defensively
  // wrapped here too.
  let repositoryMetrics = null;
  let repositoryActivity = null;
  let contributorAnalysis = null;
  let treePaths: string[] | null = null;
  let readmeContent: string | null = null;

  if (githubContext) {
    const [contributors, treeResult] = await Promise.all([
      analyzeContributors(githubContext.owner, githubContext.repo),
      fetchRepoTree(githubContext.owner, githubContext.repo, githubContext.defaultBranch).catch(() => ({
        ok: false as const,
        data: null,
        status: null,
        errorReason: "unavailable"
      }))
    ]);
    repositoryMetrics = githubContext.repoResult.metrics;
    repositoryActivity = githubContext.repoResult.activity;
    contributorAnalysis = contributors;
    treePaths = treeResult.ok ? treeResult.data : null;

    readmeContent = await fetchRawFile(githubContext.owner, githubContext.repo, githubContext.defaultBranch, "README.md").catch(
      () => null
    );
  }

  const declaredDeps = new Set<string>([...Object.keys(pkg?.dependencies ?? {}), ...Object.keys(pkg?.devDependencies ?? {})]);

  const testingAnalysis = githubContext ? analyzeTesting(treePaths, declaredDeps) : null;
  const documentationAnalysis = githubContext ? analyzeDocumentation({ treePaths, readmeContent }) : null;
  const structureAnalysis = githubContext ? analyzeStructure(treePaths) : null;

  const categoryScores = [
    scoreDependencies(dependencyAnalysis),
    scoreSecurity(securityAnalysis),
    scoreMaintenance(maintenanceAnalysis),
    scoreRepositoryActivity(repositoryMetrics, repositoryActivity),
    scoreContributors(contributorAnalysis),
    scoreTesting(testingAnalysis),
    scoreDocumentation(documentationAnalysis)
  ];

  const health = calculateOverallScore(categoryScores);

  const issues = buildIssues({ dependencyAnalysis, securityAnalysis, maintenanceAnalysis, contributorAnalysis, testingAnalysis, documentationAnalysis });
  const recommendations = buildRecommendations(issues);

  const engineeringSummary = await generateEngineeringSummary({
    source,
    health,
    topIssues: issues.slice(0, 5),
    topRecommendations: recommendations.slice(0, 5)
  }).catch(() => ({
    text: "Engineering summary unavailable.",
    generatedBy: "deterministic" as const
  }));

  const scanPayload: Omit<ScanRecord, "id"> = {
    createdAt: new Date().toISOString(),
    source,
    health,
    dependencyAnalysis,
    securityAnalysis,
    maintenanceAnalysis,
    repositoryMetrics,
    repositoryActivity,
    contributorAnalysis,
    testingAnalysis,
    documentationAnalysis,
    structureAnalysis,
    issues,
    recommendations,
    engineeringSummary
  };

  // The scan's id IS its encoded result — see lib/scanEncoding.ts. This is
  // what makes scan retrieval stateless and Vercel-safe.
  const id = encodeScanPayload(scanPayload);
  const scan: ScanRecord = { ...scanPayload, id };

  // Best-effort local history only. Never awaited into the critical path,
  // and internally guaranteed never to throw — see scanStore.ts.
  void recordScanForLocalHistory(scan);

  return scan;
}

export async function runPackageJsonScan(pkg: RawPackageJson, fileName?: string): Promise<ScanRecord> {
  const source: ScanSource = { type: "package_json", label: fileName ? `Uploaded ${fileName}` : "Uploaded package.json" };
  return assembleScan(source, pkg, null);
}

export async function runGithubScan(owner: string, repo: string, originalUrl: string): Promise<ScanRecord> {
  const repoResult = await analyzeRepository(owner, repo);
  if (!repoResult.metrics.dataAvailable || !repoResult.repoData) {
    throw mapGithubRepoError(repoResult);
  }

  const defaultBranch = repoResult.repoData.defaultBranch;
  const pkgJson = await fetchPackageJsonFromRepo(owner, repo, defaultBranch).catch(() => null);

  const source: ScanSource = { type: "github_repository", label: repoResult.metrics.fullName, githubUrl: originalUrl };

  return assembleScan(source, pkgJson as RawPackageJson | null, { owner, repo, defaultBranch, repoResult });
}
