import { NextRequest } from "next/server";
import { getScan } from "@/lib/store/scanStore";
import { GitPulseError, successResponse, errorResponse } from "@/lib/errors";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // This never touches storage: the id itself is the encoded scan result.
    // A missing/invalid id is a normal, expected condition (e.g. a stale
    // bookmark or corrupted URL) — not a server error.
    const scan = await getScan(params.id);
    if (!scan) {
      throw new GitPulseError("SCAN_NOT_FOUND", "This scan could not be found. It may have an invalid or corrupted link.", 404);
    }
    return successResponse(scan);
  } catch (err) {
    if (err instanceof GitPulseError) return errorResponse(err);
    return errorResponse(new GitPulseError("ANALYSIS_INTERNAL_ERROR", "Could not load this scan. Please try again.", 500, String(err)));
  }
}
