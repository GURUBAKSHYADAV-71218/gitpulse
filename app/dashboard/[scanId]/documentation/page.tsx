import { notFound } from "next/navigation";
import { getScan } from "@/lib/store/scanStore";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { UnavailableNote } from "@/components/ui/States";
import { CheckCircle2, XCircle } from "lucide-react";

function Check({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {ok ? (
        <CheckCircle2 className="h-4 w-4 text-status-low" strokeWidth={1.75} />
      ) : (
        <XCircle className="h-4 w-4 text-ink-faint" strokeWidth={1.75} />
      )}
      <span className={ok ? "text-ink" : "text-ink-faint"}>{label}</span>
    </div>
  );
}

export default async function DocumentationPage({ params }: { params: { scanId: string } }) {
  const scan = await getScan(params.scanId);
  if (!scan) notFound();

  const docs = scan.documentationAnalysis;
  const docsScore = scan.health.categories.find((c) => c.category === "documentation");

  if (!docs || !docs.dataAvailable) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <UnavailableNote reason={docs?.unavailableReason ?? "Documentation data unavailable. This scan may not have used a GitHub repository as its source."} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr]">
        <Card>
          <CardBody className="flex flex-col items-center justify-center gap-2 py-8">
            <ScoreRing score={docsScore?.score ?? null} size={140} label="Documentation Health" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <p className="font-display text-sm font-medium text-ink">Documentation checklist</p>
          </CardHeader>
          <CardBody className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <Check ok={docs.hasReadme} label="README present" />
            <Check ok={docs.hasLicense} label="LICENSE present" />
            <Check ok={docs.hasContributing} label="CONTRIBUTING guide present" />
            <Check ok={docs.hasDocsDirectory} label="docs/ directory present" />
            <Check ok={docs.readmeHasInstallSection} label="README includes installation guidance" />
            <Check ok={docs.readmeHasUsageSection} label="README includes usage guidance" />
          </CardBody>
        </Card>
      </div>

      {docs.hasReadme && docs.readmeLength !== null && (
        <Card>
          <CardHeader>
            <p className="font-display text-sm font-medium text-ink">README overview</p>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-ink-muted">
              README is approximately <span className="font-mono text-ink">{docs.readmeLength.toLocaleString()}</span>{" "}
              characters long. GitPulse checks for structural signals like installation and usage sections; it does
              not evaluate writing quality.
            </p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
