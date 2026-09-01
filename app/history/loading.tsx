import { Skeleton } from "@/components/ui/States";

export default function HistoryLoading() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <Skeleton className="mb-8 h-8 w-40" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    </div>
  );
}
