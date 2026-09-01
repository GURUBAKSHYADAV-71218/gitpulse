"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/ui/States";
import { LinkButton } from "@/components/ui/Button";

export default function GlobalError({ error }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
      <ErrorState title="Something went wrong" description="An unexpected error occurred. Please try again." />
      <div className="mt-6">
        <LinkButton href="/">Back home</LinkButton>
      </div>
    </div>
  );
}
