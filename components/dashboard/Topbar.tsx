import Link from "next/link";
import { Clock, Plus } from "lucide-react";
import type { ScanSource } from "@/lib/types";

export function Topbar({ source, createdAt }: { source: ScanSource; createdAt: string }) {
  const scannedAt = new Date(createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

  return (
    <header className="flex h-14 items-center justify-between border-b border-line bg-bg px-6 print:hidden">
      <div className="flex min-w-0 items-center gap-3">
        <p className="truncate font-mono text-sm font-medium text-ink">{source.label}</p>
        <span className="hidden items-center gap-1.5 text-xs text-ink-faint sm:flex">
          <Clock className="h-3.5 w-3.5" />
          Scanned {scannedAt}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Link
          href="/history"
          className="focus-ring hidden rounded-md px-3 py-1.5 text-sm text-ink-muted hover:text-ink sm:block"
        >
          Scan history
        </Link>
        <Link
          href="/scan"
          className="focus-ring inline-flex items-center gap-1.5 rounded-md bg-bg-raised px-3 py-1.5 text-sm font-medium text-ink hover:border-ink-faint border border-line"
        >
          <Plus className="h-3.5 w-3.5" />
          New scan
        </Link>
      </div>
    </header>
  );
}
