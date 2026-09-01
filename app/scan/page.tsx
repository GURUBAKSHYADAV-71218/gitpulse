import { Suspense } from "react";
import Link from "next/link";
import { Activity } from "lucide-react";
import { ScanFlow } from "@/components/scan/ScanFlow";

export default function ScanPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16">
      <div className="mb-8 flex items-center justify-center gap-2">
        <Activity className="h-5 w-5 text-brand" strokeWidth={2} />
        <Link href="/" className="font-display text-lg font-semibold text-ink">
          GitPulse
        </Link>
      </div>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-lg bg-bg-surface" />}>
        <ScanFlow />
      </Suspense>
    </div>
  );
}
