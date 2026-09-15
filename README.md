# GitPulse

**Engineering Health, At a Glance.**

GitPulse analyzes software projects and public GitHub repositories across dependency health, security, maintenance, repository activity, contributor concentration, testing, and documentation, and produces an explainable Engineering Health Score with prioritized recommendations.

## Architecture: how a scan actually works in production

This is the most important thing to understand before deploying or modifying this project.

**A scan result never touches a database or a filesystem.** The scan ID returned by `/api/analyze/github` and `/api/analyze/package` is a gzip-compressed, base64url-encoded copy of the *entire* scan result. `GET /api/scans/[id]` and every dashboard page retrieve a scan purely by decoding that ID — there is no lookup, no shared state, and nothing that can go stale or disappear between requests.

This is a deliberate choice, not an oversight: Vercel serverless functions run on an ephemeral filesystem with no guaranteed shared state between invocations or instances. A JSON-file "database" (which is what earlier iterations of this MVP used) works in local development and silently breaks in production the instant a scan and its dashboard view land on different function instances — which, on Vercel, is the common case, not an edge case.

The trade-off is stated plainly: scan URLs are long, because they contain the report. Sharing or bookmarking a scan means sharing/bookmarking that URL, and there's a (generous, ~150-dependency) cap on how much per-dependency detail can ride along in the URL for very large monorepos — see `lib/scanEncoding.ts`.

**Local scan history is a separate, local-development-only convenience.** It's backed by a JSON file at `data/scans.json`, and it is automatically disabled when `VERCEL` (set by the platform itself) is present in the environment. Every filesystem operation behind it is wrapped so a failure there can never break the actual scan flow — recording history is fire-and-forget and best-effort by design. On a production deployment, the `/history` page explains this plainly rather than showing a silently-empty or broken list.

## Features

