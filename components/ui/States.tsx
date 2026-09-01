import { AlertTriangle, Inbox } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-line px-6 py-14 text-center">
      <Inbox className="mb-3 h-8 w-8 text-ink-faint" strokeWidth={1.5} />
      <p className="font-display text-base font-medium text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description }: { title?: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-status-critical/25 bg-status-critical/5 px-6 py-14 text-center">
      <AlertTriangle className="mb-3 h-8 w-8 text-status-critical" strokeWidth={1.5} />
      <p className="font-display text-base font-medium text-ink">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>
    </div>
  );
}

export function UnavailableNote({ reason }: { reason: string }) {
  return (
    <div className="rounded-md border border-line-subtle bg-bg-raised px-3 py-2 text-xs text-ink-muted">
      {reason}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-bg-raised ${className}`} />;
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-64" />
      <Skeleton className="h-48" />
    </div>
  );
}
