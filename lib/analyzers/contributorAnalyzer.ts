import { fetchContributors } from "../services/githubService";
import type { ContributorAnalysis, Severity } from "../types";

/**
 * Estimates bus factor as the minimum number of top contributors whose
 * combined contributions cross 50% of total recorded contributions. This
 * is explicitly labeled an *estimate*: GitHub's contributor stats count
 * commits on the default branch only and don't capture review, design, or
 * operational ownership.
 */
function estimateBusFactor(sortedContributions: number[], total: number): number {
  if (total === 0) return 0;
  let cumulative = 0;
  let count = 0;
  for (const c of sortedContributions) {
    cumulative += c;
    count++;
    if (cumulative / total >= 0.5) break;
  }
  return count;
}

function concentrationRisk(topPercentage: number): Severity {
  if (topPercentage >= 80) return "high";
  if (topPercentage >= 60) return "medium";
  return "low";
}

export async function analyzeContributors(owner: string, repo: string): Promise<ContributorAnalysis> {
  const result = await fetchContributors(owner, repo);

  if (!result.ok || !result.data) {
    return {
      totalContributors: 0,
      topContributors: [],
      topContributorConcentration: 0,
      estimatedBusFactor: 0,
      concentrationRisk: "unknown",
      dataAvailable: false,
      unavailableReason: result.errorReason ?? "Contributor data unavailable."
    };
  }

  const contributors = result.data;
  const total = contributors.reduce((sum, c) => sum + c.contributions, 0);
  const sorted = [...contributors].sort((a, b) => b.contributions - a.contributions);

  const topContributors = sorted.slice(0, 10).map((c) => ({
    login: c.login,
    contributions: c.contributions,
    percentageOfTotal: total > 0 ? Math.round((c.contributions / total) * 1000) / 10 : 0,
    profileUrl: c.htmlUrl
  }));

  const topPercentage = topContributors[0]?.percentageOfTotal ?? 0;
  const busFactor = estimateBusFactor(sorted.map((c) => c.contributions), total);

  return {
    totalContributors: contributors.length,
    topContributors,
    topContributorConcentration: topPercentage,
    estimatedBusFactor: busFactor,
    concentrationRisk: total > 0 ? concentrationRisk(topPercentage) : "unknown",
    dataAvailable: true,
    unavailableReason: null
  };
}
