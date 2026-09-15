import { fetchWithTimeout, TtlCache } from "../utils/cache";

const GITHUB_API = "https://api.github.com";
const CACHE_TTL_MS = 10 * 60 * 1000;

const repoCache = new TtlCache<GithubServiceResult<GithubRepoData>>(CACHE_TTL_MS);

export interface GithubServiceResult<T> {
  ok: boolean;
  data: T | null;
  status: number | null; // raw HTTP status, or null for network/timeout failures
  errorReason: string | null;
}

export interface GithubRepoData {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  language: string | null;
  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number;
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

// ---------------------------------------------------------------------------
// Raw GitHub REST API response shapes
// ---------------------------------------------------------------------------
// These describe only the fields GitPulse actually reads. Every field is
// optional because GitPulse treats all upstream API data as untrusted and
// potentially incomplete — the mapping functions below supply explicit
// fallbacks rather than assuming any field is present. This replaces the
// previous use of `any`, which gave no protection against GitHub response
// shape changes.
// ---------------------------------------------------------------------------

interface RawGithubRepo {
  owner?: { login?: string };
  name?: string;
  full_name?: string;
  description?: string | null;
  language?: string | null;
  stargazers_count?: number;
  forks_count?: number;
  open_issues_count?: number;
  created_at?: string;
  pushed_at?: string;
  default_branch?: string;
  license?: { spdx_id?: string | null; name?: string | null } | null;
  archived?: boolean;
  private?: boolean;
}

interface RawGithubContributor {
  login?: string;
  contributions?: number;
  html_url?: string;
}

interface RawGithubRelease {
  tag_name?: string;
  published_at?: string | null;
}

interface RawGithubCommit {
  sha?: string;
  commit?: { committer?: { date?: string } };
}

function authHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
  // GitHub analysis is designed to work without a token for public repos.
  // The token is purely a rate-limit upgrade, never a hard requirement.
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

function classifyError(status: number): string {
  if (status === 404) return "Repository not found. It may be private, deleted, or the URL may be incorrect.";
  if (status === 403) return "GitHub API rate limit exceeded. Configure GITHUB_TOKEN to increase limits, or try again later.";
  if (status === 401) return "GitHub authentication failed. Check the configured GITHUB_TOKEN.";
  if (status >= 500) return "GitHub API is currently unavailable.";
  return `GitHub API returned an unexpected error (HTTP ${status}).`;
}

/**
 * Parses a user-supplied string into a GitHub {owner, repo} pair.
 *
 * Security note: this uses the real URL parser (not just a regex over the
 * raw string) specifically to close userinfo/host-confusion tricks like
 * "https://github.com@evil.example/x/y" or "https://github.com.evil.example/x/y",
 * where a naive substring or overly loose regex check could be fooled into
 * treating an attacker-controlled host as github.com. Only exact hostname
 * "github.com" (or "www.github.com") is accepted; every other host is
 * rejected outright, and GitPulse never fetches an arbitrary URL supplied
 * by the user.
 */
export function parseGithubUrl(input: string): { owner: string; repo: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const shorthandMatch = /^([\w.-]+)\/([\w.-]+)$/.exec(trimmed);
  const validateSegment = (s: string) => /^[\w.-]+$/.test(s) && s !== "." && s !== "..";

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    if (shorthandMatch && shorthandMatch[1] && shorthandMatch[2] && validateSegment(shorthandMatch[1]) && validateSegment(shorthandMatch[2])) {
      return { owner: shorthandMatch[1], repo: shorthandMatch[2].replace(/\.git$/, "") };
    }
    return null;
  }

  const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  if (hostname !== "github.com") {
    if (shorthandMatch && shorthandMatch[1] && shorthandMatch[2] && validateSegment(shorthandMatch[1]) && validateSegment(shorthandMatch[2])) {
      return { owner: shorthandMatch[1], repo: shorthandMatch[2].replace(/\.git$/, "") };
    }
    return null;
  }

  const segments = url.pathname.split("/").filter(Boolean);
  const owner = segments[0];
  const repo = segments[1];
  if (!owner || !repo) return null;

  const cleanRepo = repo.replace(/\.git$/, "");
  if (!validateSegment(owner) || !validateSegment(cleanRepo)) return null;

