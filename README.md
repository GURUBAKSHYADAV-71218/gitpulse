# GitPulse

**Engineering Health, At a Glance.**

GitPulse is an engineering health platform that analyzes software projects and public GitHub repositories across dependency health, security, maintenance, repository activity, contributor concentration, testing, documentation, and project structure. It combines these signals into an explainable Engineering Health Score and produces prioritized, evidence-backed recommendations.

## Problem

Outdated dependencies, unpatched vulnerabilities, thinning contributor coverage, and missing tests rarely announce themselves. They accumulate quietly until a security incident, a broken build, or a departing maintainer turns them into an emergency.

## Solution

GitPulse retrieves real data — npm registry metadata, GitHub repository and contributor data, and OSV security advisories — and turns it into a scored, explainable report. Every number traces back to a real finding. Where data is unavailable, GitPulse says so explicitly instead of guessing.

## Features

- **Dependency analysis** — semantic version parsing/comparison, update classification (current/patch/minor/major), deprecation detection
- **Security analysis** — real vulnerability advisories from [OSV.dev](https://osv.dev), severity-scored, never fabricated
- **Maintenance analysis** — staleness, deprecation, and version-lag signals, kept conceptually separate from security
- **Repository analysis** — stars, forks, issues, releases, and push activity from the GitHub API
- **Contributor analysis** — contribution distribution and an estimated bus factor
- **Testing analysis** — detected frameworks, test files, and CI configuration (detection only — GitPulse never executes repository code)
- **Documentation analysis** — README/LICENSE/CONTRIBUTING/docs presence and structural heuristics
- **Explainable scoring** — a centralized, configurable scoring engine with named weights; every score change lists its reasons
- **Recommendation engine** — prioritized, evidence-backed actions derived only from real findings
- **Report export** — downloadable Markdown Engineering Health Report, plus a print-friendly view
- **Scan history** — every scan persisted locally with score trend over time
- **Optional AI summary** — an interpretation layer on top of the deterministic report; falls back to a template-based summary if unconfigured

## Architecture

```
gitpulse/
├── app/                        # Next.js App Router
│   ├── page.tsx                 # Landing page
│   ├── scan/                    # Source selection + scan progress
│   ├── history/                 # Scan history
│   ├── dashboard/[scanId]/      # Category pages (overview, dependencies, security, ...)
│   └── api/
│       ├── analyze/package/     # POST — analyze an uploaded package.json
│       ├── analyze/github/      # POST — analyze a GitHub repository
│       └── scans/[id]/          # GET — full report / markdown export
├── components/
│   ├── ui/                      # Design system primitives
│   ├── landing/                 # Landing page sections
│   ├── scan/                    # Scan flow + progress UI
│   └── dashboard/                # Sidebar, charts, tables, cards
├── lib/
│   ├── analyzers/                # One module per engineering dimension
│   ├── services/                 # npm, GitHub, OSV, and AI API clients
│   ├── scoring/                  # Centralized, configurable scoring engine
│   ├── recommendations/          # Issue + recommendation generation
│   ├── reports/                  # Markdown report generator
│   ├── store/                    # Scan persistence
│   ├── validation/                # Zod schemas
│   ├── types/                    # Shared domain types
│   └── scanRunner.ts             # Orchestrates a full scan end to end
└── data/                        # Local JSON scan store (dev persistence)
```

Frontend components handle presentation and user interaction only. All analysis, scoring, and recommendation logic lives in `lib/`, called from Next.js API routes — never scattered across UI components.

## Tech stack

- **Framework:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Validation:** Zod
- **Charts:** Recharts
- **Icons:** Lucide React
- **External data:** npm registry, GitHub REST API, OSV.dev

## How it works

1. **Input** — a public GitHub repository URL, or an uploaded `package.json`.
2. **Analysis** — dedicated analyzer modules retrieve and evaluate real data with bounded concurrency and caching.
3. **Scoring** — `EngineeringScoreEngine` combines category scores into an overall score using configurable, named weights; categories with unavailable data are excluded and the remaining weights are renormalized, rather than assumed.
4. **Recommendations** — `RecommendationEngine` derives prioritized actions strictly from issues found during analysis.
5. **Report** — the full result is stored and rendered across the dashboard, and can be exported as Markdown.

## How security detection works

GitPulse queries [OSV.dev](https://osv.dev)'s batch API for every dependency whose declared version range could be resolved to a concrete version. It never invents CVEs or severities. If OSV is unreachable or rate-limited, the Security page shows an explicit "unavailable" state rather than a false "safe" result.

## How the bus factor estimate works

GitPulse sorts contributors by recorded contribution count and finds the minimum number of top contributors whose combined contributions cross 50% of the total. This is explicitly labeled an *estimate* — GitHub's contributor API only reflects commits on the default branch, not review load, design, or operational ownership.

## Installation

```bash
git clone <your-repository-url>
cd gitpulse
npm install
cp .env.example .env.local
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `GITHUB_TOKEN` | Recommended | Raises the GitHub API rate limit from 60/hr to 5,000/hr. Create a token with no special scopes (public repo read access only) at github.com/settings/tokens. |
| `OSV_API_URL` | No | Overrides the OSV.dev API base URL. Defaults to the public endpoint. |
| `AI_API_KEY` | No | Enables the AI-written engineering summary. Without it, GitPulse uses a deterministic, template-based summary — all scoring and analysis work identically either way. |
| `DATABASE_URL` | No | Not yet wired up (see Persistence below). Reserved for a future Postgres-backed store. |

## Development

```bash
npm run dev
```

Visit `http://localhost:3000`.

## Testing

```bash
npm run typecheck
npm run lint
```

There is no automated test suite bundled in this initial version (see Roadmap). Before relying on this in production, add unit tests for `lib/utils/semver.ts` (version/range parsing) and `lib/scoring/engineeringScoreEngine.ts` (score calculation), which are the two most correctness-sensitive modules.

## Production build

```bash
npm run build
npm run start
```

## Persistence

By default, GitPulse persists scans to a local JSON file at `data/scans.json` so scan history survives a dev server restart. This is intentional for a first version and is fully isolated behind `lib/store/scanStore.ts` — nothing else in the codebase talks to storage directly.

To move to a real database for production (multi-instance deployments need this, since the JSON file is local to one filesystem), implement `scanStore.ts` against Postgres with a schema along these lines, and nothing else in the app needs to change:

```
repositories(id, full_name, ...)
scans(id, repository_id, created_at, overall_score, ...)
dependencies(id, scan_id, name, declared_range, latest_version, update_type, ...)
vulnerabilities(id, dependency_id, advisory_id, severity, fixed_version, ...)
contributors(id, scan_id, login, contributions, percentage, ...)
recommendations(id, scan_id, priority, title, ...)
category_scores(id, scan_id, category, score, weight, ...)
```

## Security considerations

- GitPulse never executes uploaded files or repository code — it only inspects metadata, file trees, and file contents.
- Uploads are limited to 2MB and validated as JSON with a `package.json`-like shape before analysis.
- API keys and tokens are read from environment variables only and are never sent to the browser.
- All external API failures degrade to an explicit "unavailable" state rather than a fabricated result.

## Limitations

- GitHub's REST API does not cleanly separate open issues from open pull requests in the repository summary endpoint; GitPulse reports open issues and marks pull-request count as unavailable rather than approximating it.
- Test coverage percentage is not measured — GitPulse detects testing *infrastructure* (frameworks, test files, CI config) but does not execute tests, since running arbitrary repository code is out of scope by design.
- The "current resolved version" used for dependency comparisons is a best-effort floor derived from the declared semver range, not a lockfile-accurate resolution (GitPulse does not have access to your lockfile).
- Scan history in this version is stored locally per-deployment (see Persistence above).

## Roadmap

**Phase 2** — score trends over time, repository monitoring, scheduled scans, broader language/ecosystem support beyond npm.

**Phase 3** — deeper AI-assisted engineering reports, migration planning for deprecated dependencies, organization-level dashboards.

**Phase 4** — a GitHub Action that runs GitPulse in CI and fails a build below a configured Engineering Health threshold, plus pull request health checks.

## Deployment

The frontend and API routes are a single Next.js app and deploy together (e.g. to Vercel or any Node.js host). Set the environment variables above in your hosting provider's dashboard — do not hard-code them. `data/scans.json` is local-filesystem persistence suited to a single dev instance; see Persistence above before deploying with multiple instances.
