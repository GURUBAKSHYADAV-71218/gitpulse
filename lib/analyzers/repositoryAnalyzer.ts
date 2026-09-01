import {
  fetchRepository,
  fetchReleases,
  fetchRecentCommits,
  type GithubRepoData
} from "../services/githubService";
import type { RepositoryActivity, RepositoryMetrics } from "../types";

export interface RepositoryAnalysisResult {
  metrics: RepositoryMetrics;
  activity: RepositoryActivity;
  repoData: GithubRepoData | null;
}

function daysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
}

export async function analyzeRepository(owner: string, repo: string): Promise<RepositoryAnalysisResult> {
  const repoResult = await fetchRepository(owner, repo);

  if (!repoResult.ok || !repoResult.data) {
    const unavailableMetrics: RepositoryMetrics = {
      owner,
      name: repo,
      fullName: `${owner}/${repo}`,
      description: null,
      primaryLanguage: null,
      stars: 0,
      forks: 0,
      openIssues: 0,
      openPullRequests: null,
      createdAt: null,
      lastPushAt: null,
      defaultBranch: null,
      license: null,
      releaseCount: null,
      latestReleaseTag: null,
      latestReleaseDate: null,
      isArchived: false,
      dataAvailable: false,
      unavailableReason: repoResult.errorReason ?? "Repository data unavailable."
    };
    return {
      metrics: unavailableMetrics,
      activity: {
        daysSinceLastPush: null,
        recentCommitCount30d: null,
        activityLevel: "unknown",
        dataAvailable: false
      },
      repoData: null
    };
  }

  const d = repoResult.data;
  const [releasesResult, commitsResult] = await Promise.all([
    fetchReleases(owner, repo),
    fetchRecentCommits(owner, repo, d.defaultBranch)
  ]);

  const releases = releasesResult.ok ? releasesResult.data ?? [] : [];
  const latestRelease = releases[0] ?? null;

  const metrics: RepositoryMetrics = {
    owner: d.owner,
    name: d.name,
    fullName: d.fullName,
    description: d.description,
    primaryLanguage: d.language,
    stars: d.stargazersCount,
    forks: d.forksCount,
    openIssues: d.openIssuesCount,
    openPullRequests: null, // GitHub's REST API combines issues+PRs; a dedicated search call would be needed for an exact split
    createdAt: d.createdAt,
    lastPushAt: d.pushedAt,
    defaultBranch: d.defaultBranch,
    license: d.license,
    releaseCount: releasesResult.ok ? releases.length : null,
    latestReleaseTag: latestRelease?.tagName ?? null,
    latestReleaseDate: latestRelease?.publishedAt ?? null,
    isArchived: d.archived,
    dataAvailable: true,
    unavailableReason: null
  };

  const pushDays = daysSince(d.pushedAt);
  const commitCount = commitsResult.ok ? commitsResult.data?.length ?? null : null;

  let activityLevel: RepositoryActivity["activityLevel"] = "unknown";
  if (pushDays !== null) {
    if (d.archived) activityLevel = "low";
    else if (pushDays <= 30 && (commitCount === null || commitCount > 0)) activityLevel = "healthy";
    else if (pushDays <= 180) activityLevel = "moderate";
    else activityLevel = "low";
  }

  return {
    metrics,
    activity: {
      daysSinceLastPush: pushDays,
      recentCommitCount30d: commitCount,
      activityLevel,
      dataAvailable: pushDays !== null
    },
    repoData: d
  };
}
