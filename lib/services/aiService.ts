import { fetchWithTimeout } from "../utils/cache";
import type { EngineeringHealthScore, Issue, Recommendation, ScanSource } from "../types";

// AI is strictly an interpretation layer on top of already-computed,
// deterministic analysis results. It never performs scoring or invents
// findings; it only summarizes the structured report it is given. If
// AI_API_KEY is not configured, GitPulse falls back to a deterministic,
// template-based summary and the rest of the product is unaffected.

export interface EngineeringSummaryInput {
  source: ScanSource;
  health: EngineeringHealthScore;
  topIssues: Issue[];
  topRecommendations: Recommendation[];
}

export interface EngineeringSummaryResult {
  text: string;
  generatedBy: "ai" | "deterministic";
}

function buildDeterministicSummary(input: EngineeringSummaryInput): string {
  const { health, topIssues, topRecommendations, source } = input;
  const overall = health.overall;
  const scoreText = overall === null ? "could not be fully calculated due to unavailable data" : `scored ${overall}/100 (${health.bandLabel.toLowerCase()})`;

  const weakest = [...health.categories]
    .filter((c) => c.score !== null)
    .sort((a, b) => (a.score ?? 0) - (b.score ?? 0))
    .slice(0, 2);

  const weakestText =
    weakest.length > 0
      ? `The lowest-scoring areas are ${weakest.map((c) => `${c.label} (${c.score}/100)`).join(" and ")}.`
      : "";

  const issuesText =
    topIssues.length > 0
      ? `Key findings include ${topIssues
          .slice(0, 3)
          .map((i) => i.title.toLowerCase())
          .join("; ")}.`
      : "No high-severity issues were detected in this scan.";

  const recText =
    topRecommendations.length > 0
      ? `The top priority is to ${topRecommendations[0]?.title.toLowerCase()}.`
      : "";

  return [
    `${source.label} ${scoreText}.`,
    weakestText,
    issuesText,
    recText
  ]
    .filter(Boolean)
    .join(" ");
}

export async function generateEngineeringSummary(
  input: EngineeringSummaryInput
): Promise<EngineeringSummaryResult> {
  const apiKey = process.env.AI_API_KEY;
  if (!apiKey) {
    return { text: buildDeterministicSummary(input), generatedBy: "deterministic" };
  }

  const structuredReport = {
    source: input.source,
    overallScore: input.health.overall,
    band: input.health.bandLabel,
    categoryScores: input.health.categories.map((c) => ({ category: c.label, score: c.score })),
    issues: input.topIssues.map((i) => ({ severity: i.severity, title: i.title, description: i.description })),
    recommendations: input.topRecommendations.map((r) => ({ priority: r.priority, title: r.title }))
  };

  const prompt = [
    "You are summarizing a software engineering health report for a developer.",
    "Use ONLY the structured JSON data below. Do not invent versions, CVEs, scores, contributors, or commits.",
    "Write 3-5 sentences: overall health, the biggest risks, and the first priority to fix.",
    "",
    JSON.stringify(structuredReport, null, 2)
  ].join("\n");

  try {
    const response = await fetchWithTimeout(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 400,
          messages: [{ role: "user", content: prompt }]
        })
      },
      15000
    );

    if (!response.ok) {
      return { text: buildDeterministicSummary(input), generatedBy: "deterministic" };
    }

    const json = await response.json();
    const text = json?.content?.find((block: { type: string }) => block.type === "text")?.text;
    if (!text || typeof text !== "string") {
      return { text: buildDeterministicSummary(input), generatedBy: "deterministic" };
    }
    return { text: text.trim(), generatedBy: "ai" };
  } catch {
    return { text: buildDeterministicSummary(input), generatedBy: "deterministic" };
  }
}
