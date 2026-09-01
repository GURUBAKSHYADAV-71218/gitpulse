import { NextRequest, NextResponse } from "next/server";
import { packageJsonUploadSchema, packageJsonShapeSchema } from "@/lib/validation/schemas";
import { runPackageJsonScan } from "@/lib/scanRunner";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2MB

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const parsedBody = packageJsonUploadSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: parsedBody.error.issues[0]?.message ?? "Invalid request." },
      { status: 400 }
    );
  }

  const { fileContent } = parsedBody.data;

  if (Buffer.byteLength(fileContent, "utf-8") > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File exceeds the 2MB upload limit." }, { status: 413 });
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(fileContent);
  } catch {
    return NextResponse.json(
      { error: "The uploaded file is not valid JSON. Please check the file and try again." },
      { status: 400 }
    );
  }

  const shapeResult = packageJsonShapeSchema.safeParse(parsedJson);
  if (!shapeResult.success) {
    return NextResponse.json(
      { error: "This does not look like a valid package.json file (unexpected structure)." },
      { status: 400 }
    );
  }

  const pkg = shapeResult.data;
  const hasAnyDeps =
    pkg.dependencies || pkg.devDependencies || pkg.peerDependencies || pkg.optionalDependencies;

  if (!hasAnyDeps) {
    return NextResponse.json(
      { error: "This package.json does not declare any dependencies to analyze." },
      { status: 422 }
    );
  }

  try {
    const scan = await runPackageJsonScan(pkg, pkg.name ? `${pkg.name}/package.json` : undefined);
    return NextResponse.json({ scanId: scan.id }, { status: 200 });
  } catch (err) {
    return NextResponse.json(
      { error: "Analysis failed unexpectedly. Please try again." },
      { status: 500 }
    );
  }
}
