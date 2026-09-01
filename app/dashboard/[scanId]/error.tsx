"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/States";
import { LinkButton } from "@/components/ui/Button";

export default function DashboardError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <ErrorState
        title="Couldn't load this scan"
        description="Something went wrong while loading this report. Try running a new scan."
      />
      <div className="mt-6">
        <LinkButton href="/scan">Run a new scan</LinkButton>
      </div>
    </div>
  );
}
