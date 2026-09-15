import { NextResponse } from "next/server";

// Centralized error handling so every API route returns a predictable,
// machine-readable shape and every failure is diagnosable from server logs
// without ever leaking internals (stack traces, raw exception messages) to
// the client.

export type ErrorCode =
  | "GITHUB_INVALID_URL"
  | "GITHUB_NOT_FOUND"
  | "GITHUB_RATE_LIMITED"
  | "GITHUB_API_ERROR"
  | "PACKAGE_JSON_INVALID"
  | "UPLOAD_TOO_LARGE"
  | "VALIDATION_ERROR"
  | "SCAN_NOT_FOUND"
  | "ANALYSIS_TIMEOUT"
  | "ANALYSIS_INTERNAL_ERROR";

/**
 * A GitPulseError carries a stable machine-readable code, a message safe to
 * show a user, an HTTP status, and an optional internal detail string that
 * is logged server-side but never sent to the client.
 */
export class GitPulseError extends Error {
  code: ErrorCode;
  status: number;
  internalDetails?: string;

  constructor(code: ErrorCode, message: string, status = 500, internalDetails?: string) {
    super(message);
    this.name = "GitPulseError";
    this.code = code;
    this.status = status;
    this.internalDetails = internalDetails;
  }
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
}

export interface ApiFailure {
  success: false;
  error: {
    code: ErrorCode | "UNKNOWN_ERROR";
    message: string;
  };
}

export function successResponse<T>(data: T, status = 200): NextResponse<ApiSuccess<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

/**
 * Converts any thrown value into a structured API error response.
 * GitPulseError instances pass their code/status/message straight through.
 * Anything else is logged in full server-side (so it's diagnosable) and
 * returned to the client as a generic, safe message — never a raw stack
 * trace or exception string.
 */
export function errorResponse(err: unknown): NextResponse<ApiFailure> {
  if (err instanceof GitPulseError) {
    // eslint-disable-next-line no-console
    console.error(`[GitPulse:${err.code}] ${err.message}`, err.internalDetails ?? "");
    return NextResponse.json(
      { success: false, error: { code: err.code, message: err.message } },
      { status: err.status }
    );
  }

  // eslint-disable-next-line no-console
  console.error("[GitPulse:UNKNOWN_ERROR] Unexpected failure:", err);
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "UNKNOWN_ERROR",
        message: "Something went wrong while processing your request. Please try again."
      }
    },
    { status: 500 }
  );
}
