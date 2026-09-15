import { NextRequest } from "next/server";
import { packageJsonUploadSchema, packageJsonShapeSchema } from "@/lib/validation/schemas";
import { runPackageJsonScan } from "@/lib/scanRunner";
import { GitPulseError, successResponse, errorResponse } from "@/lib/errors";
import { withTimeout, TimeoutError } from "@/lib/utils/withTimeout";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const ANALYSIS_TIMEOUT_MS = 45_000; // comfortably under the 60s maxDuration above

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      throw new GitPulseError("VALIDATION_ERROR", "Request body must be valid JSON.", 400);
    }

    const parsedBody = packageJsonUploadSchema.safeParse(body);
    if (!parsedBody.success) {
      throw new GitPulseError("VALIDATION_ERROR", parsedBody.error.issues[0]?.message ?? "Invalid request.", 400);
    }

    const { fileContent } = parsedBody.data;

    if (Buffer.byteLength(fileContent, "utf-8") > MAX_UPLOAD_BYTES) {
      throw new GitPulseError("UPLOAD_TOO_LARGE", "File exceeds the 2MB upload limit.", 413);
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(fileContent);
    } catch {
      throw new GitPulseError("PACKAGE_JSON_INVALID", "The uploaded file is not valid JSON. Please check the file and try again.", 400);
    }

    const shapeResult = packageJsonShapeSchema.safeParse(parsedJson);
    if (!shapeResult.success) {
      throw new GitPulseError("PACKAGE_JSON_INVALID", "This does not look like a valid package.json file (unexpected structure).", 400);
    }

    const pkg = shapeResult.data;
    const hasAnyDeps = pkg.dependencies || pkg.devDependencies || pkg.peerDependencies || pkg.optionalDependencies;
    if (!hasAnyDeps) {
      throw new GitPulseError("PACKAGE_JSON_INVALID", "This package.json does not declare any dependencies to analyze.", 422);
    }

    const scan = await withTimeout(
      runPackageJsonScan(pkg, pkg.name ? `${pkg.name}/package.json` : undefined),
      ANALYSIS_TIMEOUT_MS
    ).catch((err) => {
      if (err instanceof TimeoutError) {
        throw new GitPulseError("ANALYSIS_TIMEOUT", "Analysis took too long to complete. Please try again.", 504, err.message);
      }
      throw err;
    });

    return successResponse({ scanId: scan.id });
  } catch (err) {
    if (err instanceof GitPulseError) return errorResponse(err);
    return errorResponse(new GitPulseError("ANALYSIS_INTERNAL_ERROR", "Analysis failed unexpectedly. Please try again.", 500, String(err)));
  }
}
