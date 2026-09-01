import { NextRequest, NextResponse } from "next/server";
import { githubAnalyzeSchema } from "@/lib/validation/schemas";
import { parseGithubUrl } from "@/lib/services/githubService";
import { runGithubScan } from "@/lib/scanRunner";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsed = githubAnalyzeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    );
  }

  const parsedUrl = parseGithubUrl(parsed.data.url);
  if (!parsedUrl) {
    return NextResponse.json(
      { error: "Please enter a valid GitHub repository URL, e.g. https://github.com/owner/repository" },
      { status: 400 }
    );
  }

  try {
    const result = await runGithubScan(parsedUrl.owner, parsedUrl.repo, parsed.data.url);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }
    return NextResponse.json({ scanId: result.scan.id }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: "Analysis failed unexpectedly. Please try again." },
      { status: 500 }
    );
  }
}