  return { owner, repo: cleanRepo };
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

export async function fetchRepository(owner: string, repo: string): Promise<GithubServiceResult<GithubRepoData>> {
  const cacheKey = `${owner}/${repo}`.toLowerCase();
  const cached = repoCache.get(cacheKey);
  if (cached) return cached;

  const result = await githubGet<RawGithubRepo>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
  if (!result.ok || !result.data) {
    return { ok: false, data: null, status: result.status, errorReason: result.errorReason };
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
      // createdAt/pushedAt are non-optional on GithubRepoData; an empty
      // string here is filtered out downstream by daysSince(), which
      // treats an unparseable date as "unknown" rather than fabricating one.
      createdAt: d.created_at ?? "",
      pushedAt: d.pushed_at ?? "",
      defaultBranch: d.default_branch ?? "main",
      license: d.license?.spdx_id ?? d.license?.name ?? null,
      archived: !!d.archived,
      private: !!d.private
    }
  };
  repoCache.set(cacheKey, mapped);
  return mapped;
}

export async function fetchContributors(owner: string, repo: string): Promise<GithubServiceResult<GithubContributor[]>> {
  const result = await githubGet<RawGithubContributor[]>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contributors?per_page=30&anon=false`
  );
  if (!result.ok || !result.data) return { ok: false, data: null, status: result.status, errorReason: result.errorReason };
  if (!Array.isArray(result.data)) {
    return { ok: false, data: null, status: result.status, errorReason: "Unexpected contributor data shape from GitHub API." };
  }
  const contributors: GithubContributor[] = result.data
    .filter((c): c is RawGithubContributor & { login: string } => !!c && typeof c.login === "string")
    .map((c) => ({ login: c.login, contributions: c.contributions ?? 0, htmlUrl: c.html_url ?? `https://github.com/${c.login}` }));
  return { ok: true, data: contributors, status: 200, errorReason: null };
}

export async function fetchReleases(owner: string, repo: string): Promise<GithubServiceResult<GithubRelease[]>> {
  const result = await githubGet<RawGithubRelease[]>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/releases?per_page=5`
  );
  if (!result.ok || !result.data) return { ok: false, data: null, status: result.status, errorReason: result.errorReason };
  if (!Array.isArray(result.data)) {
    return { ok: false, data: null, status: result.status, errorReason: "Unexpected release data shape from GitHub API." };
  }
  const releases: GithubRelease[] = result.data
    .filter((r): r is RawGithubRelease & { tag_name: string } => !!r && typeof r.tag_name === "string")
    .map((r) => ({ tagName: r.tag_name, publishedAt: r.published_at ?? null }));
  return { ok: true, data: releases, status: 200, errorReason: null };
}

export async function fetchRecentCommits(owner: string, repo: string, branch: string): Promise<GithubServiceResult<GithubCommit[]>> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const result = await githubGet<RawGithubCommit[]>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?sha=${encodeURIComponent(branch)}&since=${since}&per_page=100`
  );
  if (!result.ok || !result.data) return { ok: false, data: null, status: result.status, errorReason: result.errorReason };
  if (!Array.isArray(result.data)) {
    return { ok: false, data: null, status: result.status, errorReason: "Unexpected commit data shape from GitHub API." };
  }
  const commits: GithubCommit[] = result.data
    .filter((c): c is RawGithubCommit & { sha: string } => !!c && typeof c.sha === "string")
    .map((c) => ({ sha: c.sha, date: c.commit?.committer?.date ?? null }));
  return { ok: true, data: commits, status: 200, errorReason: null };
}

export async function fetchRepoTree(owner: string, repo: string, branch: string): Promise<GithubServiceResult<string[]>> {
  const result = await githubGet<{ tree?: Array<{ path?: string }> }>(
    `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`
  );
  if (!result.ok || !result.data) return { ok: false, data: null, status: result.status, errorReason: result.errorReason };
  const paths: string[] = Array.isArray(result.data.tree)
    ? result.data.tree.map((entry) => entry.path).filter((p): p is string => !!p)
    : [];
  return { ok: true, data: paths, status: 200, errorReason: null };
}

export async function fetchRawFile(owner: string, repo: string, branch: string, path: string): Promise<string | null> {
  try {
    const response = await fetchWithTimeout(
      `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${path}`,
      {},
      8000
    );
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

export async function fetchPackageJsonFromRepo(owner: string, repo: string, branch: string): Promise<Record<string, unknown> | null> {
  const raw = await fetchRawFile(owner, repo, branch, "package.json");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
