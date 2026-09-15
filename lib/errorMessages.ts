// Client-safe (no server-only imports) mapping from the backend's stable
// error codes to friendly, actionable copy. Falls back to the server's own
// message if a code isn't recognized, so this never hides information.

const FRIENDLY_MESSAGES: Record<string, string> = {
  GITHUB_INVALID_URL: "That doesn't look like a valid GitHub repository URL. Try something like https://github.com/owner/repository.",
  GITHUB_NOT_FOUND: "GitHub repository could not be accessed. It may be private, unavailable, or the URL may be incorrect.",
  GITHUB_RATE_LIMITED: "GitHub's API rate limit was reached. Please try again in a few minutes.",
  GITHUB_API_ERROR: "GitHub's API is currently unavailable. Please try again shortly.",
  PACKAGE_JSON_INVALID: "This file doesn't look like a valid package.json. Please check it and try again.",
  UPLOAD_TOO_LARGE: "That file is too large to analyze (2MB limit).",
  VALIDATION_ERROR: "Please check your input and try again.",
  SCAN_NOT_FOUND: "This scan link is invalid or has expired.",
  ANALYSIS_TIMEOUT: "Analysis took too long to complete. Please try again — this can happen with very large repositories.",
  ANALYSIS_INTERNAL_ERROR: "Something went wrong during analysis. Please try again.",
  UNKNOWN_ERROR: "Something went wrong. Please try again."
};

export function friendlyErrorMessage(code: string | undefined, fallbackMessage: string | undefined): string {
  if (code && FRIENDLY_MESSAGES[code]) return FRIENDLY_MESSAGES[code];
  return fallbackMessage || "Something went wrong. Please try again.";
}
