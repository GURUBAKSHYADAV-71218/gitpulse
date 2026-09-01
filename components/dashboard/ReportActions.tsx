"use client";

import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ReportActions({ scanId }: { scanId: string }) {
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      <a href={`/api/scans/${scanId}/report`} download>
        <Button variant="secondary">
          <Download className="h-4 w-4" />
          Download report (.md)
        </Button>
      </a>
      <Button variant="secondary" onClick={() => window.print()}>
        <Printer className="h-4 w-4" />
        Print
      </Button>
    </div>
  );
}
