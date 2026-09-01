import { randomUUID } from "crypto";
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
import { saveScan } from "./store/scanStore";
import type { ScanRecord, ScanSource } from "./types";

interface GithubScanContext {
  owner: string;
  repo: string;
  defaultBranch: string;
  /** Already-fetched repository result, so we never re-fetch releases/commits/metadata a second time within one scan. */
  repoResult: RepositoryAnalysisResult;
}

async function assembleScan(
  source: ScanSource,
  pkg: RawPackageJson | null,
  githubContext: GithubScanContext | null
): Promise<ScanRecord> {
  const dependencyAnalysis = pkg ? await analyzeDependencies(pkg) : null;

  const securityAnalysis = dependencyAnalysis ? analyzeSecurity(dependencyAnalysis) : null;

  const maintenanceAnalysis = dependencyAnalysis ? analyzeMaintenance(dependencyAnalysis) : null;

  let repositoryMetrics = null;
  let repositoryActivity = null;
  let contributorAnalysis = null;
  let treePaths: string[] | null = null;
  let readmeContent: string | null = null;

  if (githubContext) {
    const [contributors, treeResult] = await Promise.all([
      analyzeContributors(githubContext.owner, githubContext.repo),
      fetchRepoTree(githubContext.owner, githubContext.repo, githubContext.defaultBranch)
    ]);
    repositoryMetrics = githubContext.repoResult.metrics;
    repositoryActivity = githubContext.repoResult.activity;
    contributorAnalysis = contributors;
    treePaths = treeResult.ok ? treeResult.data : null;

    readmeContent = await fetchRawFile(githubContext.owner, githubContext.repo, githubContext.defaultBranch, "README.md");
  }

  const declaredDeps = new Set<string>([
    ...Object.keys(pkg?.dependencies ?? {}),
    ...Object.keys(pkg?.devDependencies ?? {})
  ]);

  const testingAnalysis = githubContext ? analyzeTesting(treePaths, declaredDeps) : null;
  const documentationAnalysis = githubContext
    ? analyzeDocumentation({ treePaths, readmeContent })
    : null;
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

  const issues = buildIssues({
    dependencyAnalysis,
    securityAnalysis,
    maintenanceAnalysis,
    contributorAnalysis,
    testingAnalysis,
    documentationAnalysis
  });
  const recommendations = buildRecommendations(issues);

  const engineeringSummary = await generateEngineeringSummary({
    source,
    health,
    topIssues: issues.slice(0, 5),
    topRecommendations: recommendations.slice(0, 5)
  });

  const scan: ScanRecord = {
    id: randomUUID(),
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

  await saveScan(scan);
  return scan;
}

export async function runPackageJsonScan(pkg: RawPackageJson, fileName?: string): Promise<ScanRecord> {
  const source: ScanSource = {
    type: "package_json",
    label: fileName ? `Uploaded ${fileName}` : "Uploaded package.json"
  };
  return assembleScan(source, pkg, null);
}

export async function runGithubScan(
  owner: string,
  repo: string,
  originalUrl: string
): Promise<{ scan: ScanRecord } | { error: string }> {
  // Resolve default branch first via a lightweight repository fetch, reusing
  // the same call the repository analyzer will make (cached, so no duplicate
  // network cost).
  const repoResult = await analyzeRepository(owner, repo);
  if (!repoResult.metrics.dataAvailable || !repoResult.repoData) {
    return { error: repoResult.metrics.unavailableReason ?? "Repository could not be analyzed." };
  }

  const defaultBranch = repoResult.repoData.defaultBranch;
  const pkgJson = await fetchPackageJsonFromRepo(owner, repo, defaultBranch);

  const source: ScanSource = {
    type: "github_repository",
    label: repoResult.metrics.fullName,
    githubUrl: originalUrl
  };

  const scan = await assembleScan(source, pkgJson as RawPackageJson | null, {
    owner,
    repo,
    defaultBranch,
    repoResult
  });
  return { scan };
}
