import { fetchWithTimeout, TtlCache } from "../utils/cache";

const GITHUB_API = "https://api.github.com";
const CACHE_TTL_MS = 10 * 60 * 1000;

const repoCache = new TtlCache<GithubServiceResult<GithubRepoData>>(CACHE_TTL_MS);

export interface GithubServiceResult<T> {
  ok: boolean;
  data: T | null;
  status: number | null;
  errorReason: string | null; // human-readable, safe to display
}

export interface GithubRepoData {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number; // note: GitHub combines issues + PRs in this field
  createdAt: string;
  pushedAt: string;
  defaultBranch: string;
  license: string | null;
  archived: boolean;
  private: boolean;
}

export interface GithubContributor {
  login: string;
  contributions: number;
  htmlUrl: string;
}

export interface GithubRelease {
  tagName: string;
  publishedAt: string | null;
}

export interface GithubCommit {
  sha: string;
  date: string | null;
}

function authHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function classifyError(status: number): string {
  if (status === 404) return "Repository not found or is private.";
  if (status === 403) return "GitHub API rate limit exceeded. Configure GITHUB_TOKEN to increase limits.";
  if (status === 401) return "GitHub authentication failed. Check GITHUB_TOKEN.";
  if (status >= 500) return "GitHub API is currently unavailable.";
  return `GitHub API returned an unexpected error (HTTP ${status}).`;
}

export function parseGithubUrl(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim();
  const patterns = [
    /^https?:\/\/(?:www\.)?github\.com\/([^/\s]+)\/([^/\s#?]+?)(?:\.git)?\/?(?:[/#?].*)?$/i,
    /^([\w.-]+)\/([\w.-]+)$/
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(trimmed);
    if (match && match[1] && match[2]) {
      return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
    }
  }
  return null;
}

async function githubGet<T>(path: string): Promise<GithubServiceResult<T>> {
  let response: Response;
  try {
    response = await fetchWithTimeout(`${GITHUB_API}${path}`, { headers: authHeaders() }, 10000);
  } catch (err) {
    return {
      ok: false,
      data: null,
      status: null,
      errorReason: `Network error contacting GitHub (${err instanceof Error ? err.message : "timeout"}).`
    };
  }

  if (!response.ok) {
    return { ok: false, data: null, status: response.status, errorReason: classifyError(response.status) };
  }

  try {
    const json = (await response.json()) as T;
    return { ok: true, data: json, status: response.status, errorReason: null };
  } catch {
    return { ok: false, data: null, status: response.status, errorReason: "Invalid response from GitHub API." };
  }
}

export async function fetchRepository(
  owner: string,
  repo: string
): Promise<GithubServiceResult<GithubRepoData>> {
  const cacheKey = `${owner}/${repo}`.toLowerCase();
  const cached = repoCache.get(cacheKey);
  if (cached) return cached;

  const result = await githubGet<any>(`/repos/${owner}/${repo}`);
  if (!result.ok || !result.data) {
    const failure: GithubServiceResult<GithubRepoData> = {
      ok: false,
      data: null,
      status: result.status,
      errorReason: result.errorReason
    };
    return failure;
  }

  const d = result.data;
  const mapped: GithubServiceResult<GithubRepoData> = {
    ok: true,
    status: 200,
    errorReason: null,
    data: {
      owner: d.owner?.login ?? owner,
      name: d.name ?? repo,
      fullName: d.full_name ?? `${owner}/${repo}`,
      description: d.description ?? null,
      language: d.language ?? null,
      stargazersCount: d.stargazers_count ?? 0,
      forksCount: d.forks_count ?? 0,
      openIssuesCount: d.open_issues_count ?? 0,
      createdAt: d.created_at,
      pushedAt: d.pushed_at,
      defaultBranch: d.default_branch ?? "main",
      license: d.license?.spdx_id ?? d.license?.name ?? null,
      archived: !!d.archived,
      private: !!d.private
    }
  };
  repoCache.set(cacheKey, mapped);
  return mapped;
}

export async function fetchContributors(
  owner: string,
  repo: string
): Promise<GithubServiceResult<GithubContributor[]>> {
  const result = await githubGet<any[]>(`/repos/${owner}/${repo}/contributors?per_page=30&anon=false`);
  if (!result.ok || !result.data) {
    return { ok: false, data: null, status: result.status, errorReason: result.errorReason };
  }
  const contributors: GithubContributor[] = result.data
    .filter((c) => c && c.login)
    .map((c) => ({ login: c.login, contributions: c.contributions ?? 0, htmlUrl: c.html_url }));
  return { ok: true, data: contributors, status: 200, errorReason: null };
}

export async function fetchReleases(
  owner: string,
  repo: string
): Promise<GithubServiceResult<GithubRelease[]>> {
  const result = await githubGet<any[]>(`/repos/${owner}/${repo}/releases?per_page=5`);
  if (!result.ok || !result.data) {
    return { ok: false, data: null, status: result.status, errorReason: result.errorReason };
  }
  const releases: GithubRelease[] = result.data.map((r) => ({
    tagName: r.tag_name,
    publishedAt: r.published_at ?? null
  }));
  return { ok: true, data: releases, status: 200, errorReason: null };
}

export async function fetchRecentCommits(
  owner: string,
  repo: string,
  branch: string
): Promise<GithubServiceResult<GithubCommit[]>> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const result = await githubGet<any[]>(
    `/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(branch)}&since=${since}&per_page=100`
  );
  if (!result.ok || !result.data) {
    return { ok: false, data: null, status: result.status, errorReason: result.errorReason };
  }
  const commits: GithubCommit[] = result.data.map((c) => ({
    sha: c.sha,
    date: c.commit?.committer?.date ?? null
  }));
  return { ok: true, data: commits, status: 200, errorReason: null };
}

export async function fetchRepoTree(
  owner: string,
  repo: string,
  branch: string
): Promise<GithubServiceResult<string[]>> {
  const result = await githubGet<any>(`/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
  if (!result.ok || !result.data) {
    return { ok: false, data: null, status: result.status, errorReason: result.errorReason };
  }
  const paths: string[] = Array.isArray(result.data.tree)
    ? result.data.tree.map((entry: any) => entry.path as string).filter(Boolean)
    : [];
  return { ok: true, data: paths, status: 200, errorReason: null };
}

export async function fetchRawFile(
  owner: string,
  repo: string,
  branch: string,
  path: string
): Promise<string | null> {
  try {
    const response = await fetchWithTimeout(
      `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`,
      {},
      8000
    );
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

export async function fetchPackageJsonFromRepo(
  owner: string,
  repo: string,
  branch: string
): Promise<Record<string, unknown> | null> {
  const raw = await fetchRawFile(owner, repo, branch, "package.json");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
