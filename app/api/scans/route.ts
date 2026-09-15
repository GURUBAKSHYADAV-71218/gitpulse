import { listScanHistory, localHistoryEnabled } from "@/lib/store/scanStore";
import { successResponse, errorResponse, GitPulseError } from "@/lib/errors";

export const runtime = "nodejs";

export async function GET() {
  try {
    const scans = await listScanHistory();
    return successResponse({ scans, historyEnabled: localHistoryEnabled });
  } catch (err) {
    return errorResponse(new GitPulseError("ANALYSIS_INTERNAL_ERROR", "Could not load scan history.", 500, String(err)));
  }
}
