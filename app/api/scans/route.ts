import { NextResponse } from "next/server";
import { listScanHistory } from "@/lib/store/scanStore";

export const runtime = "nodejs";

export async function GET() {
  const history = await listScanHistory();
  return NextResponse.json({ scans: history }, { status: 200 });
}
