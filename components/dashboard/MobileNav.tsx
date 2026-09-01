"use client";

import { useRouter, usePathname } from "next/navigation";
import {
  LayoutGrid,
  Package,
  ShieldCheck,
  Wrench,
  GitBranch,
  Users,
  FlaskConical,
  FileText,
  ListChecks,
  FileOutput
} from "lucide-react";

const NAV_ITEMS = [
  { href: "overview", label: "Overview", icon: LayoutGrid },
  { href: "dependencies", label: "Dependencies", icon: Package },
  { href: "security", label: "Security", icon: ShieldCheck },
  { href: "maintenance", label: "Maintenance", icon: Wrench },
  { href: "repository", label: "Repository", icon: GitBranch },
  { href: "contributors", label: "Contributors", icon: Users },
  { href: "testing", label: "Testing", icon: FlaskConical },
  { href: "documentation", label: "Documentation", icon: FileText },
  { href: "recommendations", label: "Recommendations", icon: ListChecks },
  { href: "reports", label: "Reports", icon: FileOutput }
];

export function MobileNav({ scanId }: { scanId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const current = NAV_ITEMS.find((item) => pathname.endsWith(`/${item.href}`))?.href ?? "overview";

  return (
    <div className="border-b border-line bg-bg-surface px-4 py-2.5 lg:hidden print:hidden">
      <select
        value={current}
        onChange={(e) => router.push(`/dashboard/${scanId}/${e.target.value}`)}
        className="focus-ring w-full rounded-md border border-line bg-bg-raised px-3 py-2 text-sm text-ink"
        aria-label="Dashboard section"
      >
        {NAV_ITEMS.map((item) => (
          <option key={item.href} value={item.href}>
            {item.label}
          </option>
        ))}
      </select>
    </div>
  );
}
