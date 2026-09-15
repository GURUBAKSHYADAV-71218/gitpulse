import { NextRequest } from "next/server";
import { githubAnalyzeSchema } from "@/lib/validation/schemas";
import { parseGithubUrl } from "@/lib/services/githubService";
import { runGithubScan } from "@/lib/scanRunner";
import { GitPulseError, successResponse, errorResponse } from "@/lib/errors";
import { withTimeout, TimeoutError } from "@/lib/utils/withTimeout";

export const runtime = "nodejs";
export const maxDuration = 60;

const ANALYSIS_TIMEOUT_MS = 50_000; // comfortably under the 60s maxDuration above

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new GitPulseError("VALIDATION_ERROR", "Request body must be valid JSON.", 400);
    }

    const parsed = githubAnalyzeSchema.safeParse(body);
    if (!parsed.success) {
      throw new GitPulseError("VALIDATION_ERROR", parsed.error.issues[0]?.message ?? "Invalid request.", 400);
    }

    // parseGithubUrl only accepts github.com hosts (exact hostname match via
    // the URL parser) — this is the SSRF boundary for the entire route. No
    // other host is ever fetched as a result of user input.
    const parsedUrl = parseGithubUrl(parsed.data.url);
    if (!parsedUrl) {
      throw new GitPulseError(
        "GITHUB_INVALID_URL",
        "Please enter a valid GitHub repository URL, e.g. https://github.com/owner/repository",
        400
      );
    }

    const scan = await withTimeout(
      runGithubScan(parsedUrl.owner, parsedUrl.repo, parsed.data.url),
      ANALYSIS_TIMEOUT_MS
    ).catch((err) => {
      if (err instanceof TimeoutError) {
        throw new GitPulseError(
          "ANALYSIS_TIMEOUT",
          "Analysis took too long to complete. This can happen with very large repositories — please try again.",
          504,
          err.message
        );
      }
      throw err;
    });

    return successResponse({ scanId: scan.id });
  } catch (err) {
    if (err instanceof GitPulseError) return errorResponse(err);
    return errorResponse(new GitPulseError("ANALYSIS_INTERNAL_ERROR", "Analysis failed unexpectedly. Please try again.", 500, String(err)));
  }
}
