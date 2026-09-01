import clsx from "clsx";
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost";

const VARIANT_STYLES: Record<Variant, string> = {
  primary: "bg-brand text-bg hover:bg-brand-bright",
  secondary: "bg-bg-raised text-ink border border-line hover:border-ink-faint",
  ghost: "text-ink-muted hover:text-ink hover:bg-bg-raised"
};

const BASE =
  "focus-ring inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors px-4 py-2.5 disabled:opacity-50 disabled:pointer-events-none";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={clsx(BASE, VARIANT_STYLES[variant], className)} {...props} />;
}

export function LinkButton({
  href,
  variant = "primary",
  className,
  children
}: {
  href: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={clsx(BASE, VARIANT_STYLES[variant], className)}>
      {children}
    </Link>
  );
}
