import Link from "next/link";

import { Activity } from "lucide-react";

import { LinkButton } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <Activity
        className="mb-4 h-8 w-8 text-ink-faint"
        strokeWidth={1.5}
      />

      <h1 className="font-display text-xl font-semibold text-ink">
        Scan not found
      </h1>

      <p className="mt-2 max-w-sm text-sm text-ink-muted">
        This scan doesn&apos;t exist or may have been cleared from local storage.
      </p>

      <div className="mt-6 flex gap-3">
        <LinkButton href="/scan">Run a new scan</LinkButton>

        <Link
          href="/"
          className="focus-ring rounded-md border border-line px-4 py-2.5 text-sm text-ink-muted hover:text-ink"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}