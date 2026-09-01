import { NextRequest, NextResponse } from "next/server";
import { getScan } from "@/lib/store/scanStore";
import { generateMarkdownReport } from "@/lib/reports/reportGenerator";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const scan = await getScan(params.id);
  if (!scan) {
    return NextResponse.json({ error: "Scan not found." }, { status: 404 });
  }

  const markdown = generateMarkdownReport(scan);
  const safeName = scan.source.label.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

  return new NextResponse(markdown, {
    status: 200,
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="gitpulse-report-${safeName}.md"`
    }
  });
}
