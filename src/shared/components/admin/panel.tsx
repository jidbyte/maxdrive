import Link from "next/link";

import { cn } from "@/shared/lib/utils";

/** Standard admin card section. */
export function Panel({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-5 shadow-card sm:p-6", className)}>
      {(title || actions) && (
        <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-base font-bold text-ink">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-neutral">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function StatGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4", className)}>{children}</div>;
}

export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: "success" | "warning" | "danger";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card sm:p-5">
      <p className="text-xs text-neutral sm:text-sm">{label}</p>
      <p
        className={cn(
          "mt-1 truncate text-xl font-extrabold tracking-tight tabular-nums sm:text-2xl",
          tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : tone === "danger" ? "text-danger" : "text-ink",
        )}
      >
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-neutral">{hint}</p>}
    </div>
  );
}

/** Key/value rows for detail pages. */
export function DetailList({ items }: { items: Array<[React.ReactNode, React.ReactNode]> }) {
  return (
    <dl className="divide-y divide-border text-sm">
      {items.map(([k, v], i) => (
        <div key={i} className="flex justify-between gap-4 py-2.5">
          <dt className="text-neutral">{k}</dt>
          <dd className="text-right font-medium text-ink">{v ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-neutral hover:text-ink">
      <span aria-hidden>‹</span> {children}
    </Link>
  );
}