- **Dependency analysis** — dependency-free semver parsing/comparison, update classification, deprecation detection
- **Security analysis** — real vulnerability advisories from [OSV.dev](https://osv.dev), severity-scored, never fabricated
- **Maintenance analysis** — staleness, deprecation, and version-lag signals, kept separate from security
- **Repository analysis** — stars, forks, issues, releases, and push activity from the GitHub API
- **Contributor analysis** — contribution distribution and an estimated bus factor
- **Testing analysis** — detected frameworks, test files, CI configuration (detection only — GitPulse never executes repository code)
- **Documentation analysis** — README/LICENSE/CONTRIBUTING/docs presence and structural heuristics
- **Explainable, centralized scoring** — named weights, renormalized around whatever data is actually available; nothing is silently treated as "perfect" when it's missing
- **Recommendation engine** — prioritized, evidence-backed actions derived only from real findings
- **Markdown report export** + print view
- **Optional AI summary** — interpretation layer only, deterministic fallback when unconfigured
- **Stateless, Vercel-compatible scan retrieval** (see above)

## Tech stack

Next.js 14 (App Router), TypeScript (strict), Tailwind CSS, Zod, Recharts, Lucide React. External data: npm registry, GitHub REST API, OSV.dev.

## Error handling contract

Every API route returns one of two shapes:

```json
{ "success": true, "data": { ... } }
```
```json
{ "success": false, "error": { "code": "GITHUB_NOT_FOUND", "message": "Repository not found. It may be private, unavailable, or the URL may be incorrect." } }
```

Error codes: `GITHUB_INVALID_URL`, `GITHUB_NOT_FOUND`, `GITHUB_RATE_LIMITED`, `GITHUB_API_ERROR`, `PACKAGE_JSON_INVALID`, `UPLOAD_TOO_LARGE`, `VALIDATION_ERROR`, `SCAN_NOT_FOUND`, `ANALYSIS_TIMEOUT`, `ANALYSIS_INTERNAL_ERROR`.

The frontend (`lib/errorMessages.ts`) maps these codes to user-facing copy. Server logs always contain the real underlying error (via `GitPulseError.internalDetails`, logged in `lib/errors.ts`); the client never sees a raw stack trace or exception string.

## Reliability properties

- **Every external HTTP call has a timeout** via `AbortController` (`lib/utils/cache.ts:fetchWithTimeout`) — nothing can hang a serverless invocation indefinitely.
- **Every analysis route has a top-level deadline** (`lib/utils/withTimeout.ts`) shorter than its declared `maxDuration`, so GitPulse returns a clear `ANALYSIS_TIMEOUT` instead of letting the platform kill the function with an opaque error.
- **Per-dependency and per-endpoint failure isolation**: one broken npm package, one failed GitHub sub-request (releases, commits, contributors, tree), never aborts the whole scan — it's marked unavailable and the scan continues with real data everywhere else.
- **SSRF protection**: the GitHub URL parser (`lib/services/githubService.ts:parseGithubUrl`) uses the real `URL` parser and only accepts an exact `github.com` (or `www.github.com`) hostname — userinfo tricks (`github.com@evil.example`) and subdomain-confusion tricks (`github.com.evil.example`) are rejected, not merely handled loosely by regex.
- **GitHub analysis works without a token** for public repositories; `GITHUB_TOKEN` is purely a rate-limit upgrade (60/hr → 5,000/hr), never a hard requirement.

## Installation

```bash
git clone <your-repository-url>
cd gitpulse
npm install
cp .env.example .env.local
```

## Environment variables

| Variable | Required? | Description |
|---|---|---|
| `GITHUB_TOKEN` | Optional (strongly recommended for production) | Without it, GitHub analysis still works for public repos but is limited to 60 unauthenticated requests/hour per IP — easy to exhaust in production. Create a token with no special scopes at github.com/settings/tokens. |
| `OSV_API_URL` | Optional | Overrides the OSV.dev API base URL. |
| `AI_API_KEY` | Optional | Enables the AI-written engineering summary (Anthropic API key). Without it, a deterministic template-based summary is used — every other feature is unaffected. |
| `DATABASE_URL` | Not currently used | Reserved. The core scan flow does not require a database (see Architecture above). |

Nothing is required to run GitPulse against public repositories out of the box.

## Development

```bash
npm run dev
```
Visit `http://localhost:3000`.

## Build & lint

```bash
npm run typecheck
npm run lint
npm run build
```

## Production build

```bash
npm run build
npm run start
```

## Deployment (Vercel)

1. Push to GitHub, import the repo in Vercel.
2. Set `GITHUB_TOKEN` (recommended) and optionally `AI_API_KEY` / `OSV_API_URL` in Vercel's Environment Variables — never as `NEXT_PUBLIC_*`.
3. Deploy. No database, no additional infrastructure, and no filesystem configuration is required — the core scan flow is stateless by design (see Architecture above).
4. `maxDuration = 60` is set on both analyze routes; confirm your Vercel plan supports this (Hobby plans have historically capped function duration lower — check your plan's current limits and adjust `ANALYSIS_TIMEOUT_MS` in the route files and `maxDuration` together if needed, keeping the internal timeout comfortably below the platform limit).

## Limitations

- GitHub's REST API doesn't cleanly separate open issues from open PRs in the core repo endpoint; GitPulse reports open issues and marks PR count explicitly unavailable rather than approximating it.
- Test coverage percentage is not measured — GitPulse detects testing *infrastructure*, never executes tests or arbitrary repository code.
- "Current resolved version" is a best-effort floor derived from the declared semver range, not a lockfile-accurate resolution.
- Very large monorepos (150+ dependencies) have their per-dependency detail list truncated in the shareable scan link for URL-size reasons; all counts and scores reflect the full analysis regardless — the dashboard states explicitly when this truncation happens.
- Scan history is a local-development-only convenience and is not available on serverless deployments (see Architecture above); individual scan results are unaffected and fully shareable via URL.

## Roadmap

Score trends over time, scheduled/monitored scans, and broader ecosystem support beyond npm would all require real persistent storage (a proper database) and are intentionally out of scope for this MVP rather than faked with local-only storage.
