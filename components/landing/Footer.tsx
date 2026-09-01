import Link from "next/link";
import { Activity } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-ink-faint sm:flex-row">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-brand" strokeWidth={2} />
          <span className="font-display text-ink">GitPulse</span>
        </div>
        <p>Engineering Health, At a Glance.</p>
        <div className="flex gap-4">
          <Link href="/scan" className="hover:text-ink">
            Scan
          </Link>
          <Link href="/history" className="hover:text-ink">
            History
          </Link>
        </div>
      </div>
    </footer>
  );
}
