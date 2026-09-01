"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
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
  FileOutput,
  Activity
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

export function Sidebar({ scanId }: { scanId: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-line bg-bg-surface lg:block print:hidden">
      <div className="flex h-14 items-center gap-2 border-b border-line px-5">
        <Activity className="h-4 w-4 text-brand" strokeWidth={2} />
        <Link href="/" className="font-display text-sm font-semibold tracking-tight text-ink">
          GitPulse
        </Link>
      </div>
      <nav className="space-y-0.5 px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const href = `/dashboard/${scanId}/${item.href}`;
          const active = pathname === href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={href}
              className={clsx(
                "focus-ring flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-bg-raised text-ink"
                  : "text-ink-muted hover:bg-bg-raised hover:text-ink"
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.75} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
