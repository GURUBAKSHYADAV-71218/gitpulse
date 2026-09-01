import { notFound } from "next/navigation";
import { getScan } from "@/lib/store/scanStore";
import { RecommendationCard } from "@/components/dashboard/InfoCards";
import { EmptyState } from "@/components/ui/States";

export default async function RecommendationsPage({ params }: { params: { scanId: string } }) {
  const scan = await getScan(params.scanId);
  if (!scan) notFound();

  const { recommendations } = scan;

  if (recommendations.length === 0) {
    return (
      <div className="mx-auto max-w-4xl">
        <EmptyState
          title="No outstanding recommendations"
          description="GitPulse didn't find issues that warrant a prioritized action from this scan."
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-3">
      {recommendations.map((rec, i) => (
        <RecommendationCard key={rec.id} recommendation={rec} index={i} />
      ))}
    </div>
  );
}
