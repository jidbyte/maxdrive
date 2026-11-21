import { cn } from "@/shared/lib/utils";

export function ReportCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-border bg-card p-5 shadow-card sm:p-6", className)}>
      <header className="mb-4">
        <h2 className="text-base font-bold text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-xs text-neutral">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

export function StatRow({
  label,
  value,
  emphasis,
  tone,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  tone?: "success" | "danger" | "neutral";
}) {
  return (
    <div className={cn("flex items-center justify-between py-1.5 text-sm", emphasis && "mt-1 border-t border-border pt-2.5 text-base font-bold")}>
      <span className={emphasis ? "text-ink" : "text-neutral"}>{label}</span>
      <span
        className={cn(
          "tabular-nums text-ink",
          tone === "success" && "text-success",
          tone === "danger" && "text-danger",
        )}
      >
        {value}
      </span>
    </div>
  );
}
