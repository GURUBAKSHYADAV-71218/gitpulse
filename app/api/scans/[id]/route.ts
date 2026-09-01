import { NextRequest, NextResponse } from "next/server";
import { getScan } from "@/lib/store/scanStore";

export const runtime = "nodejs";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const scan = await getScan(params.id);
  if (!scan) {
    return NextResponse.json({ error: "Scan not found." }, { status: 404 });
  }
  return NextResponse.json(scan, { status: 200 });
}
